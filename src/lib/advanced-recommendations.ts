/**
 * Advanced Recommendation Features
 *
 * - Time-based personalization
 * - Cross-domain recommendations
 * - ML embedding-based similarity
 */

import prisma from '@/lib/prisma'
import {
  isEmbeddingsEnabled,
  getDefaultEmbeddingConfig,
  getOrCreateEmbedding,
  findSimilarContent,
  createUserProfileEmbedding,
} from '@/lib/embeddings'
import { RecommendationScore } from '@/lib/recommendations'

/**
 * Track user engagement with time context
 */
export async function trackEngagementTime(
  userId: string,
  contentType: 'post' | 'paper' | 'group' | 'project',
  contentId: string,
  tags: string[],
  engagementScore: number = 5
): Promise<void> {
  const now = new Date()
  const hourOfDay = now.getHours()
  const dayOfWeek = now.getDay()

  try {
    await prisma.userEngagementTime.create({
      data: {
        userId,
        hourOfDay,
        dayOfWeek,
        contentType,
        contentId,
        tags,
        engagementScore,
      },
    })
  } catch (error) {
    console.error('Error tracking engagement time:', error)
  }
}

/**
 * Get user's engagement patterns for current time
 */
export async function getTimeBasedPreferences(
  userId: string
): Promise<{
  preferredTags: string[]
  preferredContentTypes: string[]
  engagementBoost: number
}> {
  const now = new Date()
  const currentHour = now.getHours()
  const currentDay = now.getDay()

  // Get engagements within ±2 hours and same day of week
  const similarTimeEngagements = await prisma.userEngagementTime.findMany({
    where: {
      userId,
      OR: [
        {
          hourOfDay: {
            gte: Math.max(0, currentHour - 2),
            lte: Math.min(23, currentHour + 2),
          },
        },
      ],
      dayOfWeek: currentDay,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  })

  if (similarTimeEngagements.length === 0) {
    return {
      preferredTags: [],
      preferredContentTypes: [],
      engagementBoost: 1.0,
    }
  }

  // Aggregate tags and content types
  const tagCounts: Record<string, number> = {}
  const contentTypeCounts: Record<string, number> = {}
  let totalEngagement = 0

  for (const engagement of similarTimeEngagements) {
    // Count tags
    for (const tag of engagement.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + engagement.engagementScore
    }

    // Count content types
    contentTypeCounts[engagement.contentType] =
      (contentTypeCounts[engagement.contentType] || 0) + engagement.engagementScore

    totalEngagement += engagement.engagementScore
  }

  // Get top tags
  const preferredTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag)

  // Get top content types
  const preferredContentTypes = Object.entries(contentTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type)

  // Calculate engagement boost (1.0 - 1.5x multiplier)
  const avgEngagement = totalEngagement / similarTimeEngagements.length
  const engagementBoost = 1.0 + (avgEngagement / 10) * 0.5

  return {
    preferredTags,
    preferredContentTypes,
    engagementBoost,
  }
}

/**
 * Apply time-based personalization to recommendation scores
 */
export function applyTimeBasedBoost(
  scores: RecommendationScore[],
  timePreferences: {
    preferredTags: string[]
    preferredContentTypes: string[]
    engagementBoost: number
  },
  items: any[]
): RecommendationScore[] {
  return scores.map((score, index) => {
    const item = items.find(i => i.id === score.itemId)
    if (!item) return score

    let boost = 1.0

    // Check if item type matches preferred content types
    if (timePreferences.preferredContentTypes.includes(score.itemType)) {
      boost *= 1.2
      score.reasons.push('You usually engage with this type now')
    }

    // Check if item tags overlap with preferred tags at this time
    const itemTags = item.tags || []
    const tagOverlap = itemTags.filter((tag: string) =>
      timePreferences.preferredTags.includes(tag)
    ).length

    if (tagOverlap > 0) {
      boost *= 1.0 + (tagOverlap * 0.1)
      score.reasons.push('Popular topic for you at this time')
    }

    // Apply overall engagement boost
    boost *= timePreferences.engagementBoost

    return {
      ...score,
      score: score.score * boost,
    }
  })
}

/**
 * Get cross-domain recommendations (groups, projects, users)
 */
