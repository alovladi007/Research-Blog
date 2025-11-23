'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500)

    // Try to fetch posts
    fetch('/api/posts?limit=10')
      .then(res => res.json())
      .then(data => setPosts(data.posts || []))
      .catch(err => console.error('Failed to load posts:', err))
  }, [])

  // Mock user data for development
  const user = {
    name: 'Development User',
    role: 'Researcher',
    institution: 'Development Institute',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  <p className="text-gray-600">{user.role}</p>
                  <p className="text-sm text-gray-500 mt-1">{user.institution}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-semibold">0</p>
                    <p className="text-sm text-gray-500">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold">0</p>
                    <p className="text-sm text-gray-500">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold">0</p>
                    <p className="text-sm text-gray-500">Following</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="mt-6">
              <CardHeader>
                <h3 className="font-semibold">Quick Links</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/groups" className="block text-sm text-gray-600 hover:text-blue-600">
                    → Discover Groups
                  </Link>
                  <Link href="/projects" className="block text-sm text-gray-600 hover:text-blue-600">
                    → Browse Projects
                  </Link>
                  <Link href="/papers" className="block text-sm text-gray-600 hover:text-blue-600">
                    → Submit Paper
                  </Link>
                  <Link href="/" className="block text-sm text-gray-600 hover:text-blue-600">
                    → Back to Home
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-lg">Recent Activity</h3>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading...</p>
                  </div>
                ) : posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post, i) => (
                      <div key={i} className="border-b pb-4 last:border-b-0">
                        <h4 className="font-semibold">{post.title || 'Post ' + (i + 1)}</h4>
                        <p className="text-gray-600 text-sm mt-1">{post.content?.substring(0, 150)}...</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No activity yet</p>
                    <p className="text-sm text-gray-400">
                      Start by connecting with other researchers!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This is a development version of the dashboard.
                The database is not connected, so you're seeing placeholder data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}