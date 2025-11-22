/**
 * Custom Next.js Server with Socket.io
 *
 * This file creates a custom Node.js server for Next.js that includes Socket.io support.
 * Use this for development and production deployments that support long-running servers.
 *
 * For serverless deployments (Vercel), you'll need to use an alternative like:
 * - Pusher
 * - Ably
 * - Supabase Realtime
 * - Deploy Socket.io server separately
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || 'localhost'
const port = parseInt(process.env.PORT || '3200', 10)

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3200',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  })

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Join user-specific room
    socket.on('join', (userId) => {
      socket.join(`user:${userId}`)
      console.log(`User ${userId} joined their room`)
    })

    // Join chat room
    socket.on('join-chat', (roomId) => {
      socket.join(`chat:${roomId}`)
      console.log(`Socket ${socket.id} joined chat room ${roomId}`)
    })

    // Leave chat room
    socket.on('leave-chat', (roomId) => {
      socket.leave(`chat:${roomId}`)
      console.log(`Socket ${socket.id} left chat room ${roomId}`)
    })

    // Send message
    socket.on('send-message', (data) => {
      const { roomId, message } = data
      io.to(`chat:${roomId}`).emit('new-message', message)
    })

    // Typing indicator
    socket.on('typing', (data) => {
      const { roomId, userId, userName } = data
      socket.to(`chat:${roomId}`).emit('user-typing', { userId, userName })
    })

    // Stop typing
    socket.on('stop-typing', (data) => {
      const { roomId, userId } = data
      socket.to(`chat:${roomId}`).emit('user-stop-typing', { userId })
    })

    // Send notification
    socket.on('send-notification', (data) => {
      const { userId, notification } = data
      io.to(`user:${userId}`).emit('notification', notification)
    })

    // Presence
    socket.on('user-online', (userId) => {
      io.emit('user-status', { userId, status: 'online' })
    })

    socket.on('user-offline', (userId) => {
      io.emit('user-status', { userId, status: 'offline' })
    })

    // Disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  // Make io accessible to API routes
  global.io = io

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Socket.io server running on port ${port}`)
    })
})
