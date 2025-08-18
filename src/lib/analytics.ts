import { prisma } from '@/lib/db'

// Analytics event types
export enum AnalyticsEvent {
  PAGE_VIEW = 'PAGE_VIEW',
  POST_VIEW = 'POST_VIEW',
  POST_CREATE = 'POST_CREATE',
  POST_LIKE = 'POST_LIKE',
  POST_COMMENT = 'POST_COMMENT',
  POST_SHARE = 'POST_SHARE',
  USER_FOLLOW = 'USER_FOLLOW',
  USER_SIGNUP = 'USER_SIGNUP',
  USER_LOGIN = 'USER_LOGIN',
  PAPER_VIEW = 'PAPER_VIEW',
  PAPER_DOWNLOAD = 'PAPER_DOWNLOAD',
  GROUP_JOIN = 'GROUP_JOIN',
  GROUP_CREATE = 'GROUP_CREATE',
  SEARCH = 'SEARCH',
  ERROR = 'ERROR'
}

export interface AnalyticsData {
  event: AnalyticsEvent
  userId?: string
  sessionId: string
  metadata?: Record<string, any>
  timestamp: Date
  userAgent?: string
  ipAddress?: string
  referrer?: string
  path?: string
}

// Track analytics event
export async function trackEvent(data: AnalyticsData): Promise<void> {
  try {
    // In production, this would send to an analytics service like Mixpanel, Amplitude, or custom solution
    // For now, we'll log to console and could store in database
    console.log('Analytics Event:', {
      ...data,
      timestamp: new Date()
    })

    // Optional: Store critical events in database for internal analytics
    if (shouldStoreEvent(data.event)) {
      await storeEventInDatabase(data)
    }

    // Send to Google Analytics if configured
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', data.event, {
        user_id: data.userId,
        session_id: data.sessionId,
        ...data.metadata
      })
    }
  } catch (error) {
    console.error('Failed to track analytics event:', error)
  }
}

// Determine if event should be stored in database
function shouldStoreEvent(event: AnalyticsEvent): boolean {
  const criticalEvents = [
    AnalyticsEvent.USER_SIGNUP,
    AnalyticsEvent.POST_CREATE,
    AnalyticsEvent.PAPER_VIEW,
    AnalyticsEvent.ERROR
  ]
  return criticalEvents.includes(event)
}

// Store event in database for internal analytics
async function storeEventInDatabase(data: AnalyticsData): Promise<void> {
  // This would typically be stored in a separate analytics table
  // For demonstration, we'll use a simplified approach
  console.log('Storing event in database:', data)
}

// User analytics
export interface UserAnalytics {
  userId: string
  totalPosts: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalFollowers: number
  totalFollowing: number
  engagementRate: number
  impactScore: number
  topPosts: any[]
  growthTrend: {
    followers: number[]
    posts: number[]
    engagement: number[]
  }
}

export async function getUserAnalytics(userId: string): Promise<UserAnalytics> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      posts: {
        include: {
          _count: {
            select: {
              reactions: true,
              comments: true
            }
          }
        }
      },
      _count: {
        select: {
          posts: true,
          followers: true,
          following: true,
          papers: true
        }
      }
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Calculate total views and engagement
  let totalViews = 0
  let totalLikes = 0
  let totalComments = 0

  user.posts.forEach((post: any) => {
    totalViews += post.viewCount
    totalLikes += post._count.reactions
    totalComments += post._count.comments
  })

  // Calculate engagement rate
  const engagementRate = totalViews > 0 
    ? ((totalLikes + totalComments) / totalViews) * 100 
    : 0

  // Calculate impact score (simplified formula)
  const impactScore = 
    (user._count.followers * 10) +
    (user._count.posts * 5) +
    (totalLikes * 2) +
    (totalComments * 3) +
    (user._count.papers * 20)

  // Get top posts
  const topPosts = user.posts
    .sort((a: any, b: any) => b.viewCount - a.viewCount)
    .slice(0, 5)
    .map((post: any) => ({
      id: post.id,
      title: post.title,
      views: post.viewCount,
      likes: post._count.reactions,
      comments: post._count.comments
    }))

  // Mock growth trend data (in production, this would be calculated from historical data)
  const growthTrend = {
    followers: generateTrendData(user._count.followers),
    posts: generateTrendData(user._count.posts),
    engagement: generateTrendData(Math.round(engagementRate))
  }

  return {
    userId,
    totalPosts: user._count.posts,
    totalViews,
    totalLikes,
    totalComments,
    totalFollowers: user._count.followers,
    totalFollowing: user._count.following,
    engagementRate: Math.round(engagementRate * 100) / 100,
    impactScore,
    topPosts,
    growthTrend
  }
}

