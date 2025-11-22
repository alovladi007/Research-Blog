'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePosts } from '@/hooks/useApi'

interface CreatePostProps {
  groupId?: string
  projectId?: string
  onPostCreated?: () => void
}

export default function CreatePost({ groupId, projectId, onPostCreated }: CreatePostProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [type, setType] = useState<'ARTICLE' | 'QUESTION' | 'DISCUSSION'>('ARTICLE')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { createPost } = usePosts()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    try {
      await createPost({
        title: title.trim(),
        content: content.trim(),
        type,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        groupId,
        projectId,
      })
      
      // Reset form
      setTitle('')
      setContent('')
      setTags('')
      setType('ARTICLE')
      setExpanded(false)
      onPostCreated?.()
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Share your research, ask a question, or start a discussion...
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex space-x-2">
              {(['ARTICLE', 'QUESTION', 'DISCUSSION'] as const).map((postType) => (
                <button
                  key={postType}
                  type="button"
                  onClick={() => setType(postType)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    type === postType
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {postType === 'ARTICLE' && '📝'}
                  {postType === 'QUESTION' && '❓'}
                  {postType === 'DISCUSSION' && '💬'}
                  {' ' + postType.charAt(0) + postType.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <Input
              placeholder={
                type === 'QUESTION' 
                  ? "What's your question?"
                  : type === 'DISCUSSION'
                  ? "What would you like to discuss?"
                  : "Title (optional)"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Textarea
              placeholder={
                type === 'QUESTION'
                  ? "Provide more details about your question..."
                  : type === 'DISCUSSION'
                  ? "Start the discussion..."
                  : "Share your thoughts, findings, or insights..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
            />

            <Input
              placeholder="Tags (comma-separated, e.g., machine-learning, biology)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />

            <div className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setExpanded(false)
                  setTitle('')
                  setContent('')
                  setTags('')
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading} disabled={!content.trim()}>
                Post
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}