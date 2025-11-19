'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { usePosts } from '@/hooks/useApi'
import { useAuth } from '@/contexts/AuthContext'
import CommentSection from './CommentSection'
import 'katex/dist/katex.min.css'

interface PostCardProps {
  post: any
  onUpdate?: () => void
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth()
  const { addReaction, toggleBookmark, deletePost } = usePosts()
  const [showComments, setShowComments] = useState(false)
  const [reactions, setReactions] = useState(post._count?.reactions || 0)
  const [bookmarked, setBookmarked] = useState(post.isBookmarked || false)
  const [userReaction, setUserReaction] = useState(post.userReaction || null)

  const handleReaction = async (type: 'LIKE' | 'INSIGHTFUL' | 'HELPFUL' | 'CELEBRATE') => {
    try {
      const result = await addReaction(post.id, type)
      if (result.action === 'added') {
        setReactions(reactions + 1)
        setUserReaction(type)
      } else {
        setReactions(reactions - 1)
        setUserReaction(null)
      }
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  const handleBookmark = async () => {
    try {
      const result = await toggleBookmark(post.id)
      setBookmarked(result.bookmarked)
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return
    
    try {
      await deletePost(post.id)
      onUpdate?.()
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const reactionEmojis = {
    LIKE: '👍',
    INSIGHTFUL: '💡',
    HELPFUL: '🤝',
    CELEBRATE: '🎉',
  }

  return (
    <Card hover>
      <CardContent className="pt-6">
        {/* Author Info */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {post.author?.avatar ? (
                <img src={post.author.avatar} alt={post.author.name} className="w-full h-full rounded-full" />
              ) : (
                getInitials(post.author?.name || 'Unknown')
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-semibold text-gray-900">{post.author?.name}</p>
                {post.author?.verificationStatus === 'VERIFIED' && (
                  <span className="text-blue-500" title="Verified">✓</span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{post.author?.role}</span>
                {post.author?.institution && (
                  <>
                    <span>•</span>
                    <span>{post.author.institution}</span>
                  </>
                )}
                <span>•</span>
                <span>{formatRelativeTime(post.createdAt)}</span>
              </div>
            </div>
          </div>
          {user?.id === post.author?.id && (
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>

        {/* Post Content */}
        {post.title && (
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h3>
        )}
        <div className="text-gray-700 mb-4 prose prose-sm max-w-none">
          {post.latex ? (
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              components={{
                // Custom rendering for math
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  if (match && match[1] === 'math') {
                    // Inline math
                    return (
                      <span
                        className="katex-inline"
                        dangerouslySetInnerHTML={{
                          __html: `$${String(children).replace(/\n$/, '')}$`,
                        }}
                      />
                    )
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                },
              }}
            >
              {post.content}
            </ReactMarkdown>
          ) : (
            <div className="whitespace-pre-wrap">{post.content}</div>
          )}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>{reactions} reactions</span>
          <span>{post._count?.comments || 0} comments</span>
          <span>{post.viewCount || 0} views</span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Reaction Buttons */}
          {Object.entries(reactionEmojis).map(([type, emoji]) => (
            <button
              key={type}
              onClick={() => handleReaction(type as any)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                userReaction === type
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
          >
            💬 Comment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmark}
            className={bookmarked ? 'text-blue-600' : ''}
          >
            {bookmarked ? '🔖' : '📑'} Bookmark
          </Button>
        </div>
      </CardFooter>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t">
          <CommentSection postId={post.id} />
        </div>
      )}
    </Card>
  )
}