// Generate mock trend data
function generateTrendData(currentValue: number): number[] {
  const trend = []
  let value = Math.max(1, currentValue - 30)
  
  for (let i = 0; i < 7; i++) {
    value += Math.floor(Math.random() * 10)
    trend.push(value)
  }
  
  trend[6] = currentValue // Ensure last value matches current
  return trend
}

// Platform-wide analytics
export interface PlatformAnalytics {
  totalUsers: number
  totalPosts: number
  totalGroups: number
  totalPapers: number
  activeUsers: number
  newUsersToday: number
  postsToday: number
  topTrendingTags: { tag: string; count: number }[]
  userGrowth: number[]
  postGrowth: number[]
  engagementMetrics: {
    avgPostViews: number
    avgLikesPerPost: number
    avgCommentsPerPost: number
  }
}

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get counts
  const [
    totalUsers,
    totalPosts,
    totalGroups,
    totalPapers,
    newUsersToday,
    postsToday,
    activeUsers
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.group.count(),
    prisma.paper.count(),
    prisma.user.count({
      where: { createdAt: { gte: todayStart } }
    }),
    prisma.post.count({
      where: { createdAt: { gte: todayStart } }
    }),
    prisma.user.count({
      where: { updatedAt: { gte: weekAgo } }
    })
  ])

  // Get engagement metrics
  const posts = await prisma.post.findMany({
    select: {
      viewCount: true,
      _count: {
        select: {
          reactions: true,
          comments: true
        }
      }
    }
  })

  const avgPostViews = posts.length > 0
    ? posts.reduce((sum: number, post: any) => sum + post.viewCount, 0) / posts.length
    : 0

  const avgLikesPerPost = posts.length > 0
    ? posts.reduce((sum: number, post: any) => sum + post._count.reactions, 0) / posts.length
    : 0

  const avgCommentsPerPost = posts.length > 0
    ? posts.reduce((sum: number, post: any) => sum + post._count.comments, 0) / posts.length
    : 0

  // Get trending tags
  const recentPosts = await prisma.post.findMany({
    where: { createdAt: { gte: weekAgo } },
    select: { tags: true }
  })

  const tagCounts = new Map<string, number>()
  recentPosts.forEach((post: any) => {
    post.tags.forEach((tag: string) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    })
  })

  const topTrendingTags = Array.from(tagCounts.entries())
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))

  // Mock growth data (in production, this would be from historical data)
  const userGrowth = generateGrowthData(totalUsers, 30)
  const postGrowth = generateGrowthData(totalPosts, 30)

  return {
    totalUsers,
    totalPosts,
    totalGroups,
    totalPapers,
    activeUsers,
    newUsersToday,
    postsToday,
    topTrendingTags,
    userGrowth,
    postGrowth,
    engagementMetrics: {
      avgPostViews: Math.round(avgPostViews),
      avgLikesPerPost: Math.round(avgLikesPerPost * 10) / 10,
      avgCommentsPerPost: Math.round(avgCommentsPerPost * 10) / 10
    }
  }
}

// Generate mock growth data
function generateGrowthData(currentValue: number, days: number): number[] {
  const growth = []
  let value = Math.max(1, currentValue - days * 10)
  
  for (let i = 0; i < days; i++) {
    value += Math.floor(Math.random() * 20)
    growth.push(value)
  }
  
  growth[days - 1] = currentValue // Ensure last value matches current
  return growth
}

// Performance monitoring
export interface PerformanceMetrics {
  pageLoadTime: number
  apiResponseTime: number
  databaseQueryTime: number
  cacheHitRate: number
  errorRate: number
}

export function trackPerformance(metrics: Partial<PerformanceMetrics>): void {
  // In production, this would send to a monitoring service like Datadog or New Relic
  console.log('Performance Metrics:', metrics)

  // Send to monitoring service
  if (typeof window !== 'undefined' && (window as any).performance) {
    const perfData = (window as any).performance.getEntriesByType('navigation')[0]
    if (perfData) {
      trackEvent({
        event: AnalyticsEvent.PAGE_VIEW,
        sessionId: generateSessionId(),
        metadata: {
          loadTime: perfData.loadEventEnd - perfData.loadEventStart,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          ...metrics
        },
        timestamp: new Date()
      })
    }
  }
}

// Error tracking
export function trackError(error: Error, context?: Record<string, any>): void {
  console.error('Application Error:', error, context)

  trackEvent({
    event: AnalyticsEvent.ERROR,
    sessionId: generateSessionId(),
    metadata: {
      errorMessage: error.message,
      errorStack: error.stack,
      ...context
    },
    timestamp: new Date()
  })

  // In production, send to error tracking service like Sentry
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureException(error, { extra: context })
  }
}

// Generate session ID
function generateSessionId(): string {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('sessionId')
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15)
      sessionStorage.setItem('sessionId', sessionId)
    }
    return sessionId
  }
  return 'server-session'
}