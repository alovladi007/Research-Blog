import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const addMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['MEMBER', 'MODERATOR', 'ADMIN']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const members = await prisma.groupMember.findMany({
      where: { groupId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            institution: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    return NextResponse.json({ members }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch group members:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching group members' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const body = await request.json()
    
    // If no userId provided, user is joining themselves
    const userId = body.userId || decoded.userId

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: params.id },
    })

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: params.id,
          userId,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { message: 'User is already a member of this group' },
        { status: 400 }
      )
    }

    // If adding someone else, check if requester is admin
    if (userId !== decoded.userId) {
      const requesterMembership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: params.id,
            userId: decoded.userId,
          },
        },
      })

      if (!requesterMembership || requesterMembership.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'Only group admins can add other members' },
          { status: 403 }
        )
      }
    }

    // If group is private and user is joining themselves, check permissions
    if (group.isPrivate && userId === decoded.userId) {
      return NextResponse.json(
        { message: 'This is a private group. You need an invitation to join.' },
        { status: 403 }
      )
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId: params.id,
        userId,
        role: body.role || 'MEMBER',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Member added successfully',
        member,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to add member:', error)
    return NextResponse.json(
      { message: 'An error occurred while adding member' },
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || decoded.userId

    // Check if member exists
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: params.id,
          userId,
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { message: 'Member not found in this group' },
        { status: 404 }
      )
    }

    // Users can leave themselves, or admins can remove others
    if (userId !== decoded.userId) {
      const requesterMembership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: params.id,
            userId: decoded.userId,
          },
        },
      })

      if (!requesterMembership || (requesterMembership.role !== 'ADMIN' && requesterMembership.role !== 'MODERATOR')) {
        return NextResponse.json(
          { message: 'Only group admins and moderators can remove other members' },
          { status: 403 }
        )
      }

      // Moderators can't remove admins
      if (requesterMembership.role === 'MODERATOR' && member.role === 'ADMIN') {
        return NextResponse.json(
          { message: 'Moderators cannot remove admins' },
          { status: 403 }
        )
      }
    }

    await prisma.groupMember.delete({
      where: {
        id: member.id,
      },
    })

    return NextResponse.json(
      { message: 'Member removed successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to remove member:', error)
    return NextResponse.json(
      { message: 'An error occurred while removing member' },
      { status: 500 }
    )
  }
}