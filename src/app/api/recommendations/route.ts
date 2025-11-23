import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractToken } from '@/lib/auth'
import {
  getRecommendedPosts,
  getRecommendedPapers,
  getMixedRecommendations,
  findSimilarUsers,
  RecommendationScore,
} from '@/lib/recommendations'
import prisma from '@/lib/prisma'

/**
 * GET /api/recommendations
 *
 * Get personalized recommendations for the authenticated user
 *
 * Query parameters:
 * - type: 'posts' | 'papers' | 'mixed' (default: 'mixed')
 * - limit: number (default: 20)
 * - exclude: comma-separated list of IDs to exclude
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = extractToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'mixed'
    const limit = parseInt(searchParams.get('limit') || '20')
    const excludeParam = searchParams.get('exclude')
    const excludeIds = excludeParam ? excludeParam.split(',') : []

    let recommendations: RecommendationScore[] = []

    // Get recommendations based on type
    switch (type) {
      case 'posts':
        recommendations = await getRecommendedPosts(payload.userId, limit, excludeIds)
        break
      case 'papers':
        recommendations = await getRecommendedPapers(payload.userId, limit, excludeIds)
        break
      case 'mixed':
      default:
        recommendations = await getMixedRecommendations(payload.userId, limit)
        break
    }

    // Fetch full details for recommended items
    const postIds = recommendations.filter(r => r.itemType === 'post').map(r => r.itemId)
    const paperIds = recommendations.filter(r => r.itemType === 'paper').map(r => r.itemId)

    const [posts, papers] = await Promise.all([
      postIds.length > 0
        ? prisma.post.findMany({
            where: { id: { in: postIds } },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  role: true,
                  institution: true,
                  verificationStatus: true,
                },
              },
              reactions: {
                where: { userId: payload.userId },
                select: { type: true },
              },
              bookmarks: {
                where: { userId: payload.userId },
                select: { id: true },
              },
              _count: {
                select: {
                  reactions: true,
                  comments: true,
                  bookmarks: true,
                },
              },
            },
          })
        : [],
      paperIds.length > 0
        ? prisma.paper.findMany({
            where: { id: { in: paperIds } },
            include: {
              authors: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  role: true,
                  institution: true,
                  verificationStatus: true,
                },
              },
              reviews: {
                select: {
                  id: true,
                  rating: true,
                  content: true,
                  reviewer: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true,
                    },
                  },
                  createdAt: true,
                },
                take: 3,
                orderBy: { createdAt: 'desc' },
              },
              _count: {
                select: {
                  reviews: true,
                },
              },
            },
          })
        : [],
    ])

    // Map back to recommendation order with reasons
    const results = recommendations.map(rec => {
      if (rec.itemType === 'post') {
        const post = posts.find(p => p.id === rec.itemId)
        return {
          ...post,
          recommendationScore: rec.score,
          recommendationReasons: rec.reasons,
          type: 'post' as const,
        }
      } else {
        const paper = papers.find(p => p.id === rec.itemId)
        return {
          ...paper,
          recommendationScore: rec.score,
          recommendationReasons: rec.reasons,
          type: 'paper' as const,
        }
      }
    })

    return NextResponse.json({
      recommendations: results,
      total: results.length,
    })
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}
