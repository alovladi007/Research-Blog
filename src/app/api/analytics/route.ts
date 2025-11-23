import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from header (set by middleware)
    const userId = request.headers.get('X-User-Id') || 'dev-user-bypass'

    // Aggregate statistics
    const [
      posts,
      papers,
      followerCount,
      followingCount,
      projectCount
    ] = await Promise.all([
      // Get all user's posts with engagement data
      prisma.post.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          title: true,
          viewCount: true,
          createdAt: true,
          _count: {
            select: {
              comments: true,
              reactions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Get all user's papers
      prisma.paper.findMany({
        where: {
          authors: {
            some: { id: userId }
          }
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          _count: {
            select: {
              reviews: true
            }
          }
        }
      }),

      // Get follower count
      prisma.follow.count({
        where: { followingId: userId }
      }),

      // Get following count
      prisma.follow.count({
        where: { followerId: userId }
      }),

      // Get project membership count
      prisma.projectMember.count({
        where: { userId }
      })
    ])

    // Calculate totals
    const totalViews = posts.reduce((sum, post) => sum + post.viewCount, 0)
    const totalLikes = posts.reduce((sum, post) => sum + post._count.reactions, 0)
    const totalComments = posts.reduce((sum, post) => sum + post._count.comments, 0)

    // Calculate impact score (simple formula: views + likes*2 + comments*3 + followers*5)
    const impactScore = totalViews + (totalLikes * 2) + (totalComments * 3) + (followerCount * 5)

    // Get top posts by views
    const topPosts = posts
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5)
      .map(post => ({
        id: post.id,
        title: post.title || 'Untitled',
        views: post.viewCount,
        likes: post._count.reactions,
        comments: post._count.comments
      }))

    // Activity over time (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentPosts = await prisma.post.findMany({
      where: {
        authorId: userId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        createdAt: true,
        viewCount: true,
        _count: {
          select: {
            reactions: true,
            comments: true
          }
        }
      }
    })

    // Group by date
    const activityByDate = new Map<string, { views: number, likes: number, comments: number }>()

    recentPosts.forEach(post => {
      const date = post.createdAt.toISOString().split('T')[0]
      const existing = activityByDate.get(date) || { views: 0, likes: 0, comments: 0 }
      activityByDate.set(date, {
        views: existing.views + post.viewCount,
        likes: existing.likes + post._count.reactions,
        comments: existing.comments + post._count.comments
      })
    })

    const recentActivity = Array.from(activityByDate.entries())
      .map(([date, stats]) => ({
        date,
        ...stats
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7) // Last 7 days with activity
      .reverse()

    return NextResponse.json({
      overview: {
        totalViews,
        totalLikes,
        totalFollowers: followerCount,
        totalFollowing: followingCount,
        totalComments,
        totalPosts: posts.length,
        totalPapers: papers.length,
        totalProjects: projectCount,
        impactScore
      },
      topPosts,
      recentActivity,
      engagement: {
        avgViewsPerPost: posts.length > 0 ? Math.round(totalViews / posts.length) : 0,
        avgLikesPerPost: posts.length > 0 ? Math.round(totalLikes / posts.length) : 0,
        avgCommentsPerPost: posts.length > 0 ? Math.round(totalComments / posts.length) : 0
      }
    })
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching analytics' },
      { status: 500 }
    )
  }
}
