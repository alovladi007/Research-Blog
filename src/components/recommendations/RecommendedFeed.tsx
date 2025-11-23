'use client'

import { useState, useEffect } from 'react'
import { useRecommendations } from '@/hooks/useRecommendations'
import PostCard from '@/components/posts/PostCard'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface RecommendedFeedProps {
  type?: 'posts' | 'papers' | 'mixed'
  limit?: number
  onRefresh?: () => void
}

export default function RecommendedFeed({ type = 'mixed', limit = 20, onRefresh }: RecommendedFeedProps) {
  const { getRecommendations, trackView, loading } = useRecommendations()
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadRecommendations = async () => {
    try {
      setError(null)
      const data = await getRecommendations({ type, limit })
      setRecommendations(data.recommendations)
    } catch (err) {
      console.error('Failed to load recommendations:', err)
      setError('Failed to load recommendations')
    }
  }

  useEffect(() => {
    loadRecommendations()
  }, [type, limit])

  const handleItemView = (itemType: 'post' | 'paper', itemId: string) => {
    // Track view after a short delay to ensure user actually viewed it
    setTimeout(() => {
      trackView({ itemType, itemId })
    }, 2000)
  }

  const handleRefresh = () => {
    loadRecommendations()
    onRefresh?.()
  }

  if (loading && recommendations.length === 0) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex space-x-4">
                <div className="h-12 w-12 rounded-full bg-gray-300"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-500 mb-4">No recommendations available</p>
          <p className="text-sm text-gray-400">
            Interact with more posts and papers to get personalized recommendations
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Recommendation header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recommended For You</h2>
          <p className="text-sm text-gray-500">Based on your interests and activity</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Recommended items */}
      {recommendations.map((item) => {
        if (item.type === 'post' || !item.type) {
          // Render post
          return (
            <div key={item.id} className="relative">
              {/* Recommendation badge */}
              {item.recommendationReasons && item.recommendationReasons.length > 0 && (
                <div className="mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    ✨ {item.recommendationReasons[0]}
                  </span>
                </div>
              )}
              <div onMouseEnter={() => handleItemView('post', item.id)}>
                <PostCard post={item} onUpdate={loadRecommendations} />
              </div>
            </div>
          )
        } else {
          // Render paper
          return (
            <div key={item.id} className="relative">
              {/* Recommendation badge */}
              {item.recommendationReasons && item.recommendationReasons.length > 0 && (
                <div className="mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                    📄 {item.recommendationReasons[0]}
                  </span>
                </div>
              )}
              <Card
                className="hover:shadow-md transition-shadow"
                onMouseEnter={() => handleItemView('paper', item.id)}
              >
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{item.abstract}</p>

                  {/* Authors */}
                  {item.authors && item.authors.length > 0 && (
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-sm text-gray-500">Authors:</span>
                      <div className="flex flex-wrap gap-2">
                        {item.authors.slice(0, 3).map((author: any) => (
                          <span key={author.id} className="text-sm text-blue-600">
                            {author.name}
                          </span>
                        ))}
                        {item.authors.length > 3 && (
                          <span className="text-sm text-gray-500">
                            +{item.authors.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {item.journal && (
                      <span>📰 {item.journal}</span>
                    )}
                    {item.conference && (
                      <span>🎤 {item.conference}</span>
                    )}
                    {item.citations > 0 && (
                      <span>📚 {item.citations} citations</span>
                    )}
                    {item._count?.reviews > 0 && (
                      <span>⭐ {item._count.reviews} reviews</span>
                    )}
                  </div>

                  {/* View paper button */}
                  <div className="mt-4">
                    <Button
                      size="sm"
                      onClick={() => window.location.href = `/papers/${item.id}`}
                    >
                      View Paper
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        }
      })}

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}
    </div>
  )
}