export async function getCrossDomainRecommendations(
  userId: string,
  limit: number = 10
): Promise<{
  groups: any[]
  projects: any[]
  users: any[]
}> {
  // Get user's interests
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      researchInterests: true,
      department: true,
      institution: true,
    },
  })

  if (!user) {
    return { groups: [], projects: [], users: [] }
  }

  // Get user's liked papers and posts for content-based filtering
  const [likedPapers, likedPosts] = await Promise.all([
    prisma.review.findMany({
      where: {
        reviewerId: userId,
        rating: { gte: 4 },
      },
      include: {
        paper: {
          select: {
            authors: { select: { id: true } },
            project: { select: { id: true } },
          },
        },
      },
      take: 20,
    }),
    prisma.reaction.findMany({
      where: {
        userId,
        postId: { not: null },
      },
      include: {
        post: {
          select: {
            authorId: true,
            groupId: true,
            projectId: true,
            tags: true,
          },
        },
      },
      take: 20,
    }),
  ])

  // Extract related entities
  const relatedGroupIds = new Set(
    likedPosts.map(r => r.post?.groupId).filter(Boolean) as string[]
  )
  const relatedProjectIds = new Set([
    ...likedPapers.map(r => r.paper?.project?.id).filter(Boolean) as string[],
    ...likedPosts.map(r => r.post?.projectId).filter(Boolean) as string[],
  ])
  const relatedUserIds = new Set([
    ...likedPapers.flatMap(r => r.paper?.authors.map(a => a.id) || []),
    ...likedPosts.map(r => r.post?.authorId).filter(Boolean) as string[],
  ])

  // Remove user's own groups, projects
  const userGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  })
  userGroups.forEach(g => relatedGroupIds.delete(g.groupId))

  const userProjects = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  })
  userProjects.forEach(p => relatedProjectIds.delete(p.projectId))

  relatedUserIds.delete(userId)

  // Get groups
  const groups = await prisma.group.findMany({
    where: {
      OR: [
        { id: { in: Array.from(relatedGroupIds) } },
        {
          AND: [
            { isPrivate: false },
            {
              members: {
                some: {
                  userId: { in: Array.from(relatedUserIds) },
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      _count: {
        select: { members: true, posts: true },
      },
      members: {
        take: 3,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      },
    },
    take: limit,
  })

  // Get projects
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { id: { in: Array.from(relatedProjectIds) } },
        {
          AND: [
            { visibility: 'PUBLIC' },
            {
              members: {
                some: {
                  userId: { in: Array.from(relatedUserIds) },
                },
              },
            },
          ],
        },
      ],
      status: 'ACTIVE',
    },
    include: {
      _count: {
        select: { members: true, papers: true, posts: true },
      },
      members: {
        take: 3,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      },
    },
    take: limit,
  })

  // Get users
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { id: { in: Array.from(relatedUserIds) } },
        {
          AND: [
            { id: { not: userId } },
            {
              researchInterests: {
                hasSome: user.researchInterests,
              },
            },
          ],
        },
      ],
      verificationStatus: 'VERIFIED',
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      role: true,
      institution: true,
      department: true,
      researchInterests: true,
      _count: {
        select: {
          posts: true,
          papers: true,
          followers: true,
        },
      },
    },
    take: limit,
  })

  return {
    groups,
    projects,
    users,
  }
}

/**
 * Get embedding-based recommendations
 */
export async function getEmbeddingBasedRecommendations(
  userId: string,
  type: 'posts' | 'papers',
  limit: number = 20,
  excludeIds: string[] = []
): Promise<RecommendationScore[]> {
  if (!isEmbeddingsEnabled()) {
    console.warn('Embeddings not enabled, skipping embedding-based recommendations')
    return []
  }

  try {
    const config = getDefaultEmbeddingConfig()

    // Get user's research interests
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { researchInterests: true },
    })

    if (!user || user.researchInterests.length === 0) {
      return []
    }

    // Create or get user profile embedding
    const userEmbedding = await createUserProfileEmbedding(
      userId,
      user.researchInterests,
      config
    )

    // Find similar content
    const similarContent = await findSimilarContent(
      userEmbedding,
      type === 'posts' ? 'post' : 'paper',
      limit * 2, // Get more candidates
      excludeIds,
      0.6 // Minimum similarity threshold
    )

    // Convert to recommendation scores
    const recommendations: RecommendationScore[] = similarContent.map(item => ({
      itemId: item.contentId,
      itemType: type === 'posts' ? 'post' : 'paper',
      score: item.similarity * 100, // Convert to 0-100 scale
      reasons: [
        `${Math.round(item.similarity * 100)}% semantic match with your interests`,
      ],
    }))

    return recommendations.slice(0, limit)
  } catch (error) {
    console.error('Error generating embedding-based recommendations:', error)
    return []
  }
}

/**
 * Merge multiple recommendation sources
 */
export function mergeRecommendations(
  sources: RecommendationScore[][],
  weights: number[],
  limit: number
): RecommendationScore[] {
  const merged = new Map<string, RecommendationScore>()

  sources.forEach((source, index) => {
    const weight = weights[index] || 1.0

    source.forEach(item => {
      const existing = merged.get(item.itemId)

      if (existing) {
        // Combine scores with weight
        existing.score = (existing.score + item.score * weight) / 2
        existing.reasons = [...new Set([...existing.reasons, ...item.reasons])]
      } else {
        merged.set(item.itemId, {
          ...item,
          score: item.score * weight,
        })
      }
    })
  })

  // Sort by combined score and return top N
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
