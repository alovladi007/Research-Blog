'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import io, { Socket } from 'socket.io-client'

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  senderAvatar?: string
  createdAt: Date
  read: boolean
}

interface ChatWindowProps {
  roomId: string
  recipientName: string
  recipientId: string
}

export default function ChatWindow({ roomId, recipientName, recipientId }: ChatWindowProps) {
  const { user, token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [typing, setTyping] = useState(false)
  const [recipientTyping, setRecipientTyping] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize Socket.io connection
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
    })

    newSocket.on('connect', () => {
      console.log('Connected to chat server')
      newSocket.emit('join-room', roomId)
    })

    newSocket.on('new-message', (message: any) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: message.content,
        senderId: message.userId,
        senderName: message.senderName || 'Unknown',
        senderAvatar: message.senderAvatar,
        createdAt: new Date(message.timestamp),
        read: false,
      }])
    })

    newSocket.on('user-typing', ({ userId }: { userId: string }) => {
      if (userId !== user?.id) {
        setRecipientTyping(true)
        setTimeout(() => setRecipientTyping(false), 3000)
      }
    })

    setSocket(newSocket)

    // Load initial messages
    loadMessages()

    return () => {
      newSocket.disconnect()
    }
  }, [roomId, token])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket) return

    const message = {
      roomId,
      content: newMessage,
      senderName: user?.name,
      senderAvatar: user?.avatar,
    }

    // Emit message via Socket.io
    socket.emit('send-message', message)

    // Add message to local state immediately
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      content: newMessage,
      senderId: user!.id,
      senderName: user!.name,
      senderAvatar: user?.avatar,
      createdAt: new Date(),
      read: true,
    }])

    // Save message to database
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId,
          content: newMessage,
        }),
      })
    } catch (error) {
      console.error('Failed to save message:', error)
    }

    setNewMessage('')
  }

  const handleTyping = () => {
    if (!typing && socket) {
      setTyping(true)
      socket.emit('typing', roomId)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false)
    }, 2000)
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {getInitials(recipientName)}
            </div>
            <div>
              <h3 className="font-semibold">{recipientName}</h3>
              {recipientTyping && (
                <p className="text-sm text-gray-500 italic">typing...</p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.senderId === user?.id
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                  <div className="flex items-end space-x-2">
                    {!isOwnMessage && (
                      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-semibold">
                        {message.senderAvatar ? (
                          <img src={message.senderAvatar} alt={message.senderName} className="w-full h-full rounded-full" />
                        ) : (
                          getInitials(message.senderName)
                        )}
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatRelativeTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            Send
          </Button>
        </form>
      </div>
    </Card>
  )
}