import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    const following = await prisma.follow.findMany({
      where: {
        followerId: params.id,
      },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            institution: true,
            bio: true,
            verificationStatus: true,
            _count: {
              select: {
                posts: true,
                followers: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.follow.count({
      where: { followerId: params.id },
    })

    return NextResponse.json(
      {
        following: following.map(f => f.following),
        page,
        limit,
        total,
        hasMore: skip + following.length < total,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch following:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching following' },
      { status: 500 }
    )
  }
}