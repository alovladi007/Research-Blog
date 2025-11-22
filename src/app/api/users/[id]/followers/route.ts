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

    const followers = await prisma.follow.findMany({
      where: {
        followingId: params.id,
      },
      include: {
        follower: {
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
      where: { followingId: params.id },
    })

    return NextResponse.json(
      {
        followers: followers.map(f => f.follower),
        page,
        limit,
        total,
        hasMore: skip + followers.length < total,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Failed to fetch followers:', error)

    // If database connection error, return empty data instead of error
    if (error?.name === 'PrismaClientInitializationError' || error?.message?.includes("Can't reach database")) {
      return NextResponse.json(
        {
          followers: [],
          page: 1,
          limit: 20,
          total: 0,
          hasMore: false,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { message: 'An error occurred while fetching followers' },
      { status: 500 }
    )
  }
}