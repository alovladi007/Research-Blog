'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useCallback, useState } from 'react'

export interface RecommendedItem {
  id: string
  type: 'post' | 'paper'
  recommendationScore?: number
  recommendationReasons?: string[]
  [key: string]: any
}

export function useRecommendations() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)

  /**
   * Get personalized recommendations
   */
  const getRecommendations = useCallback(
    async (options?: {
      type?: 'posts' | 'papers' | 'mixed'
      limit?: number
      exclude?: string[]
    }): Promise<{ recommendations: RecommendedItem[]; total: number }> => {
      if (!token) {
        throw new Error('Authentication required')
      }

      setLoading(true)

      try {
        const params = new URLSearchParams()
        if (options?.type) params.append('type', options.type)
        if (options?.limit) params.append('limit', options.limit.toString())
        if (options?.exclude) params.append('exclude', options.exclude.join(','))

        const response = await fetch(`/api/recommendations?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch recommendations')
        }

        return await response.json()
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  /**
   * Track view for a post or paper
   */
  const trackView = useCallback(
    async (data: {
      itemType: 'post' | 'paper'
      itemId: string
      duration?: number
      scrollDepth?: number
      downloaded?: boolean
    }): Promise<void> => {
      if (!token) return

      try {
        await fetch('/api/track/view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
          credentials: 'include',
        })
      } catch (error) {
        console.error('Failed to track view:', error)
        // Fail silently for analytics
      }
    },
    [token]
  )

  return {
    getRecommendations,
    trackView,
    loading,
  }
}
