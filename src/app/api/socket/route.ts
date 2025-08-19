import { NextRequest, NextResponse } from 'next/server'
import { Server } from 'socket.io'
import { createServer } from 'http'
import { verifyToken } from '@/lib/auth'

let io: Server | null = null

export async function GET(request: NextRequest) {
  if (!io) {
    const httpServer = createServer()
    
    io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/api/socket',
    })

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) throw new Error('No token provided')
        
        const decoded = verifyToken(token)
        if (!decoded) throw new Error('Invalid token')
        
        socket.data.userId = decoded.userId
        next()
      } catch (err) {
        next(new Error('Authentication failed'))
      }
    })

    io.on('connection', (socket) => {
      console.log(`User ${socket.data.userId} connected`)
      
      // Join user's personal room for notifications
      socket.join(`user:${socket.data.userId}`)
      
      // Handle joining chat rooms
      socket.on('join-room', (roomId: string) => {
        socket.join(`room:${roomId}`)
        console.log(`User ${socket.data.userId} joined room ${roomId}`)
      })
      
      // Handle leaving chat rooms
      socket.on('leave-room', (roomId: string) => {
        socket.leave(`room:${roomId}`)
        console.log(`User ${socket.data.userId} left room ${roomId}`)
      })
      
      // Handle sending messages
      socket.on('send-message', async (data: {
        roomId: string
        content: string
        senderName?: string
        senderAvatar?: string
      }) => {
        // Broadcast to all users in the room
        io?.to(`room:${data.roomId}`).emit('new-message', {
          userId: socket.data.userId,
          content: data.content,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          timestamp: new Date(),
        })
      })
      
      // Handle typing indicators
      socket.on('typing', (roomId: string) => {
        socket.to(`room:${roomId}`).emit('user-typing', {
          userId: socket.data.userId,
        })
      })
      
      // Handle stop typing
      socket.on('stop-typing', (roomId: string) => {
        socket.to(`room:${roomId}`).emit('user-stop-typing', {
          userId: socket.data.userId,
        })
      })
      
      // Handle notifications
      socket.on('send-notification', (data: {
        userId: string
        type: string
        content: string
      }) => {
        io?.to(`user:${data.userId}`).emit('new-notification', {
          type: data.type,
          content: data.content,
          timestamp: new Date(),
        })
      })
      
      socket.on('disconnect', () => {
        console.log(`User ${socket.data.userId} disconnected`)
      })
    })

    const port = parseInt(process.env.SOCKET_PORT || '3001')
    httpServer.listen(port, () => {
      console.log(`Socket.io server running on port ${port}`)
    })
  }

  return NextResponse.json({ status: 'Socket.io server initialized' })
}