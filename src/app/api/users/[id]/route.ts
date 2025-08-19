import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, sanitizeUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  institution: z.string().optional(),
  department: z.string().optional(),
  researchInterests: z.array(z.string()).optional(),
  orcid: z.string().optional(),
  googleScholarId: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        institution: true,
        department: true,
        bio: true,
        researchInterests: true,
        orcid: true,
        googleScholarId: true,
        linkedinUrl: true,
        websiteUrl: true,
        verificationStatus: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            papers: true,
            projects: true,
            groups: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if authenticated user is following this user
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    let isFollowing = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyToken(token)

      if (decoded && decoded.userId !== params.id) {
        const follow = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: decoded.userId,
              followingId: params.id,
            },
          },
        })
        isFollowing = !!follow
      }
    }

    return NextResponse.json(
      {
        user,
        isFollowing,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching user' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Users can only update their own profile
    if (decoded.userId !== params.id) {
      return NextResponse.json(
        { message: 'You can only update your own profile' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = updateUserSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: validationResult.data,
    })

    const sanitizedUser = sanitizeUser(updatedUser)

    return NextResponse.json(
      {
        message: 'Profile updated successfully',
        user: sanitizedUser,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { message: 'An error occurred while updating profile' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Users can only delete their own account
    if (decoded.userId !== params.id) {
      // Check if user is admin
      const requestingUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { role: true },
      })

      if (requestingUser?.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'You can only delete your own account' },
          { status: 403 }
        )
      }
    }

    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { message: 'An error occurred while deleting account' },
      { status: 500 }
    )
  }
}