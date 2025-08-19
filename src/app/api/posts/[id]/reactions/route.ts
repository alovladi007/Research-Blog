import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { toggleReaction } from '@/lib/db-helpers'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const reactionSchema = z.object({
  type: z.enum(['LIKE', 'INSIGHTFUL', 'HELPFUL', 'CELEBRATE']),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reactions = await prisma.reaction.groupBy({
      by: ['type'],
      where: {
        postId: params.id,
      },
      _count: {
        type: true,
      },
    })

    const reactionCounts = reactions.reduce((acc, reaction) => {
      acc[reaction.type] = reaction._count.type
      return acc
    }, {} as Record<string, number>)

    // Get recent users who reacted
    const recentReactions = await prisma.reaction.findMany({
      where: {
        postId: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json(
      {
        counts: reactionCounts,
        recent: recentReactions,
        total: Object.values(reactionCounts).reduce((a, b) => a + b, 0),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch reactions:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching reactions' },
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

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    })

    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = reactionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { type } = validationResult.data

    const result = await toggleReaction({
      userId: decoded.userId,
      postId: params.id,
      type,
    })

    // Create notification for post author (if liking someone else's post)
    if (result.action === 'added' && post.authorId !== decoded.userId) {
      await prisma.notification.create({
        data: {
          type: 'REACTION',
          content: `reacted ${type.toLowerCase()} to your post`,
          userId: post.authorId,
          relatedId: params.id,
        },
      })
    }

    return NextResponse.json(
      {
        message: `Reaction ${result.action} successfully`,
        ...result,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to toggle reaction:', error)
    return NextResponse.json(
      { message: 'An error occurred while toggling reaction' },
      { status: 500 }
    )
  }
}