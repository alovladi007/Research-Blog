'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface FeedbackButtonsProps {
  itemType: 'post' | 'paper' | 'group' | 'project' | 'user'
  itemId: string
  sessionId?: string
  position?: number
  variantId?: string
  onFeedback?: (feedback: 'positive' | 'negative' | 'not_interested') => void
}

export default function FeedbackButtons({
  itemType,
  itemId,
  sessionId,
  position,
  variantId,
  onFeedback,
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submitFeedback = async (feedbackType: 'positive' | 'negative' | 'not_interested') => {
    setLoading(true)

    try {
      const response = await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          itemType,
          itemId,
          feedback: feedbackType,
          sessionId,
          position,
          variantId,
        }),
      })

      if (response.ok) {
        setFeedback(feedbackType)
        onFeedback?.(feedbackType)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  if (feedback) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        {feedback === 'positive' ? (
          <span className="text-green-600">✓ Thanks for your feedback!</span>
        ) : feedback === 'not_interested' ? (
          <span className="text-gray-600">We'll show you less like this</span>
        ) : (
          <span className="text-gray-600">Feedback recorded</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => submitFeedback('positive')}
        disabled={loading}
        className="group flex items-center space-x-1 px-2 py-1 rounded text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
        title="This is helpful"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
          />
        </svg>
        <span className="hidden group-hover:inline">Helpful</span>
      </button>

      <button
        onClick={() => submitFeedback('negative')}
        disabled={loading}
        className="group flex items-center space-x-1 px-2 py-1 rounded text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        title="Not relevant"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
          />
        </svg>
        <span className="hidden group-hover:inline">Not relevant</span>
      </button>

      <button
        onClick={() => submitFeedback('not_interested')}
        disabled={loading}
        className="group flex items-center space-x-1 px-2 py-1 rounded text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
        title="Not interested in this topic"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span className="hidden group-hover:inline">Not interested</span>
      </button>
    </div>
  )
}
