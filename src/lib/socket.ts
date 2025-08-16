import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const initSocket = (token: string): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('Connected to WebSocket server')
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server')
    })

    socket.on('error', (error) => {
      console.error('WebSocket error:', error)
    })
  }

  return socket
}

export const getSocket = (): Socket | null => {
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Event types for type safety
export interface NotificationEvent {
  id: string
  type: 'FOLLOW' | 'LIKE' | 'COMMENT' | 'MENTION' | 'GROUP_INVITE' | 'PAPER_REVIEW'
  title: string
  message: string
  relatedId?: string
  timestamp: Date
}

export interface MessageEvent {
  id: string
  chatRoomId: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
}

export interface PresenceEvent {
  userId: string
  status: 'online' | 'offline' | 'away'
  lastSeen?: Date
}

export interface TypingEvent {
  chatRoomId: string
  userId: string
  userName: string
  isTyping: boolean
}

// Socket event handlers
export const subscribeToNotifications = (callback: (notification: NotificationEvent) => void) => {
  const s = getSocket()
  if (s) {
    s.on('notification', callback)
  }
}

export const subscribeToMessages = (chatRoomId: string, callback: (message: MessageEvent) => void) => {
  const s = getSocket()
  if (s) {
    s.emit('join-room', chatRoomId)
    s.on(`message:${chatRoomId}`, callback)
  }
}

export const subscribeToPresence = (callback: (presence: PresenceEvent) => void) => {
  const s = getSocket()
  if (s) {
    s.on('presence-update', callback)
  }
}

export const subscribeToTyping = (chatRoomId: string, callback: (typing: TypingEvent) => void) => {
  const s = getSocket()
  if (s) {
    s.on(`typing:${chatRoomId}`, callback)
  }
}

// Emit events
export const sendMessage = (chatRoomId: string, content: string) => {
  const s = getSocket()
  if (s) {
    s.emit('send-message', { chatRoomId, content })
  }
}

export const setTyping = (chatRoomId: string, isTyping: boolean) => {
  const s = getSocket()
  if (s) {
    s.emit('typing', { chatRoomId, isTyping })
  }
}

export const markNotificationAsRead = (notificationId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('mark-notification-read', notificationId)
  }
}

export const updatePresence = (status: 'online' | 'away' | 'offline') => {
  const s = getSocket()
  if (s) {
    s.emit('update-presence', status)
  }
}