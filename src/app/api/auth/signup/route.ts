import { NextRequest, NextResponse } from 'next/server'
import {
  hashPassword,
  generateToken,
  generateVerificationToken,
  isAcademicEmail,
  isCorporateEmail,
  sanitizeUser,
  serializeCookie,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['STUDENT', 'RESEARCHER', 'PROFESSOR']).optional(),
  institution: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().optional(),
  researchInterests: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = signupSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { email, password, name, role, institution, department, bio, researchInterests } = validationResult.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Determine verification status based on email
    const isAcademic = isAcademicEmail(email)
    const isCorporate = isCorporateEmail(email)
    const verificationStatus = isAcademic || isCorporate ? 'VERIFIED' : 'PENDING'

    // Generate verification token for non-academic/corporate emails
    const verificationToken = verificationStatus === 'PENDING' ? generateVerificationToken() : null

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'STUDENT',
        institution,
        department,
        bio,
        researchInterests: researchInterests || [],
        verificationStatus,
        verifiedAt: verificationStatus === 'VERIFIED' ? new Date() : null,
        verificationDoc: verificationToken, // Store verification token temporarily
      },
    })

    // Send verification email for non-verified users
    if (verificationStatus === 'PENDING' && verificationToken) {
      try {
        await sendVerificationEmail(email, name, verificationToken)
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError)
        // Don't fail signup if email fails, user can request resend
      }
    }

    // Generate JWT token
    const token = generateToken(user.id)

    // Return sanitized user data
    const sanitizedUser = sanitizeUser(user)

    // Create response with httpOnly cookie
    const response = NextResponse.json(
      {
        message: 'User created successfully',
        user: sanitizedUser,
        token, // Keep for backward compatibility
        verified: verificationStatus === 'VERIFIED',
      },
      { status: 201 }
    )

    // Set httpOnly cookie for secure token storage
    response.headers.set(
      'Set-Cookie',
      serializeCookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS)
    )

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { message: 'An error occurred during signup' },
      { status: 500 }
    )
  }
}