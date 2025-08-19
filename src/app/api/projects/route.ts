import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createProject } from '@/lib/db-helpers'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const createProjectSchema = z.object({
  title: z.string().min(3, 'Project title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const myProjects = searchParams.get('myProjects') === 'true'

    const skip = (page - 1) * limit

    let where: any = {}

    // Get user's projects if authenticated and requested
    if (myProjects) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (decoded) {
          const userProjects = await prisma.projectMember.findMany({
            where: { userId: decoded.userId },
            select: { projectId: true },
          })
          where.id = { in: userProjects.map(p => p.projectId) }
        }
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    // Only show public projects unless filtering by user's projects
    if (!myProjects) {
      where.visibility = 'PUBLIC'
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        members: {
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
          where: { role: 'LEAD' },
          take: 1,
        },
        _count: {
          select: {
            members: true,
            posts: true,
            papers: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.project.count({ where })

    return NextResponse.json(
      {
        projects,
        page,
        limit,
        total,
        hasMore: skip + projects.length < total,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching projects' },
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
    const validationResult = createProjectSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const projectData = {
      ...validationResult.data,
      leaderId: decoded.userId,
      startDate: validationResult.data.startDate ? new Date(validationResult.data.startDate) : undefined,
      endDate: validationResult.data.endDate ? new Date(validationResult.data.endDate) : undefined,
    }

    const project = await createProject(projectData)

    return NextResponse.json(
      {
        message: 'Project created successfully',
        project,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the project' },
      { status: 500 }
    )
  }
}