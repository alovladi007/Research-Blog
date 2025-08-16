import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, isAcademicEmail, generateVerificationToken } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import { z } from 'zod'

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['STUDENT', 'RESEARCHER', 'PROFESSOR']),
  institution: z.string().min(2),
  department: z.string().min(2),
  orcid: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = signupSchema.parse(body)
    
    // Check if email is academic
    if (!isAcademicEmail(validatedData.email)) {
      return NextResponse.json(
        { message: 'Please use a valid institutional email address' },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    })
    
    if (existingUser) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)
    
    // Create user with pending verification
    const user = await prisma.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        password: hashedPassword,
        name: validatedData.name,
        role: validatedData.role,
        institution: validatedData.institution,
        department: validatedData.department,
        orcid: validatedData.orcid,
        verificationStatus: 'PENDING',
        researchInterests: [],
      },
    })
    
    // Generate verification token
    const verificationToken = generateVerificationToken()
    
    // Store verification token (in production, use Redis or a separate table)
    // For now, we'll use a simple approach
    await prisma.$executeRaw`
      UPDATE "User" 
      SET "verificationDoc" = ${verificationToken} 
      WHERE id = ${user.id}
    `
    
    // Send verification email (implement this based on your email service)
    try {
      await sendVerificationEmail(user.email, verificationToken, user.name)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Continue anyway - admin can manually verify
    }
    
    return NextResponse.json(
      {
        message: 'Account created successfully. Please check your email for verification.',
        userId: user.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'An error occurred during signup. Please try again.' },
      { status: 500 }
    )
  }
}