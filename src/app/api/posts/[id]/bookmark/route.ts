import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
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

    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: decoded.userId,
          postId: params.id,
        },
      },
    })

    return NextResponse.json(
      { bookmarked: !!bookmark },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to check bookmark status:', error)
    return NextResponse.json(
      { message: 'An error occurred while checking bookmark status' },
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
      select: { id: true },
    })

    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      )
    }

    // Check if already bookmarked
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: decoded.userId,
          postId: params.id,
        },
      },
    })

    if (existingBookmark) {
      // Remove bookmark
      await prisma.bookmark.delete({
        where: { id: existingBookmark.id },
      })

      return NextResponse.json(
        {
          message: 'Bookmark removed',
          bookmarked: false,
        },
        { status: 200 }
      )
    } else {
      // Add bookmark
      await prisma.bookmark.create({
        data: {
          userId: decoded.userId,
          postId: params.id,
        },
      })

      return NextResponse.json(
        {
          message: 'Bookmark added',
          bookmarked: true,
        },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Failed to toggle bookmark:', error)
    return NextResponse.json(
      { message: 'An error occurred while toggling bookmark' },
      { status: 500 }
    )
  }
}