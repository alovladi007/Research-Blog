'use client'

import { useState, useEffect } from 'react'
import { usePosts } from '@/hooks/useApi'
import PostCard from '@/components/posts/PostCard'
import CreatePost from '@/components/posts/CreatePost'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { debounce } from '@/lib/utils'

export default function AdvancedFeedPage() {
  const { getPosts } = usePosts()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState({
    type: '',
    tags: '',
    search: '',
  })
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'discussed'>('recent')

  useEffect(() => {
    loadPosts(true)
  }, [filters, sortBy])

  const loadPosts = async (reset = false) => {
    setLoading(true)
    try {
      const currentPage = reset ? 1 : page
      const params: any = {
        page: currentPage,
        limit: 20,
      }

      if (filters.type) params.type = filters.type
      if (filters.tags) params.tags = filters.tags.split(',').map(t => t.trim())

      const data = await getPosts(params)
      
      if (reset) {
        setPosts(data.posts)
        setPage(1)
      } else {
        setPosts(prev => [...prev, ...data.posts])
      }
      
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
    loadPosts(false)
  }

  const handleSearch = debounce((value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
  }, 500)

  const postTypes = [
    { value: '', label: 'All Types', icon: '📋' },
    { value: 'ARTICLE', label: 'Articles', icon: '📝' },
    { value: 'QUESTION', label: 'Questions', icon: '❓' },
    { value: 'DISCUSSION', label: 'Discussions', icon: '💬' },
    { value: 'PAPER', label: 'Papers', icon: '📄' },
    { value: 'ANNOUNCEMENT', label: 'Announcements', icon: '📢' },
  ]

  const sortOptions = [
    { value: 'recent', label: 'Most Recent', icon: '🕐' },
    { value: 'popular', label: 'Most Popular', icon: '🔥' },
    { value: 'discussed', label: 'Most Discussed', icon: '💭' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Filters</h3>
                
                {/* Search */}
                <div className="mb-6">
                  <Input
                    type="search"
                    placeholder="Search posts..."
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>

                {/* Post Type Filter */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Post Type
                  </label>
                  <div className="space-y-2">
                    {postTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFilters(prev => ({ ...prev, type: type.value }))}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          filters.type === type.value
                            ? 'bg-blue-100 text-blue-600'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <span className="mr-2">{type.icon}</span>
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags Filter */}
                <div className="mb-6">
                  <Input
                    label="Filter by Tags"
                    placeholder="e.g., AI, biology"
                    value={filters.tags}
                    onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                    helperText="Comma-separated tags"
                  />
                </div>

                {/* Sort Options */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Sort By
                  </label>
                  <div className="space-y-2">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value as any)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === option.value
                            ? 'bg-blue-100 text-blue-600'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <span className="mr-2">{option.icon}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-6"
                  onClick={() => {
                    setFilters({ type: '', tags: '', search: '' })
                    setSortBy('recent')
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>

            {/* Trending Tags */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Trending Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {['machine-learning', 'covid-19', 'climate-change', 'quantum', 'neuroscience'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setFilters(prev => ({ ...prev, tags: tag }))}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Posts */}
          <div className="lg:col-span-3">
            {/* Create Post */}
            <CreatePost onPostCreated={() => loadPosts(true)} />
            
            {/* Posts Feed */}
            <div className="mt-6 space-y-6">
              {loading && page === 1 ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading posts...</p>
                </div>
              ) : posts.length > 0 ? (
                <>
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} onUpdate={() => loadPosts(true)} />
                  ))}
                  
                  {hasMore && (
                    <div className="text-center py-4">
                      <Button
                        onClick={handleLoadMore}
                        loading={loading && page > 1}
                        variant="outline"
                      >
                        Load More Posts
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500 mb-2">No posts found</p>
                    <p className="text-sm text-gray-400">
                      Try adjusting your filters or be the first to post!
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