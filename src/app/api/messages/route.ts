import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const sendMessageSchema = z.object({
  roomId: z.string(),
  content: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    // DEV MODE: Handle bypass auth token
    if (token === 'dev-bypass-token') {
      // Return empty chat rooms for dev mode
      return NextResponse.json({ chatRooms: [] })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Get user's chat rooms
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        participants: {
          has: decoded.userId,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Get other participants' info
    const roomsWithParticipants = await Promise.all(
      chatRooms.map(async (room) => {
        const otherParticipantId = room.participants.find(id => id !== decoded.userId)
        if (!otherParticipantId) return room

        const otherParticipant = await prisma.user.findUnique({
          where: { id: otherParticipantId },
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        })

        // Count unread messages
        const unreadCount = await prisma.message.count({
          where: {
            chatRoomId: room.id,
            senderId: { not: decoded.userId },
            read: false,
          },
        })

        return {
          ...room,
          otherParticipant,
          unreadCount,
          lastMessage: room.messages[0],
        }
      })
    )

    return NextResponse.json({ chatRooms: roomsWithParticipants })
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = sendMessageSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { roomId, content } = validationResult.data

    // Verify user is participant in the chat room
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    })

    if (!chatRoom || !chatRoom.participants.includes(decoded.userId)) {
      return NextResponse.json(
        { message: 'You are not a participant in this chat' },
        { status: 403 }
      )
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        senderId: decoded.userId,
        chatRoomId: roomId,
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
      where: { id: roomId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Failed to send message:', error)
    return NextResponse.json(
      { message: 'An error occurred while sending the message' },
      { status: 500 }
    )
  }
}