import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateVerificationToken } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import { z } from 'zod'

const resendSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resendSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json(
        { message: 'If an account exists with this email, a verification email has been sent' },
        { status: 200 }
      )
    }

    // Check if already verified
    if (user.verificationStatus === 'VERIFIED') {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken()

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationDoc: verificationToken,
      },
    })

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Verification email sent successfully' },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred while resending verification email' },
      { status: 500 }
    )
  }
}
