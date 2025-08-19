import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createPost, getPosts } from '@/lib/db-helpers'
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['ARTICLE', 'QUESTION', 'DISCUSSION', 'PAPER', 'ANNOUNCEMENT']).optional(),
  tags: z.array(z.string()).optional(),
  groupId: z.string().optional(),
  projectId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const authorId = searchParams.get('authorId')
    const groupId = searchParams.get('groupId')
    const projectId = searchParams.get('projectId')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)

    const skip = (page - 1) * limit

    const where: any = {
      published: true,
    }

    if (type) where.type = type
    if (authorId) where.authorId = authorId
    if (groupId) where.groupId = groupId
    if (projectId) where.projectId = projectId
    if (tags && tags.length > 0) where.tags = { hasSome: tags }

    const posts = await getPosts({
      skip,
      take: limit,
      where,
    })

    return NextResponse.json(
      {
        posts,
        page,
        limit,
        hasMore: posts.length === limit,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch posts:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching posts' },
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
    const validationResult = createPostSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const postData = {
      ...validationResult.data,
      authorId: decoded.userId,
    }

    const post = await createPost(postData)

    return NextResponse.json(
      {
        message: 'Post created successfully',
        post,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create post:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the post' },
      { status: 500 }
    )
  }
}