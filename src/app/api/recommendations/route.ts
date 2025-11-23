import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractToken } from '@/lib/auth'
import {
  getRecommendedPosts,
  getRecommendedPapers,
  getMixedRecommendations,
  findSimilarUsers,
  RecommendationScore,
} from '@/lib/recommendations'
import {
  getTimeBasedPreferences,
  applyTimeBasedBoost,
  getEmbeddingBasedRecommendations,
  mergeRecommendations,
} from '@/lib/advanced-recommendations'
import { getUserABTestVariant } from '@/lib/ab-testing'
import {
  getCachedRecommendations,
  cacheRecommendations,
  isRedisEnabled,
} from '@/lib/redis'
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
    const useCache = searchParams.get('cache') !== 'false'

    // Check cache first
    if (useCache && isRedisEnabled()) {
      const cached = await getCachedRecommendations<any>(payload.userId, type)
      if (cached) {
        return NextResponse.json({
          ...cached,
          cached: true,
        })
      }
    }

    // Get A/B test variant for this user
    const { variantId, weights } = await getUserABTestVariant(payload.userId)

    let recommendations: RecommendationScore[] = []
    let sessionId = `${payload.userId}-${Date.now()}`

    // Get recommendations based on type with A/B test weights
    switch (type) {
      case 'posts':
        recommendations = await getRecommendedPosts(payload.userId, limit, excludeIds)
        break
      case 'papers':
        recommendations = await getRecommendedPapers(payload.userId, limit, excludeIds)
        break
      case 'mixed':
      default:
        // For mixed, we can optionally include embedding-based recommendations
        const baseRecs = await getMixedRecommendations(payload.userId, limit)

        // If embeddings are enabled and weighted, add them
        if (weights.embeddingWeight > 0) {
          const embeddingPostRecs = await getEmbeddingBasedRecommendations(
            payload.userId,
            'posts',
            Math.floor(limit / 2),
            excludeIds
          )
          const embeddingPaperRecs = await getEmbeddingBasedRecommendations(
            payload.userId,
            'papers',
            Math.floor(limit / 2),
            excludeIds
          )

          // Merge recommendations with weights
          recommendations = mergeRecommendations(
            [baseRecs, embeddingPostRecs, embeddingPaperRecs],
            [1.0, weights.embeddingWeight, weights.embeddingWeight],
            limit
          )
        } else {
          recommendations = baseRecs
        }
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

    // Apply time-based personalization
    const timePreferences = await getTimeBasedPreferences(payload.userId)
    const allItems = [...posts, ...papers]

    if (timePreferences.preferredTags.length > 0 || timePreferences.engagementBoost > 1.0) {
      recommendations = applyTimeBasedBoost(recommendations, timePreferences, allItems)
      // Re-sort after applying boosts
      recommendations.sort((a, b) => b.score - a.score)
    }

    // Map back to recommendation order with reasons
    const results = recommendations.map((rec, index) => {
      if (rec.itemType === 'post') {
        const post = posts.find(p => p.id === rec.itemId)
        return {
          ...post,
          recommendationScore: rec.score,
          recommendationReasons: rec.reasons,
          recommendationPosition: index + 1,
          recommendationSessionId: sessionId,
          variantId,
          type: 'post' as const,
        }
      } else {
        const paper = papers.find(p => p.id === rec.itemId)
        return {
          ...paper,
          recommendationScore: rec.score,
          recommendationReasons: rec.reasons,
          recommendationPosition: index + 1,
          recommendationSessionId: sessionId,
          variantId,
          type: 'paper' as const,
        }
      }
    })

    const response = {
      recommendations: results,
      total: results.length,
      sessionId,
      variantId,
      timeOptimized: timePreferences.engagementBoost > 1.0,
    }

    // Cache the results
    if (useCache && isRedisEnabled()) {
      await cacheRecommendations(payload.userId, type, response, 300) // 5 minutes
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}
