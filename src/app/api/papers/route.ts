import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const createPaperSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  abstract: z.string().min(1, 'Abstract is required'),
  doi: z.string().optional(),
  arxivId: z.string().optional(),
  publishedDate: z.string().optional(),
  journal: z.string().optional(),
  conference: z.string().optional(),
  pdfUrl: z.string().url().optional(),
  projectId: z.string().optional(),
  authorIds: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const projectId = searchParams.get('projectId')
    const authorId = searchParams.get('authorId')

    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { abstract: { contains: search, mode: 'insensitive' } },
        { journal: { contains: search, mode: 'insensitive' } },
        { conference: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (authorId) {
      where.authors = {
        some: {
          id: authorId,
        },
      }
    }

    const papers = await prisma.paper.findMany({
      where,
      include: {
        authors: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            institution: true,
            orcid: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(papers)
  } catch (error) {
    console.error('Error fetching papers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch papers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

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

    const body = await request.json()
    const validatedData = createPaperSchema.parse(body)

    // Create the paper with author connections
    const authorIds = validatedData.authorIds || [payload.userId]

    const paper = await prisma.paper.create({
      data: {
        title: validatedData.title,
        abstract: validatedData.abstract,
        doi: validatedData.doi,
        arxivId: validatedData.arxivId,
        publishedDate: validatedData.publishedDate ? new Date(validatedData.publishedDate) : null,
        journal: validatedData.journal,
        conference: validatedData.conference,
        pdfUrl: validatedData.pdfUrl,
        projectId: validatedData.projectId,
        authors: {
          connect: authorIds.map(id => ({ id })),
        },
      },
      include: {
        authors: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            institution: true,
            orcid: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return NextResponse.json(paper, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating paper:', error)
    return NextResponse.json(
      { error: 'Failed to create paper' },
      { status: 500 }
    )
  }
}
