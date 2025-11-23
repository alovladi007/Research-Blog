import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from header (set by middleware)
    const userId = request.headers.get('X-User-Id') || 'dev-user-bypass'

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread') === 'true'

    const skip = (page - 1) * limit

    const where: any = {
      userId,
    }

    if (unreadOnly) {
      where.read = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    const total = await prisma.notification.count({ where })
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    })

    return NextResponse.json(
      {
        notifications,
        page,
        limit,
        total,
        unreadCount,
        hasMore: skip + notifications.length < total,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error)

    // If database connection error, return empty data instead of error
    if (error?.name === 'PrismaClientInitializationError' || error?.message?.includes("Can't reach database")) {
      return NextResponse.json(
        {
          notifications: [],
          page: 1,
          limit: 20,
          total: 0,
          unreadCount: 0,
          hasMore: false,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { message: 'An error occurred while fetching notifications' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get user ID from header (set by middleware)
    const userId = request.headers.get('X-User-Id') || 'dev-user-bypass'

    const body = await request.json()
    const { notificationIds, markAllAsRead } = body

    if (markAllAsRead) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
        },
      })

      return NextResponse.json(
        { message: 'All notifications marked as read' },
        { status: 200 }
      )
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: {
          read: true,
        },
      })

      return NextResponse.json(
        { message: 'Notifications marked as read' },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Failed to update notifications:', error)
    return NextResponse.json(
      { message: 'An error occurred while updating notifications' },
      { status: 500 }
    )
  }
}