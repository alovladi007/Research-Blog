'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Plus, Eye, MessageSquare, ThumbsUp, Edit, Trash2, MoreVertical, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface Post {
  id: string
  title: string | null
  content: string
  type: string
  published: boolean
  tags: string[]
  viewCount: number
  createdAt: string
  author: {
    id: string
    name: string
    avatar: string | null
  }
  _count: {
    comments: number
    reactions: number
  }
}

interface Stats {
  totalPosts: number
  totalViews: number
  totalLikes: number
  totalComments: number
}

export default function PostsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedTab, setSelectedTab] = useState('all')
  const [posts, setPosts] = useState<Post[]>([])
  const [stats, setStats] = useState<Stats>({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  // Fetch user's posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!user?.id) return

      try {
        setIsLoading(true)
        const response = await fetch(`/api/posts?authorId=${user.id}&limit=100`)
        if (response.ok) {
          const data = await response.json()
          const allPosts = data.posts || []
          setPosts(allPosts)

          // Calculate stats
          const totalViews = allPosts.reduce((sum: number, post: Post) => sum + post.viewCount, 0)
          const totalLikes = allPosts.reduce((sum: number, post: Post) => sum + post._count.reactions, 0)
          const totalComments = allPosts.reduce((sum: number, post: Post) => sum + post._count.comments, 0)

          setStats({
            totalPosts: allPosts.length,
            totalViews,
            totalLikes,
            totalComments
          })
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [user])

  const filteredPosts = posts.filter(post => {
    if (selectedTab === 'all') return true
    if (selectedTab === 'published') return post.published
    if (selectedTab === 'draft') return !post.published
    return true
  })

  const handleNewPost = () => {
    router.push('/dashboard/posts/new')
  }

  const handleEditPost = (postId: string) => {
    router.push(`/dashboard/posts/${postId}/edit`)
  }

  const handleViewPost = (postId: string) => {
    router.push(`/dashboard/posts/${postId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-scholar-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Posts</h1>
          <p className="text-gray-600 mt-1">Manage your research publications</p>
        </div>
        <Button className="bg-scholar-600 hover:bg-scholar-700" onClick={handleNewPost}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold">{stats.totalPosts}</p>
              </div>
              <FileText className="h-8 w-8 text-scholar-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold">{stats.totalLikes.toLocaleString()}</p>
              </div>
              <ThumbsUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Comments</p>
                <p className="text-2xl font-bold">{stats.totalComments.toLocaleString()}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All Posts ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="published">
            Published ({posts.filter(p => p.published).length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts ({posts.filter(p => !p.published).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4 mt-6">
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No posts found</p>
                  <p className="text-sm mt-2">Create your first post to get started</p>
                  <Button
                    className="mt-4 bg-scholar-600 hover:bg-scholar-700"
                    onClick={handleNewPost}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewPost(post.id)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className="bg-scholar-600">
                              {post.type}
                            </Badge>
                            <Badge
                              className={post.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                            >
                              {post.published ? 'Published' : 'Draft'}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <CardTitle className="text-xl">{post.title || 'Untitled Post'}</CardTitle>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{post.content}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {post.tags.slice(0, 5).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {post.tags.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{post.tags.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPost(post.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {post.published && (
                      <CardContent>
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {post.viewCount.toLocaleString()} views
                          </span>
                          <span className="flex items-center">
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            {post._count.reactions} likes
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {post._count.comments} comments
                          </span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
