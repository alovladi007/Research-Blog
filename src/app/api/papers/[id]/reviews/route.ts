import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const createReviewSchema = z.object({
  content: z.string().min(10, 'Review must be at least 10 characters'),
  rating: z.number().min(1).max(5, 'Rating must be between 1 and 5'),
  isPublic: z.boolean().default(true),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const publicOnly = searchParams.get('publicOnly') !== 'false'

    const where: any = {
      paperId: params.id,
    }

    if (publicOnly) {
      where.isPublic = true
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatar: true,
            institution: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0

    return NextResponse.json({
      reviews,
      stats: {
        total: reviews.length,
        averageRating: Math.round(avgRating * 10) / 10,
      },
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    // Check if paper exists
    const paper = await prisma.paper.findUnique({
      where: { id: params.id },
      include: {
        authors: true,
      },
    })

    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      )
    }

    // Check if user already reviewed this paper
    const existingReview = await prisma.review.findUnique({
      where: {
        paperId_reviewerId: {
          paperId: params.id,
          reviewerId: payload.userId,
        },
      },
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this paper' },
        { status: 400 }
      )
    }

    // Prevent authors from reviewing their own paper
    const isAuthor = paper.authors.some(author => author.id === payload.userId)
    if (isAuthor) {
      return NextResponse.json(
        { error: 'You cannot review your own paper' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = createReviewSchema.parse(body)

    const review = await prisma.review.create({
      data: {
        content: validatedData.content,
        rating: validatedData.rating,
        isPublic: validatedData.isPublic,
        paperId: params.id,
        reviewerId: payload.userId,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatar: true,
            institution: true,
            role: true,
          },
        },
        paper: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    // Create notification for paper authors
    const notificationPromises = paper.authors.map(author =>
      prisma.notification.create({
        data: {
          type: 'REVIEW',
          content: `${review.reviewer.name} reviewed your paper "${paper.title}"`,
          userId: author.id,
          relatedId: review.id,
        },
      })
    )

    await Promise.all(notificationPromises)

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
