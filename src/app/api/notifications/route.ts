import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread') === 'true'

    const skip = (page - 1) * limit

    const where: any = {
      userId: decoded.userId,
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
        userId: decoded.userId,
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
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching notifications' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const { notificationIds, markAllAsRead } = body

    if (markAllAsRead) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: decoded.userId,
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
          userId: decoded.userId,
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