import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createGroup } from '@/lib/db-helpers'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const createGroupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  isPrivate: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const myGroups = searchParams.get('myGroups') === 'true'

    const skip = (page - 1) * limit

    let where: any = {}

    // Get user's groups if authenticated and requested
    if (myGroups) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (decoded) {
          const userGroups = await prisma.groupMember.findMany({
            where: { userId: decoded.userId },
            select: { groupId: true },
          })
          where.id = { in: userGroups.map(g => g.groupId) }
        }
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Only show public groups unless filtering by user's groups
    if (!myGroups) {
      where.isPrivate = false
    }

    const groups = await prisma.group.findMany({
      where,
      include: {
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.group.count({ where })

    return NextResponse.json(
      {
        groups,
        page,
        limit,
        total,
        hasMore: skip + groups.length < total,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch groups:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching groups' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    
    // Validate input
    const validationResult = createGroupSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const group = await createGroup({
      ...validationResult.data,
      creatorId: decoded.userId,
    })

    return NextResponse.json(
      {
        message: 'Group created successfully',
        group,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create group:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the group' },
      { status: 500 }
    )
  }
}