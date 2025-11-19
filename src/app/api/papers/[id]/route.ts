import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const updatePaperSchema = z.object({
  title: z.string().min(1).optional(),
  abstract: z.string().min(1).optional(),
  doi: z.string().optional(),
  arxivId: z.string().optional(),
  publishedDate: z.string().optional(),
  journal: z.string().optional(),
  conference: z.string().optional(),
  pdfUrl: z.string().url().optional(),
  citations: z.number().optional(),
  authorIds: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paper = await prisma.paper.findUnique({
      where: { id: params.id },
      include: {
        authors: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            institution: true,
            department: true,
            orcid: true,
            googleScholarId: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatar: true,
                institution: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    })

    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(paper)
  } catch (error) {
    console.error('Error fetching paper:', error)
    return NextResponse.json(
      { error: 'Failed to fetch paper' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if paper exists and user is an author
    const existingPaper = await prisma.paper.findUnique({
      where: { id: params.id },
      include: {
        authors: true,
      },
    })

    if (!existingPaper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      )
    }

    const isAuthor = existingPaper.authors.some(
      author => author.id === payload.userId
    )

    if (!isAuthor) {
      return NextResponse.json(
        { error: 'Forbidden: You are not an author of this paper' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updatePaperSchema.parse(body)

    const updateData: any = {
      title: validatedData.title,
      abstract: validatedData.abstract,
      doi: validatedData.doi,
      arxivId: validatedData.arxivId,
      publishedDate: validatedData.publishedDate
        ? new Date(validatedData.publishedDate)
        : undefined,
      journal: validatedData.journal,
      conference: validatedData.conference,
      pdfUrl: validatedData.pdfUrl,
      citations: validatedData.citations,
    }

    // Handle author updates if provided
    if (validatedData.authorIds) {
      updateData.authors = {
        set: validatedData.authorIds.map(id => ({ id })),
      }
    }

    const paper = await prisma.paper.update({
      where: { id: params.id },
      data: updateData,
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
        project: true,
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
      },
    })

    return NextResponse.json(paper)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating paper:', error)
    return NextResponse.json(
      { error: 'Failed to update paper' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if paper exists and user is an author
    const existingPaper = await prisma.paper.findUnique({
      where: { id: params.id },
      include: {
        authors: true,
      },
    })

    if (!existingPaper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      )
    }

    const isAuthor = existingPaper.authors.some(
      author => author.id === payload.userId
    )

    if (!isAuthor) {
      return NextResponse.json(
        { error: 'Forbidden: You are not an author of this paper' },
        { status: 403 }
      )
    }

    await prisma.paper.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting paper:', error)
    return NextResponse.json(
      { error: 'Failed to delete paper' },
      { status: 500 }
    )
  }
}
