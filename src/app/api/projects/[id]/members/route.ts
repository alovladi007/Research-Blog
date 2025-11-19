import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, extractToken } from '@/lib/auth'
import { z } from 'zod'

const addMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['LEAD', 'MEMBER', 'ADVISOR']).default('MEMBER'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const members = await prisma.projectMember.findMany({
      where: {
        projectId: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            institution: true,
            department: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching project members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project members' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractToken(request)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        members: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user is a project lead
    const userMembership = project.members.find(
      m => m.userId === payload.userId
    )

    if (!userMembership || userMembership.role !== 'LEAD') {
      return NextResponse.json(
        { error: 'Only project leads can add members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = addMemberSchema.parse(body)

    // Check if user is already a member
    const existingMember = project.members.find(
      m => m.userId === validatedData.userId
    )

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this project' },
        { status: 400 }
      )
    }

    // Add member to project
    const member = await prisma.projectMember.create({
      data: {
        projectId: params.id,
        userId: validatedData.userId,
        role: validatedData.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            institution: true,
          },
        },
      },
    })

    // Create notification for added user
    await prisma.notification.create({
      data: {
        type: 'PROJECT_INVITE',
        content: `You have been added to project "${project.title}" as ${validatedData.role}`,
        userId: validatedData.userId,
        relatedId: project.id,
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error adding project member:', error)
    return NextResponse.json(
      { error: 'Failed to add project member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractToken(request)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userIdToRemove = searchParams.get('userId')

    if (!userIdToRemove) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        members: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if requesting user is a project lead or removing themselves
    const userMembership = project.members.find(
      m => m.userId === payload.userId
    )

    const canRemove =
      userIdToRemove === payload.userId || // Removing self
      (userMembership && userMembership.role === 'LEAD') // Is project lead

    if (!canRemove) {
      return NextResponse.json(
        { error: 'You do not have permission to remove this member' },
        { status: 403 }
      )
    }

    // Don't allow removing the last lead
    const leads = project.members.filter(m => m.role === 'LEAD')
    const memberToRemove = project.members.find(m => m.userId === userIdToRemove)

    if (leads.length === 1 && memberToRemove?.role === 'LEAD') {
      return NextResponse.json(
        { error: 'Cannot remove the last project lead' },
        { status: 400 }
      )
    }

    // Remove member
    await prisma.projectMember.deleteMany({
      where: {
        projectId: params.id,
        userId: userIdToRemove,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing project member:', error)
    return NextResponse.json(
      { error: 'Failed to remove project member' },
      { status: 500 }
    )
  }
}
