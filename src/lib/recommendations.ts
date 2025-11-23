/**
 * Recommendation Engine for ScholarHub
 *
 * Implements a hybrid recommendation system combining:
 * 1. Content-based filtering (research interests, tags, topics)
 * 2. Collaborative filtering (similar users)
 * 3. Social signals (followed users)
 * 4. Engagement signals (likes, bookmarks, views)
 * 5. Recency and trending factors
 */

import prisma from '@/lib/prisma'

export interface RecommendationScore {
  itemId: string
  itemType: 'post' | 'paper'
  score: number
  reasons: string[]
}

export interface UserProfile {
  id: string
  researchInterests: string[]
  likedPosts: string[]
  likedPapers: string[]
  bookmarkedPosts: string[]
  followedUsers: string[]
  department?: string
  institution?: string
}

/**
 * Calculate text similarity using Jaccard similarity on keywords
 */
function calculateTextSimilarity(text1: string[], text2: string[]): number {
  if (text1.length === 0 || text2.length === 0) return 0

  const set1 = new Set(text1.map(t => t.toLowerCase()))
  const set2 = new Set(text2.map(t => t.toLowerCase()))

  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}

/**
 * Extract keywords from text (simple implementation)
 */
function extractKeywords(text: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
  ])

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
}

/**
 * Calculate content-based score for a post/paper based on user's interests
 */
function calculateContentScore(
  userInterests: string[],
  itemTags: string[],
  itemText: string,
  userDepartment?: string,
  itemDepartment?: string
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  // Interest match score (0-40 points)
  if (userInterests.length > 0 && itemTags.length > 0) {
    const interestSimilarity = calculateTextSimilarity(userInterests, itemTags)
    const interestScore = interestSimilarity * 40
    score += interestScore

    if (interestScore > 20) {
      reasons.push('Matches your research interests')
    }
  }

  // Keyword match score (0-20 points)
  if (userInterests.length > 0 && itemText) {
    const itemKeywords = extractKeywords(itemText)
    const keywordSimilarity = calculateTextSimilarity(userInterests, itemKeywords)
    const keywordScore = keywordSimilarity * 20
    score += keywordScore

    if (keywordScore > 10) {
      reasons.push('Related to your research topics')
    }
  }

  // Department match (0-10 points)
  if (userDepartment && itemDepartment && userDepartment === itemDepartment) {
    score += 10
    reasons.push('From your department')
  }

  return { score, reasons }
}

/**
 * Calculate social score based on followed users
 */
function calculateSocialScore(
  followedUsers: string[],
  authorId: string,
  authorIds?: string[] // For papers with multiple authors
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  // Check if author or any co-author is followed
  const allAuthors = authorIds ? [...authorIds, authorId] : [authorId]
  const followedAuthorsCount = allAuthors.filter(id => followedUsers.includes(id)).length

  if (followedAuthorsCount > 0) {
    score = 50 // High priority for followed users
    reasons.push('From researchers you follow')
  }

  return { score, reasons }
}

/**
 * Calculate engagement score based on reactions, views, bookmarks
 */
function calculateEngagementScore(
  reactionCount: number,
  viewCount: number,
  bookmarkCount: number,
  createdAt: Date
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  // Normalize engagement metrics
  const engagementRate = reactionCount + (bookmarkCount * 2)

  // Engagement score (0-30 points)
  const engagementScore = Math.min(30, Math.log(engagementRate + 1) * 8)
  score += engagementScore

  if (engagementRate > 10) {
    reasons.push('Popular in the community')
  }

  // View score (0-10 points)
  const viewScore = Math.min(10, Math.log(viewCount + 1) * 3)
  score += viewScore

  // Recency score (0-20 points, decays over time)
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  const recencyScore = Math.max(0, 20 * Math.exp(-daysSinceCreation / 7)) // 7-day half-life
  score += recencyScore

  if (daysSinceCreation < 1) {
    reasons.push('Recently published')
  }

  return { score, reasons }
}

/**
 * Get user profile for recommendations
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      researchInterests: true,
      department: true,
      institution: true,
      reactions: {
        where: { postId: { not: null } },
        select: { postId: true },
      },
      bookmarks: {
        select: { postId: true },
      },
      following: {
        select: { followingId: true },
      },
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Get papers the user has reviewed positively (rating >= 4)
  const positiveReviews = await prisma.review.findMany({
    where: {
      reviewerId: userId,
      rating: { gte: 4 },
    },
    select: { paperId: true },
  })

  return {
    id: user.id,
    researchInterests: user.researchInterests,
    likedPosts: user.reactions.map(r => r.postId!).filter(Boolean),
    likedPapers: positiveReviews.map(r => r.paperId),
    bookmarkedPosts: user.bookmarks.map(b => b.postId),
    followedUsers: user.following.map(f => f.followingId),
    department: user.department || undefined,
    institution: user.institution || undefined,
  }
}

/**
 * Get personalized post recommendations
 */
