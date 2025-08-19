'use client'

import React, { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { usePosts } from '@/hooks/useApi'
import { useAuth } from '@/contexts/AuthContext'
import { formatRelativeTime, getInitials } from '@/lib/utils'

interface CommentSectionProps {
  postId: string
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const { user } = useAuth()
  const { addComment } = usePosts()
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)

  useEffect(() => {
    loadComments()
  }, [postId])

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments)
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    setLoading(true)
    try {
      const comment = await addComment(postId, newComment)
      setComments([comment.comment, ...comments])
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setLoading(false)
    }
  }

  const CommentItem = ({ comment, isReply = false }: { comment: any; isReply?: boolean }) => (
    <div className={`flex space-x-3 ${isReply ? 'ml-10' : ''}`}>
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-semibold">
          {comment.author?.avatar ? (
            <img src={comment.author.avatar} alt={comment.author.name} className="w-full h-full rounded-full" />
          ) : (
            getInitials(comment.author?.name || 'Unknown')
          )}
        </div>
      </div>
      <div className="flex-1">
        <div className="bg-gray-50 rounded-lg px-4 py-2">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-sm">{comment.author?.name}</span>
            {comment.author?.verificationStatus === 'VERIFIED' && (
              <span className="text-blue-500 text-xs" title="Verified">✓</span>
            )}
            <span className="text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="text-gray-700 text-sm">{comment.content}</p>
        </div>
        {comment._count?.reactions > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            {comment._count.reactions} reactions
          </div>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply: any) => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      {/* Add Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={loading} disabled={!newComment.trim()}>
              Comment
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-center text-gray-500 py-2">
          Sign in to comment
        </p>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {loadingComments ? (
          <p className="text-center text-gray-500 py-4">Loading comments...</p>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <p className="text-center text-gray-500 py-4">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  )
}