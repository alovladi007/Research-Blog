'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Search, Send, Paperclip, MoreVertical, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { io, Socket } from 'socket.io-client'

interface Sender {
  id: string
  name: string
  avatar: string | null
}

interface Message {
  id: string
  content: string
  createdAt: string
  senderId: string
  sender: Sender
}

interface ChatRoom {
  id: string
  participants: string[]
  createdAt: string
  updatedAt: string
  otherParticipant?: {
    id: string
    name: string
    avatar: string | null
    role: string
  }
  lastMessage?: Message
  unreadCount: number
}

// Format time ago
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

export default function MessagesPage() {
  const { toast } = useToast()
  const { user, token } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  // Initialize Socket.io connection
  useEffect(() => {
    if (!token || !user) return

    // Connect to Socket.io server
    const socket = io({
      auth: { token }
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Socket.io connected')
    })

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected')
    })

    return () => {
      socket.disconnect()
    }
  }, [token, user])

  // Join room and listen for new messages
  useEffect(() => {
    if (!selectedRoom || !socketRef.current) return

    const socket = socketRef.current

    // Join the chat room
    socket.emit('join-chat', selectedRoom.id)

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      setMessages((prev) => [...prev, message])

      // Update chat room's last message
      setChatRooms((prev) =>
        prev.map((room) =>
          room.id === selectedRoom.id
            ? { ...room, lastMessage: message }
            : room
        )
      )

      // Scroll to bottom
      scrollToBottom()
    }

    socket.on('new-message', handleNewMessage)

    return () => {
      socket.off('new-message', handleNewMessage)
      socket.emit('leave-chat', selectedRoom.id)
    }
  }, [selectedRoom])

  // Fetch chat rooms
  useEffect(() => {
    const fetchChatRooms = async () => {
      if (!token) return

      setIsLoadingRooms(true)
      try {
        const response = await fetch('/api/messages', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setChatRooms(data.chatRooms || [])

          // Auto-select first room if available
          if (data.chatRooms && data.chatRooms.length > 0 && !selectedRoom) {
            setSelectedRoom(data.chatRooms[0])
          }
        }
      } catch (error) {
        console.error('Failed to fetch chat rooms:', error)
        toast({
          title: 'Error',
          description: 'Failed to load conversations',
          variant: 'destructive'
        })
      } finally {
        setIsLoadingRooms(false)
      }
    }

    fetchChatRooms()
  }, [token])

  // Fetch messages for selected room
  useEffect(() => {
    const fetchMessages = async () => {
      if (!token || !selectedRoom) return

      setIsLoadingMessages(true)
      try {
        const response = await fetch(`/api/messages/${selectedRoom.id}?limit=50`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])

          // Mark messages as read
          await fetch(`/api/messages/${selectedRoom.id}`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`
            }
          })

          // Update unread count locally
          setChatRooms((prev) =>
            prev.map((room) =>
              room.id === selectedRoom.id ? { ...room, unreadCount: 0 } : room
            )
          )

          // Scroll to bottom
          scrollToBottom()
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error)
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive'
        })
      } finally {
        setIsLoadingMessages(false)
      }
    }

    fetchMessages()
  }, [selectedRoom, token])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!token || !selectedRoom || !messageText.trim()) return

    const tempMessage = messageText
    setMessageText('')
    setIsSending(true)

    try {
      const response = await fetch(`/api/messages/${selectedRoom.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: tempMessage })
      })

      if (response.ok) {
        const newMessage = await response.json()

        // Only add if not already added by socket
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id)
          return exists ? prev : [...prev, newMessage]
        })

        // Update chat room's last message
        setChatRooms((prev) =>
          prev.map((room) =>
            room.id === selectedRoom.id
              ? { ...room, lastMessage: newMessage, updatedAt: newMessage.createdAt }
              : room
          )
        )

        scrollToBottom()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to send message',
          variant: 'destructive'
        })
        setMessageText(tempMessage) // Restore message on error
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      })
      setMessageText(tempMessage) // Restore message on error
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Filter chat rooms by search query
  const filteredChatRooms = chatRooms.filter((room) =>
    room.otherParticipant?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoadingRooms) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-scholar-600" />
      </div>
    )
  }

  if (chatRooms.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-gray-600 mt-1">Communicate with your research network</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No conversations yet</p>
              <p className="text-sm mt-2">Start a conversation to see it here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-gray-600 mt-1">Communicate with your research network</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-250px)]">
        {/* Conversations List */}
        <Card className="col-span-4">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[calc(100vh-380px)] overflow-y-auto">
              {filteredChatRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full p-4 hover:bg-gray-50 transition-colors text-left ${
                    selectedRoom?.id === room.id ? 'bg-scholar-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar>
                      <AvatarFallback className="bg-scholar-100 text-scholar-700">
                        {room.otherParticipant?.name.split(' ').map(n => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{room.otherParticipant?.name || 'Unknown'}</p>
                        <span className="text-xs text-gray-500">
                          {room.lastMessage ? formatTimeAgo(room.lastMessage.createdAt) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600 truncate">
                          {room.lastMessage?.content || 'No messages yet'}
                        </p>
                        {room.unreadCount > 0 && (
                          <Badge className="bg-scholar-600 ml-2">{room.unreadCount}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        {selectedRoom ? (
          <Card className="col-span-8 flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback className="bg-scholar-100 text-scholar-700">
                      {selectedRoom.otherParticipant?.name.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedRoom.otherParticipant?.name || 'Unknown'}</CardTitle>
                    <p className="text-sm text-gray-600">{selectedRoom.otherParticipant?.role || ''}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-6">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-scholar-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.senderId === user?.id
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                          {!isOwn && (
                            <p className="text-xs text-gray-500 mb-1">{message.sender.name}</p>
                          )}
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isOwn
                                ? 'bg-scholar-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </CardContent>

            <div className="border-t p-4">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" disabled>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isSending}
                  className="bg-scholar-600 hover:bg-scholar-700"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="col-span-8 flex items-center justify-center">
            <CardContent className="text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a conversation to start messaging</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
