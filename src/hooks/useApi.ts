'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useCallback } from 'react'

interface ApiOptions extends RequestInit {
  authenticated?: boolean
}

export function useApi() {
  const { token } = useAuth()

  const apiCall = useCallback(
    async <T = any>(url: string, options: ApiOptions = {}): Promise<T> => {
      const { authenticated = true, headers = {}, ...restOptions } = options

      const finalHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(headers as Record<string, string>),
      }

      if (authenticated && token) {
        finalHeaders['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(url, {
        ...restOptions,
        headers: finalHeaders,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }))
        throw new Error(error.message || `HTTP error! status: ${response.status}`)
      }

      return response.json()
    },
    [token]
  )

  return { apiCall }
}

// Specific API hooks
export function usePosts() {
  const { apiCall } = useApi()

  const getPosts = useCallback(
    async (params?: {
      page?: number
      limit?: number
      type?: string
      authorId?: string
      groupId?: string
      projectId?: string
      tags?: string[]
    }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.limit) searchParams.append('limit', params.limit.toString())
      if (params?.type) searchParams.append('type', params.type)
      if (params?.authorId) searchParams.append('authorId', params.authorId)
      if (params?.groupId) searchParams.append('groupId', params.groupId)
      if (params?.projectId) searchParams.append('projectId', params.projectId)
      if (params?.tags) searchParams.append('tags', params.tags.join(','))

      return apiCall(`/api/posts?${searchParams}`, {
        method: 'GET',
        authenticated: false,
      })
    },
    [apiCall]
  )

  const getPost = useCallback(
    async (id: string) => {
      return apiCall(`/api/posts/${id}`, {
        method: 'GET',
      })
    },
    [apiCall]
  )

  const createPost = useCallback(
    async (data: {
      title?: string
      content: string
      type?: string
      tags?: string[]
      groupId?: string
      projectId?: string
    }) => {
      return apiCall('/api/posts', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    [apiCall]
  )

  const updatePost = useCallback(
    async (
      id: string,
      data: {
        title?: string
        content?: string
        tags?: string[]
        published?: boolean
      }
    ) => {
      return apiCall(`/api/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    [apiCall]
  )

  const deletePost = useCallback(
    async (id: string) => {
      return apiCall(`/api/posts/${id}`, {
        method: 'DELETE',
      })
    },
    [apiCall]
  )

  const toggleBookmark = useCallback(
    async (postId: string) => {
      return apiCall(`/api/posts/${postId}/bookmark`, {
        method: 'POST',
      })
    },
    [apiCall]
  )

  const addReaction = useCallback(
    async (postId: string, type: 'LIKE' | 'INSIGHTFUL' | 'HELPFUL' | 'CELEBRATE') => {
      return apiCall(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      })
    },
    [apiCall]
  )

  const addComment = useCallback(
    async (postId: string, content: string, parentId?: string) => {
      return apiCall(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentId }),
      })
    },
    [apiCall]
  )

  return {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    toggleBookmark,
    addReaction,
    addComment,
  }
}

export function useUsers() {
  const { apiCall } = useApi()

  const getUser = useCallback(
    async (id: string) => {
      return apiCall(`/api/users/${id}`, {
        method: 'GET',
      })
    },
    [apiCall]
  )

  const updateProfile = useCallback(
    async (id: string, data: any) => {
      return apiCall(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    [apiCall]
  )

  const toggleFollow = useCallback(
    async (userId: string) => {
      return apiCall(`/api/users/${userId}/follow`, {
        method: 'POST',
      })
    },
    [apiCall]
  )

  const getFollowers = useCallback(
    async (userId: string, page = 1, limit = 20) => {
      return apiCall(`/api/users/${userId}/followers?page=${page}&limit=${limit}`, {
        method: 'GET',
        authenticated: false,
      })
    },
    [apiCall]
  )

  const getFollowing = useCallback(
    async (userId: string, page = 1, limit = 20) => {
      return apiCall(`/api/users/${userId}/following?page=${page}&limit=${limit}`, {
        method: 'GET',
        authenticated: false,
      })
    },
    [apiCall]
  )

  return {
    getUser,
    updateProfile,
    toggleFollow,
    getFollowers,
    getFollowing,
  }
}

export function useNotifications() {
  const { apiCall } = useApi()

  const getNotifications = useCallback(
    async (page = 1, limit = 20, unreadOnly = false) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (unreadOnly) params.append('unread', 'true')

      return apiCall(`/api/notifications?${params}`, {
        method: 'GET',
      })
    },
    [apiCall]
  )

  const markAsRead = useCallback(
    async (notificationIds?: string[]) => {
      return apiCall('/api/notifications', {
        method: 'PUT',
        body: JSON.stringify(
          notificationIds
            ? { notificationIds }
            : { markAllAsRead: true }
        ),
      })
    },
    [apiCall]
  )

  return {
    getNotifications,
    markAsRead,
  }
}

export function useGroups() {
  const { apiCall } = useApi()

  const getGroups = useCallback(
    async (params?: {
      page?: number
      limit?: number
      search?: string
      myGroups?: boolean
    }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.limit) searchParams.append('limit', params.limit.toString())
      if (params?.search) searchParams.append('search', params.search)
      if (params?.myGroups) searchParams.append('myGroups', 'true')

      return apiCall(`/api/groups?${searchParams}`, {
        method: 'GET',
        authenticated: !!params?.myGroups,
      })
    },
    [apiCall]
  )

  const getGroup = useCallback(
    async (id: string) => {
      return apiCall(`/api/groups/${id}`, {
        method: 'GET',
      })
    },
    [apiCall]
  )

  const createGroup = useCallback(
    async (data: {
      name: string
      description: string
      isPrivate?: boolean
    }) => {
      return apiCall('/api/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    [apiCall]
  )

  const joinGroup = useCallback(
    async (groupId: string) => {
      return apiCall(`/api/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
    },
    [apiCall]
  )

  const leaveGroup = useCallback(
    async (groupId: string) => {
      return apiCall(`/api/groups/${groupId}/members`, {
        method: 'DELETE',
      })
    },
    [apiCall]
  )

  return {
    getGroups,
    getGroup,
    createGroup,
    joinGroup,
    leaveGroup,
  }
}