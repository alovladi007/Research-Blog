import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, extractToken } from '@/lib/auth'
import { z } from 'zod'

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const token = extractToken(request)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if chat room exists and user is a participant
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
    })

    if (!chatRoom) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      )
    }

    // Verify user is a participant
    if (!chatRoom.participants.includes(payload.userId)) {
      return NextResponse.json(
        { error: 'You are not a participant in this chat room' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // Message ID for pagination

    const where: any = {
      chatRoomId: params.roomId,
    }

    if (before) {
      where.id = {
        lt: before,
      }
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json({
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === limit,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const token = extractToken(request)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if chat room exists and user is a participant
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
    })

    if (!chatRoom) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      )
    }

    // Verify user is a participant
    if (!chatRoom.participants.includes(payload.userId)) {
      return NextResponse.json(
        { error: 'You are not a participant in this chat room' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = sendMessageSchema.parse(body)

    // Create message
    const message = await prisma.message.create({
      data: {
        content: validatedData.content,
        senderId: payload.userId,
        chatRoomId: params.roomId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    // Update chat room's updatedAt
    await prisma.chatRoom.update({
      where: { id: params.roomId },
      data: { updatedAt: new Date() },
    })

    // Send real-time notification via Socket.io if available
    if (global.io) {
      global.io.to(`chat:${params.roomId}`).emit('new-message', message)
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const token = extractToken(request)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Mark all messages in room as read
    await prisma.message.updateMany({
      where: {
        chatRoomId: params.roomId,
        senderId: {
          not: payload.userId, // Don't mark own messages
        },
        read: false,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    )
  }
}
