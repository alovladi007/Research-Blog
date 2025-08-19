import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { toggleFollow } from '@/lib/db-helpers'

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

    if (decoded.userId === params.id) {
      return NextResponse.json(
        { message: 'You cannot follow yourself' },
        { status: 400 }
      )
    }

    const result = await toggleFollow(decoded.userId, params.id)

    return NextResponse.json(
      {
        message: `User ${result.action} successfully`,
        ...result,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to toggle follow:', error)
    return NextResponse.json(
      { message: 'An error occurred while toggling follow' },
      { status: 500 }
    )
  }
}