'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, TrendingUp, Users, FileText, Bookmark, Eye, MessageSquare, ThumbsUp, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'

interface Post {
  id: string
  title: string | null
  content: string
  type: string
  tags: string[]
  viewCount: number
  author: {
    id: string
    name: string
    avatar: string | null
    institution: string | null
  }
  _count: {
    comments: number
    reactions: number
  }
  createdAt: string
}

interface User {
  id: string
  name: string
  avatar: string | null
  bio: string | null
  role: string
  institution: string | null
  department: string | null
  researchInterests: string[]
  _count: {
    followers: number
    posts: number
  }
}

interface TopicStats {
  name: string
  count: number
  trend: string
}

export default function ExplorePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('trending')
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([])
  const [researchers, setResearchers] = useState<User[]>([])
  const [trendingTopics, setTrendingTopics] = useState<TopicStats[]>([])
  const [searchResults, setSearchResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 500)

  // Fetch trending posts
  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        const response = await fetch('/api/posts?limit=10&orderBy=viewCount')
        if (response.ok) {
          const data = await response.json()
          setTrendingPosts(data.posts || [])
        }
      } catch (error) {
        console.error('Failed to fetch trending posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (selectedTab === 'trending') {
      fetchTrendingPosts()
    }
  }, [selectedTab])

  // Fetch researchers
  useEffect(() => {
    const fetchResearchers = async () => {
      try {
        const response = await fetch('/api/users?limit=10&verified=true')
        if (response.ok) {
          const data = await response.json()
          setResearchers(data.users || [])
        }
      } catch (error) {
        console.error('Failed to fetch researchers:', error)
      }
    }

    if (selectedTab === 'researchers') {
      fetchResearchers()
    }
  }, [selectedTab])

  // Fetch trending topics
  useEffect(() => {
    const fetchTrendingTopics = async () => {
      try {
        const response = await fetch('/api/posts?limit=100')
        if (response.ok) {
          const data = await response.json()
          const posts = data.posts || []

          // Aggregate tags
          const tagCounts: { [key: string]: number } = {}
          posts.forEach((post: Post) => {
            post.tags.forEach((tag) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1
            })
          })

          // Convert to array and sort
          const topicsArray = Object.entries(tagCounts)
            .map(([name, count]) => ({
              name,
              count,
              trend: `+${Math.floor(Math.random() * 20)}%` // Simulated trend
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

          setTrendingTopics(topicsArray)
        }
      } catch (error) {
        console.error('Failed to fetch trending topics:', error)
      }
    }

    if (selectedTab === 'topics') {
      fetchTrendingTopics()
    }
  }, [selectedTab])

  // Search functionality
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setSearchResults(null)
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`)
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data)
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }

    performSearch()
  }, [debouncedSearch])

  const handlePostClick = (postId: string) => {
    router.push(`/dashboard/posts/${postId}`)
  }

  const handleUserClick = (userId: string) => {
    router.push(`/dashboard/profile/${userId}`)
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
      <div>
        <h1 className="text-3xl font-bold">Explore</h1>
        <p className="text-gray-600 mt-1">Discover trending research and researchers</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search papers, researchers, or topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Search Results */}
      {searchResults && searchResults.counts.total > 0 && (
        <Card className="border-scholar-200">
          <CardHeader>
            <CardTitle>Search Results ({searchResults.counts.total})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {searchResults.results.posts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Posts ({searchResults.counts.posts})</h3>
                <div className="space-y-2">
                  {searchResults.results.posts.slice(0, 3).map((post: Post) => (
                    <div
                      key={post.id}
                      onClick={() => handlePostClick(post.id)}
                      className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <p className="font-medium">{post.title || 'Untitled'}</p>
                      <p className="text-sm text-gray-600 line-clamp-1">{post.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {searchResults.results.users.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Researchers ({searchResults.counts.users})</h3>
                <div className="space-y-2">
                  {searchResults.results.users.slice(0, 3).map((user: User) => (
                    <div
                      key={user.id}
                      onClick={() => handleUserClick(user.id)}
                      className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center space-x-3"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.institution}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="researchers">Researchers</TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {trendingPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handlePostClick(post.id)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className="bg-scholar-600">{post.type}</Badge>
                          {post.viewCount > 100 && (
                            <Badge variant="outline">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Trending
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl">{post.title || 'Untitled Post'}</CardTitle>
                        <CardDescription className="mt-2">
                          by {post.author.name} • {post.author.institution || 'Unknown Institution'}
                        </CardDescription>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {post.tags.slice(0, 5).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {post.viewCount.toLocaleString()}
                      </span>
                      <span className="flex items-center">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {post._count.reactions}
                      </span>
                      <span className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {post._count.comments}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="topics" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {trendingTopics.map((topic, index) => (
              <motion.div
                key={topic.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-scholar-100 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-scholar-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{topic.name}</h3>
                          <p className="text-sm text-gray-600">{topic.count} posts</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge className="bg-green-100 text-green-700">
                          {topic.trend}
                        </Badge>
                        <Button variant="outline">Follow</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="researchers" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {researchers.map((researcher, index) => (
              <motion.div
                key={researcher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleUserClick(researcher.id)}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={researcher.avatar || undefined} />
                          <AvatarFallback className="bg-scholar-100 text-scholar-700">
                            {researcher.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{researcher.name}</h3>
                          <p className="text-sm text-gray-600">
                            {researcher.researchInterests.slice(0, 2).join(', ')}
                          </p>
                          <p className="text-xs text-gray-500">{researcher.institution || 'No institution'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{researcher._count.followers.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">followers</p>
                        </div>
                        <Button className="bg-scholar-600 hover:bg-scholar-700">Follow</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
