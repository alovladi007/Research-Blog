import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationDoc: token,
        verificationStatus: 'PENDING',
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Update user verification status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        emailVerified: new Date(),
        verificationDoc: null, // Clear the token
      },
    })

    // Send welcome email
    try {
      await sendWelcomeEmail(updatedUser.email, updatedUser.name)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail verification if welcome email fails
    }

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        verified: true,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationDoc: token,
        verificationStatus: 'PENDING',
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Update user verification status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        emailVerified: new Date(),
        verificationDoc: null, // Clear the token
      },
    })

    // Send welcome email
    try {
      await sendWelcomeEmail(updatedUser.email, updatedUser.name)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
    }

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        verified: true,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}
