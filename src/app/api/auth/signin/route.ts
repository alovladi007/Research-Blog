import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, generateToken, sanitizeUser } from '@/lib/auth'
import { z } from 'zod'

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = signinSchema.parse(body)
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        institution: true,
        department: true,
        avatar: true,
        verificationStatus: true,
        emailVerified: true,
      },
    })
    
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(validatedData.password, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { message: 'Please verify your email address before signing in' },
        { status: 403 }
      )
    }
    
    // Check verification status
    if (user.verificationStatus === 'REJECTED') {
      return NextResponse.json(
        { message: 'Your academic credentials could not be verified. Please contact support.' },
        { status: 403 }
      )
    }
    
    if (user.verificationStatus === 'PENDING') {
      return NextResponse.json(
        { 
          message: 'Your academic credentials are still being verified. You will receive an email once approved.',
          verificationPending: true 
        },
        { status: 403 }
      )
    }
    
    // Generate JWT token
    const token = generateToken(user.id)
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    })
    
    // Return user data without password
    const sanitizedUser = sanitizeUser(user)
    
    return NextResponse.json(
      {
        message: 'Sign in successful',
        token,
        user: sanitizedUser,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Signin error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'An error occurred during sign in. Please try again.' },
      { status: 500 }
    )
  }
}