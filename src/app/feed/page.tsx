/*
 * A simple research feed page.  This page fetches posts from the
 * `/api/posts` endpoint and displays them in reverse chronological order.  A
 * form at the top allows signed‑in users to publish new posts.  In a real
 * application you would tie the post creation to the authenticated user and
 * apply proper styling with your chosen component library.
 */

'use client'

import { useEffect, useState, FormEvent } from 'react'

interface Post {
  id: string
  title: string
  content: string
  createdAt: string | Date
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // Fetch posts from the API
  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts)
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  // Submit a new post
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      if (res.ok) {
        setTitle('')
        setContent('')
        fetchPosts()
      }
    } catch (err) {
      console.error('Failed to create post:', err)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl py-6 px-4">
      <h1 className="text-3xl font-bold mb-4">Research Feed</h1>
      <form onSubmit={handleSubmit} className="mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full p-2 border rounded mb-2"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What\'s new?"
          className="w-full p-2 border rounded mb-2"
        ></textarea>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Post
        </button>
      </form>
      <div>
        {posts.map((post) => (
          <div key={post.id} className="mb-4 p-4 border rounded">
            <h2 className="text-lg font-semibold">{post.title}</h2>
            <p className="text-gray-500 text-sm">
              {new Date(post.createdAt).toLocaleString()}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}