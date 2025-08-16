import { Server } from 'socket.io'
import { createServer } from 'http'
import { NextApiRequest } from 'next'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

let io: Server | null = null

export async function GET(req: Request) {
  if (!io) {
    const httpServer = createServer()
    io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    })

    // Authentication middleware
    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const decoded = verifyToken(token)
      if (!decoded) {
        return next(new Error('Invalid token'))
      }

      // Attach user info to socket
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true }
      })

      if (!user) {
        return next(new Error('User not found'))
      }

      socket.data.user = user
      next()
    })

    io.on('connection', (socket) => {
      console.log(`User ${socket.data.user.name} connected`)

      // Join user's personal room for notifications
      socket.join(`user:${socket.data.user.id}`)

      // Update user presence
      socket.broadcast.emit('presence-update', {
        userId: socket.data.user.id,
        status: 'online',
      })

      // Handle joining chat rooms
      socket.on('join-room', (chatRoomId: string) => {
        socket.join(`room:${chatRoomId}`)
        console.log(`User ${socket.data.user.name} joined room ${chatRoomId}`)
      })

      // Handle sending messages
      socket.on('send-message', async ({ chatRoomId, content }) => {
        try {
          // Save message to database
          const message = await prisma.message.create({
            data: {
              content,
              senderId: socket.data.user.id,
              chatRoomId,
            },
            include: {
              sender: {
                select: { id: true, name: true, avatar: true }
              }
            }
          })

          // Emit message to all users in the room
          io?.to(`room:${chatRoomId}`).emit(`message:${chatRoomId}`, {
            id: message.id,
            chatRoomId: message.chatRoomId,
            senderId: message.sender.id,
            senderName: message.sender.name,
            content: message.content,
            timestamp: message.createdAt,
          })

          // Send notification to other participants
          const chatRoom = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
            select: { participants: true }
          })

          if (chatRoom) {
            const otherParticipants = chatRoom.participants.filter(
              (id: string) => id !== socket.data.user.id
            )

            for (const participantId of otherParticipants) {
              // Create notification in database
              const notification = await prisma.notification.create({
                data: {
                  type: 'MESSAGE',
                  content: `New message from ${socket.data.user.name}`,
                  userId: participantId,
                  relatedId: message.id,
                }
              })

              // Send real-time notification
              io?.to(`user:${participantId}`).emit('notification', {
                id: notification.id,
                type: 'MESSAGE',
                title: 'New Message',
                message: `${socket.data.user.name}: ${content.substring(0, 50)}...`,
                relatedId: chatRoomId,
                timestamp: notification.createdAt,
              })
            }
          }
        } catch (error) {
          console.error('Error sending message:', error)
          socket.emit('error', 'Failed to send message')
        }
      })

      // Handle typing indicators
      socket.on('typing', ({ chatRoomId, isTyping }) => {
        socket.to(`room:${chatRoomId}`).emit(`typing:${chatRoomId}`, {
          chatRoomId,
          userId: socket.data.user.id,
          userName: socket.data.user.name,
          isTyping,
        })
      })

      // Handle marking notifications as read
      socket.on('mark-notification-read', async (notificationId: string) => {
        try {
          await prisma.notification.update({
            where: { id: notificationId },
            data: { read: true }
          })
        } catch (error) {
          console.error('Error marking notification as read:', error)
        }
      })

      // Handle presence updates
      socket.on('update-presence', (status: 'online' | 'away' | 'offline') => {
        socket.broadcast.emit('presence-update', {
          userId: socket.data.user.id,
          status,
          lastSeen: new Date(),
        })
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.data.user.name} disconnected`)
        
        // Update user presence
        socket.broadcast.emit('presence-update', {
          userId: socket.data.user.id,
          status: 'offline',
          lastSeen: new Date(),
        })
      })
    })

    // Start the server on a different port
    const socketPort = parseInt(process.env.SOCKET_PORT || '3001')
    httpServer.listen(socketPort, () => {
      console.log(`WebSocket server running on port ${socketPort}`)
    })
  }

  return new Response('WebSocket server initialized', { status: 200 })
}

// Helper function to emit events from other API routes
export const emitSocketEvent = (event: string, room: string, data: any) => {
  if (io) {
    io.to(room).emit(event, data)
  }
}