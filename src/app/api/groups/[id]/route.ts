import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateGroupSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  isPrivate: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
                institution: true,
                verificationStatus: true,
              },
            },
          },
        },
        posts: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
              },
            },
            _count: {
              select: {
                comments: true,
                reactions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if user is a member
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    let isMember = false
    let memberRole = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyToken(token)

      if (decoded) {
        const membership = group.members.find(m => m.userId === decoded.userId)
        if (membership) {
          isMember = true
          memberRole = membership.role
        }
      }
    }

    // If group is private and user is not a member, return limited info
    if (group.isPrivate && !isMember) {
      return NextResponse.json(
        {
          group: {
            id: group.id,
            name: group.name,
            description: group.description,
            isPrivate: true,
            _count: group._count,
          },
          isMember: false,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        group,
        isMember,
        memberRole,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch group:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching the group' },
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

    // Check if user is an admin of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: params.id,
          userId: decoded.userId,
        },
      },
    })

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only group admins can update group settings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = updateGroupSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updatedGroup = await prisma.group.update({
      where: { id: params.id },
      data: validationResult.data,
    })

    return NextResponse.json(
      {
        message: 'Group updated successfully',
        group: updatedGroup,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to update group:', error)
    return NextResponse.json(
      { message: 'An error occurred while updating the group' },
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

    // Check if user is an admin of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: params.id,
          userId: decoded.userId,
        },
      },
    })

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only group admins can delete the group' },
        { status: 403 }
      )
    }

    await prisma.group.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: 'Group deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete group:', error)
    return NextResponse.json(
      { message: 'An error occurred while deleting the group' },
      { status: 500 }
    )
  }
}