import { NextRequest, NextResponse } from 'next/server'
import {
  verifyPassword,
  generateToken,
  sanitizeUser,
  serializeCookie,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = signinSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = generateToken(user.id)

    // Return sanitized user data
    const sanitizedUser = sanitizeUser(user)

    // Create response with httpOnly cookie
    const response = NextResponse.json(
      {
        message: 'Signin successful',
        user: sanitizedUser,
        token, // Keep for backward compatibility with existing frontend
      },
      { status: 200 }
    )

    // Set httpOnly cookie for secure token storage
    response.headers.set(
      'Set-Cookie',
      serializeCookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS)
    )

    return response
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { message: 'An error occurred during signin' },
      { status: 500 }
    )
  }
}