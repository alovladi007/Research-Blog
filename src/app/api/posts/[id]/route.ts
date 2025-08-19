import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getPostById } from '@/lib/db-helpers'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updatePostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    let userId: string | undefined

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyToken(token)
      userId = decoded?.userId
    }

    const post = await getPostById(params.id, userId)

    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ post }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch post:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching the post' },
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

    // Check if post exists and user is the author
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    })

    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.authorId !== decoded.userId) {
      return NextResponse.json(
        { message: 'You can only edit your own posts' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = updatePostSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: validationResult.data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            institution: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            bookmarks: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Post updated successfully',
        post: updatedPost,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to update post:', error)
    return NextResponse.json(
      { message: 'An error occurred while updating the post' },
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

    // Check if post exists and user is the author
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    })

    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.authorId !== decoded.userId) {
      return NextResponse.json(
        { message: 'You can only delete your own posts' },
        { status: 403 }
      )
    }

    await prisma.post.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: 'Post deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete post:', error)
    return NextResponse.json(
      { message: 'An error occurred while deleting the post' },
      { status: 500 }
    )
  }
}