export async function getRecommendedPosts(
  userId: string,
  limit: number = 20,
  excludePostIds: string[] = []
): Promise<RecommendationScore[]> {
  const userProfile = await getUserProfile(userId)

  // Fetch candidate posts (not authored by user, not already seen)
  const posts = await prisma.post.findMany({
    where: {
      published: true,
      authorId: { not: userId },
      id: { notIn: [...excludePostIds, ...userProfile.likedPosts, ...userProfile.bookmarkedPosts] },
    },
    include: {
      author: {
        select: {
          id: true,
          department: true,
        },
      },
      reactions: {
        select: { id: true },
      },
      bookmarks: {
        select: { id: true },
      },
      _count: {
        select: {
          reactions: true,
          bookmarks: true,
        },
      },
    },
    take: 200, // Get more candidates to filter and rank
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Score each post
  const scoredPosts: RecommendationScore[] = posts.map(post => {
    const reasons: string[] = []
    let totalScore = 0

    // Content-based score
    const contentResult = calculateContentScore(
      userProfile.researchInterests,
      post.tags,
      `${post.title || ''} ${post.content}`,
      userProfile.department,
      post.author.department || undefined
    )
    totalScore += contentResult.score
    reasons.push(...contentResult.reasons)

    // Social score
    const socialResult = calculateSocialScore(
      userProfile.followedUsers,
      post.authorId
    )
    totalScore += socialResult.score
    reasons.push(...socialResult.reasons)

    // Engagement score
    const engagementResult = calculateEngagementScore(
      post._count.reactions,
      post.viewCount,
      post._count.bookmarks,
      post.createdAt
    )
    totalScore += engagementResult.score
    reasons.push(...engagementResult.reasons)

    // Diversity factor: slightly boost posts from different types
    if (post.type === 'QUESTION' || post.type === 'DISCUSSION') {
      totalScore += 5
      if (post.type === 'QUESTION') {
        reasons.push('Question from the community')
      }
    }

    return {
      itemId: post.id,
      itemType: 'post' as const,
      score: totalScore,
      reasons: reasons.length > 0 ? reasons : ['Suggested for you'],
    }
  })

  // Sort by score and return top N
  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Get personalized paper recommendations
 */
export async function getRecommendedPapers(
  userId: string,
  limit: number = 20,
  excludePaperIds: string[] = []
): Promise<RecommendationScore[]> {
  const userProfile = await getUserProfile(userId)

  // Get user's own paper IDs to exclude
  const userPapers = await prisma.paper.findMany({
    where: {
      authors: {
        some: { id: userId },
      },
    },
    select: { id: true },
  })
  const userPaperIds = userPapers.map(p => p.id)

  // Fetch candidate papers
  const papers = await prisma.paper.findMany({
    where: {
      id: { notIn: [...excludePaperIds, ...userProfile.likedPapers, ...userPaperIds] },
    },
    include: {
      authors: {
        select: {
          id: true,
          department: true,
        },
      },
      reviews: {
        select: { id: true, rating: true },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
    take: 200,
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Score each paper
  const scoredPapers: RecommendationScore[] = papers.map(paper => {
    const reasons: string[] = []
    let totalScore = 0

    // Content-based score
    const paperText = `${paper.title} ${paper.abstract} ${paper.journal || ''} ${paper.conference || ''}`
    const contentResult = calculateContentScore(
      userProfile.researchInterests,
      [], // Papers don't have tags in current schema, but we extract from text
      paperText,
      userProfile.department,
      paper.authors[0]?.department || undefined
    )
    totalScore += contentResult.score
    reasons.push(...contentResult.reasons)

    // Social score (check all authors)
    const authorIds = paper.authors.map(a => a.id)
    const socialResult = calculateSocialScore(
      userProfile.followedUsers,
      authorIds[0] || '',
      authorIds
    )
    totalScore += socialResult.score
    reasons.push(...socialResult.reasons)

    // Citation score (prestigious papers)
    if (paper.citations > 10) {
      const citationScore = Math.min(20, Math.log(paper.citations) * 5)
      totalScore += citationScore
      if (paper.citations > 50) {
        reasons.push('Highly cited paper')
      }
    }

    // Review score (average rating)
    if (paper.reviews.length > 0) {
      const avgRating = paper.reviews.reduce((sum, r) => sum + r.rating, 0) / paper.reviews.length
      const reviewScore = avgRating * 4 // 0-20 points
      totalScore += reviewScore
      if (avgRating >= 4) {
        reasons.push('Highly rated by reviewers')
      }
    }

    // Recency score
    const daysSinceCreation = (Date.now() - paper.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    const recencyScore = Math.max(0, 15 * Math.exp(-daysSinceCreation / 14)) // 14-day half-life
    totalScore += recencyScore

    if (daysSinceCreation < 7) {
      reasons.push('Recently added')
    }

    // Journal/conference boost
    if (paper.journal || paper.conference) {
      totalScore += 5
      reasons.push('Published in peer-reviewed venue')
    }

    return {
      itemId: paper.id,
      itemType: 'paper' as const,
      score: totalScore,
      reasons: reasons.length > 0 ? reasons : ['Suggested for you'],
    }
  })

  // Sort by score and return top N
  return scoredPapers
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Get mixed recommendations (posts and papers)
 */
export async function getMixedRecommendations(
  userId: string,
  limit: number = 20
): Promise<RecommendationScore[]> {
  const [postRecs, paperRecs] = await Promise.all([
    getRecommendedPosts(userId, limit),
    getRecommendedPapers(userId, Math.floor(limit / 2)),
  ])

  // Merge and sort by score
  const mixed = [...postRecs, ...paperRecs]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return mixed
}

/**
 * Find similar users based on research interests and engagement patterns
 */
export async function findSimilarUsers(
  userId: string,
  limit: number = 10
): Promise<string[]> {
  const userProfile = await getUserProfile(userId)

  if (userProfile.researchInterests.length === 0) {
    return []
  }

  // Find users with overlapping research interests
  const similarUsers = await prisma.user.findMany({
    where: {
      id: { not: userId },
      researchInterests: {
        hasSome: userProfile.researchInterests,
      },
    },
    select: {
      id: true,
      researchInterests: true,
    },
    take: 50,
  })

  // Calculate similarity scores
  const scoredUsers = similarUsers.map(user => ({
    userId: user.id,
    similarity: calculateTextSimilarity(userProfile.researchInterests, user.researchInterests),
  }))

  // Return top similar users
  return scoredUsers
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(u => u.userId)
}
