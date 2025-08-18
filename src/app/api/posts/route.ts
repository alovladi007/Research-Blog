import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// In‑memory store for posts.  In a production system this would be backed
// by a database table.  Using a top‑level array means the data will be
// shared across requests while the server process is running, but will
// reset when the server reloads.
interface Post {
  id: string
  title: string
  content: string
  authorId?: string | null
  createdAt: Date
}

const posts: Post[] = []

/**
 * Fetch all posts.  Returns an array of posts sorted with the most
 * recently created post first.
 */
export async function GET() {
  // Return posts in descending order of creation time
  const ordered = [...posts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return NextResponse.json({ posts: ordered }, { status: 200 })
}

/**
 * Create a new post.  Requires a JSON body with `title` and
 * `content`.  If a bearer token is provided in the Authorization header,
 * the userId will be extracted and attached to the post.  Users with
 * limited access are still allowed to create posts in this simple demo,
 * but in a real implementation you would enforce role or access checks
 * here.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    let authorId: string | null = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyToken(token)
      authorId = decoded?.userId ?? null
    }

    const body = await request.json()
    const { title, content } = body
    if (!title || !content) {
      return NextResponse.json({ message: 'Title and content are required' }, { status: 400 })
    }

    const post: Post = {
      id: Date.now().toString(),
      title: String(title),
      content: String(content),
      authorId,
      createdAt: new Date(),
    }
    posts.unshift(post)

    return NextResponse.json({ post }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create post:', error)
    return NextResponse.json({ message: 'An error occurred while creating the post.' }, { status: 500 })
  }
}