'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, TrendingUp, Eye, Users, FileText, MessageSquare, Award, Globe, Loader2 } from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalViews: number
    totalLikes: number
    totalFollowers: number
    totalFollowing: number
    totalComments: number
    totalPosts: number
    totalPapers: number
    totalProjects: number
    impactScore: number
  }
  topPosts: Array<{
    id: string
    title: string
    views: number
    likes: number
    comments: number
  }>
  recentActivity: Array<{
    date: string
    views: number
    likes: number
    comments: number
  }>
  engagement: {
    avgViewsPerPost: number
    avgLikesPerPost: number
    avgCommentsPerPost: number
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/analytics')
        if (response.ok) {
          const data = await response.json()
          setAnalytics(data)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-scholar-600" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Failed to load analytics data</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const maxViews = Math.max(...analytics.recentActivity.map(day => day.views), 1)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-gray-600 mt-1">Track your research impact and engagement</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">{analytics.overview.totalViews.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.overview.totalPosts} posts</p>
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
                <p className="text-2xl font-bold">{analytics.overview.totalLikes.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Avg {analytics.engagement.avgLikesPerPost}/post</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Followers</p>
                <p className="text-2xl font-bold">{analytics.overview.totalFollowers}</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.overview.totalFollowing} following</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Impact Score</p>
                <p className="text-2xl font-bold">{analytics.overview.impactScore.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.overview.totalProjects} projects</p>
              </div>
              <Award className="h-8 w-8 text-scholar-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  {analytics.recentActivity.length > 0
                    ? `Last ${analytics.recentActivity.length} days with activity`
                    : 'No recent activity'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.recentActivity.map((day, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{new Date(day.date).toLocaleDateString()}</span>
                          <span className="text-gray-600">{day.views} views</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-scholar-600 h-2 rounded-full"
                            style={{ width: `${(day.views / maxViews) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No activity in the last 30 days</p>
                )}
              </CardContent>
            </Card>

            {/* Top Posts */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Posts</CardTitle>
                <CardDescription>Your most viewed content</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topPosts.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topPosts.map((post, index) => (
                      <div key={post.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-scholar-100 text-scholar-700 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{post.title}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center">
                              <Eye className="h-3 w-3 mr-1" />
                              {post.views.toLocaleString()}
                            </span>
                            <span className="flex items-center">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {post.likes}
                            </span>
                            <span className="flex items-center">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {post.comments}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No posts yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>How users interact with your content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{analytics.overview.totalComments.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Comments</p>
                  <p className="text-xs text-gray-500 mt-1">Avg {analytics.engagement.avgCommentsPerPost}/post</p>
                </div>
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{analytics.overview.totalLikes.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Likes</p>
                  <p className="text-xs text-gray-500 mt-1">Avg {analytics.engagement.avgLikesPerPost}/post</p>
                </div>
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <Eye className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold">{analytics.overview.totalViews.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Views</p>
                  <p className="text-xs text-gray-500 mt-1">Avg {analytics.engagement.avgViewsPerPost}/post</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Posts</p>
                    <p className="text-2xl font-bold">{analytics.overview.totalPosts}</p>
                  </div>
                  <FileText className="h-8 w-8 text-scholar-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Papers</p>
                    <p className="text-2xl font-bold">{analytics.overview.totalPapers}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Projects</p>
                    <p className="text-2xl font-bold">{analytics.overview.totalProjects}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
