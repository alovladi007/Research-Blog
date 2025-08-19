import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createComment } from '@/lib/db-helpers'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  parentId: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        postId: params.id,
        parentId: null, // Only get top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            verificationStatus: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
                verificationStatus: true,
              },
            },
            _count: {
              select: {
                reactions: true,
              },
            },
          },
        },
        _count: {
          select: {
            reactions: true,
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ comments }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch comments:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching comments' },
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
    const validationResult = createCommentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { content, parentId } = validationResult.data

    // If parentId is provided, verify it exists and belongs to this post
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { postId: true },
      })

      if (!parentComment || parentComment.postId !== params.id) {
        return NextResponse.json(
          { message: 'Invalid parent comment' },
          { status: 400 }
        )
      }
    }

    const comment = await createComment({
      content,
      postId: params.id,
      authorId: decoded.userId,
      parentId,
    })

    // Create notification for post author (if not commenting on own post)
    if (post.authorId !== decoded.userId) {
      await prisma.notification.create({
        data: {
          type: 'COMMENT',
          content: parentId ? 'replied to a comment on your post' : 'commented on your post',
          userId: post.authorId,
          relatedId: params.id,
        },
      })
    }

    return NextResponse.json(
      {
        message: 'Comment created successfully',
        comment,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create comment:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the comment' },
      { status: 500 }
    )
  }
}