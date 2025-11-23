'use client'

import { useAuth, withAuth } from '@/contexts/AuthContext'
import { usePosts, useUsers } from '@/hooks/useApi'
import { useState, useEffect } from 'react'
import PostCard from '@/components/posts/PostCard'
import CreatePost from '@/components/posts/CreatePost'
import RecommendedFeed from '@/components/recommendations/RecommendedFeed'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

function DashboardPage() {
  const { user } = useAuth()
  const { getPosts } = usePosts()
  const { getFollowers, getFollowing } = useUsers()
  const [posts, setPosts] = useState<any[]>([])
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    posts: 0,
  })
  const [loading, setLoading] = useState(true)
  const [feedType, setFeedType] = useState<'recommended' | 'all' | 'following'>('recommended')

  useEffect(() => {
    loadDashboard()
  }, [feedType])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      // Load posts
      const postsData = await getPosts({ limit: 20 })
      setPosts(postsData.posts)
      
      // Load user stats
      if (user) {
        const [followersData, followingData] = await Promise.all([
          getFollowers(user.id, 1, 1),
          getFollowing(user.id, 1, 1),
        ])
        
        setStats({
          followers: followersData.total,
          following: followingData.total,
          posts: user._count?.posts || 0,
        })
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostCreated = () => {
    loadDashboard()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - User Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                    {user?.name.slice(0, 2).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-semibold">{user?.name}</h2>
                  <p className="text-gray-600">{user?.role}</p>
                  {user?.institution && (
                    <p className="text-sm text-gray-500 mt-1">{user.institution}</p>
                  )}
                  {user?.verificationStatus === 'VERIFIED' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                      ✓ Verified
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-semibold">{stats.posts}</p>
                    <p className="text-sm text-gray-500">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold">{stats.followers}</p>
                    <p className="text-sm text-gray-500">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold">{stats.following}</p>
                    <p className="text-sm text-gray-500">Following</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t">
                  <Link href={`/profile/${user?.id}`}>
                    <Button variant="outline" className="w-full">
                      View Profile
                    </Button>
                  </Link>
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
                  <Link href="/users" className="block text-sm text-gray-600 hover:text-blue-600">
                    → Find Researchers
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Feed */}
          <div className="lg:col-span-2">
            {/* Create Post */}
            <CreatePost onPostCreated={handlePostCreated} />
            
            {/* Feed Tabs */}
            <div className="flex space-x-4 mt-6 mb-4">
              <button
                onClick={() => setFeedType('recommended')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  feedType === 'recommended'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                ✨ For You
              </button>
              <button
                onClick={() => setFeedType('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  feedType === 'all'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Posts
              </button>
              <button
                onClick={() => setFeedType('following')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  feedType === 'following'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Following
              </button>
            </div>
            
            {/* Posts Feed */}
            <div className="space-y-6">
              {feedType === 'recommended' ? (
                <RecommendedFeed type="mixed" limit={20} onRefresh={loadDashboard} />
              ) : loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading posts...</p>
                </div>
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} onUpdate={loadDashboard} />
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500 mb-4">No posts to show</p>
                    <p className="text-sm text-gray-400">
                      {feedType === 'following'
                        ? 'Follow other researchers to see their posts here'
                        : 'Be the first to share something with the community!'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withAuth(DashboardPage)