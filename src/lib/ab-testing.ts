/**
 * A/B Testing Framework for Recommendation Algorithms
 *
 * Allows testing different algorithm weights and strategies
 * to optimize recommendation performance.
 */

import prisma from '@/lib/prisma'
import { getCachedUserProfile, cacheUserProfile, CacheKeys, getRedisClient } from '@/lib/redis'

export interface AlgorithmWeights {
  contentWeight: number      // 0-1
  socialWeight: number        // 0-1
  engagementWeight: number    // 0-1
  recencyWeight: number       // 0-1
  qualityWeight: number       // 0-1
  embeddingWeight: number     // 0-1
}

export interface ABTestConfig {
  name: string
  description: string
  weights: AlgorithmWeights
  isControl: boolean
  trafficPercent: number
}

/**
 * Default algorithm weights (control group)
 */
export const CONTROL_WEIGHTS: AlgorithmWeights = {
  contentWeight: 0.30,
  socialWeight: 0.25,
  engagementWeight: 0.20,
  recencyWeight: 0.15,
  qualityWeight: 0.10,
  embeddingWeight: 0.00, // Not enabled by default
}

/**
 * Get or assign user to an A/B test variant
 */
export async function getUserABTestVariant(userId: string): Promise<{
  variantId: string
  weights: AlgorithmWeights
}> {
  // Check cache first
  const client = await getRedisClient()
  if (client) {
    try {
      const cached = await client.get(CacheKeys.abTestVariant(userId))
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.error('Redis AB test cache error:', error)
    }
  }

  // Check if user already has an assignment
  const existing = await prisma.aBTestAssignment.findFirst({
    where: {
      userId,
    },
    include: {
      variant: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (existing && existing.variant.isActive) {
    const result = {
      variantId: existing.variantId,
      weights: existing.variant.config as unknown as AlgorithmWeights,
    }

    // Cache the result
    if (client) {
      try {
        await client.setEx(
          CacheKeys.abTestVariant(userId),
          3600, // 1 hour
          JSON.stringify(result)
        )
      } catch (error) {
        console.error('Redis AB test cache set error:', error)
      }
    }

    return result
  }

  // Get active variants
  const activeVariants = await prisma.aBTestVariant.findMany({
    where: {
      isActive: true,
    },
  })

  if (activeVariants.length === 0) {
    // No active tests, use control weights
    return {
      variantId: 'control',
      weights: CONTROL_WEIGHTS,
    }
  }

  // Assign user to a variant based on traffic percentage
  const random = Math.random() * 100
  let cumulative = 0

  for (const variant of activeVariants) {
    cumulative += variant.trafficPercent
    if (random <= cumulative) {
      // Assign this variant
      await prisma.aBTestAssignment.create({
        data: {
          userId,
          variantId: variant.id,
        },
      })

      // Update variant total assignments
      await prisma.aBTestVariant.update({
        where: { id: variant.id },
        data: {
          totalAssignments: {
            increment: 1,
          },
        },
      })

      const result = {
        variantId: variant.id,
        weights: variant.config as unknown as AlgorithmWeights,
      }

      // Cache the result
      if (client) {
        try {
          await client.setEx(
            CacheKeys.abTestVariant(userId),
            3600,
            JSON.stringify(result)
          )
        } catch (error) {
          console.error('Redis AB test cache set error:', error)
        }
      }

      return result
    }
  }

  // Fallback to control
  return {
    variantId: 'control',
    weights: CONTROL_WEIGHTS,
  }
}

/**
 * Record recommendation feedback for A/B testing
 */
export async function recordABTestFeedback(
  userId: string,
  variantId: string,
  feedbackType: 'positive' | 'negative',
  clicked: boolean = false
): Promise<void> {
  if (variantId === 'control') return

  try {
    // Update user's assignment stats
    const updateData: any = {
      recommendationsShown: {
        increment: 1,
      },
    }

    if (clicked) {
      updateData.recommendationsClicked = {
        increment: 1,
      }
    }

    if (feedbackType === 'positive') {
      updateData.positiveFeedback = {
        increment: 1,
      }
    } else {
      updateData.negativeFeedback = {
        increment: 1,
      }
    }

    await prisma.aBTestAssignment.updateMany({
      where: {
        userId,
        variantId,
      },
      data: updateData,
    })

    // Update variant aggregate stats
    const variantUpdateData: any = {}

    if (feedbackType === 'positive') {
      variantUpdateData.totalPositiveFeedback = {
        increment: 1,
      }
    } else {
      variantUpdateData.totalNegativeFeedback = {
        increment: 1,
      }
    }

    await prisma.aBTestVariant.update({
      where: { id: variantId },
      data: variantUpdateData,
    })
  } catch (error) {
    console.error('Error recording AB test feedback:', error)
  }
}

/**
 * Update A/B test metrics
 */
export async function updateABTestMetrics(variantId: string): Promise<void> {
  if (variantId === 'control') return

  try {
    // Get all assignments for this variant
    const assignments = await prisma.aBTestAssignment.findMany({
      where: {
        variantId,
      },
    })

    if (assignments.length === 0) return

    // Calculate aggregate metrics
    const totalShown = assignments.reduce((sum, a) => sum + a.recommendationsShown, 0)
    const totalClicked = assignments.reduce((sum, a) => sum + a.recommendationsClicked, 0)

    const avgClickThroughRate = totalShown > 0 ? (totalClicked / totalShown) * 100 : 0

    // Update variant
    await prisma.aBTestVariant.update({
      where: { id: variantId },
      data: {
        avgClickThroughRate,
      },
    })
  } catch (error) {
    console.error('Error updating AB test metrics:', error)
  }
}

/**
 * Create a new A/B test variant
 */
export async function createABTestVariant(config: ABTestConfig): Promise<string> {
  const variant = await prisma.aBTestVariant.create({
    data: {
      name: config.name,
      description: config.description,
      config: config.weights as any,
      isControl: config.isControl,
      trafficPercent: config.trafficPercent,
      isActive: true,
    },
  })

  return variant.id
}

/**
 * Get A/B test results
 */
export async function getABTestResults(variantId?: string): Promise<any[]> {
  const where = variantId ? { id: variantId } : { isActive: true }

  const variants = await prisma.aBTestVariant.findMany({
    where,
    include: {
      assignments: {
        select: {
          recommendationsShown: true,
          recommendationsClicked: true,
          positiveFeedback: true,
          negativeFeedback: true,
        },
      },
    },
  })

  return variants.map(variant => {
    const totalUsers = variant.assignments.length
    const avgPositiveFeedback = totalUsers > 0
      ? variant.totalPositiveFeedback / totalUsers
      : 0
    const avgNegativeFeedback = totalUsers > 0
      ? variant.totalNegativeFeedback / totalUsers
      : 0

    return {
      id: variant.id,
      name: variant.name,
      description: variant.description,
      weights: variant.config,
      isControl: variant.isControl,
      totalAssignments: variant.totalAssignments,
      totalPositiveFeedback: variant.totalPositiveFeedback,
      totalNegativeFeedback: variant.totalNegativeFeedback,
      avgClickThroughRate: variant.avgClickThroughRate,
      avgPositiveFeedbackPerUser: avgPositiveFeedback,
      avgNegativeFeedbackPerUser: avgNegativeFeedback,
      performanceScore: calculatePerformanceScore(variant),
    }
  })
}

/**
 * Calculate overall performance score for a variant
 */
function calculatePerformanceScore(variant: any): number {
  const ctr = variant.avgClickThroughRate || 0
  const positiveFeedback = variant.totalPositiveFeedback || 0
  const negativeFeedback = variant.totalNegativeFeedback || 0
  const totalFeedback = positiveFeedback + negativeFeedback

  const feedbackScore = totalFeedback > 0
    ? (positiveFeedback / totalFeedback) * 100
    : 50 // Neutral if no feedback

  // Weighted combination: 60% feedback, 40% CTR
  return (feedbackScore * 0.6) + (ctr * 0.4)
}

/**
 * Deactivate an A/B test variant
 */
export async function deactivateABTestVariant(variantId: string): Promise<void> {
  await prisma.aBTestVariant.update({
    where: { id: variantId },
    data: {
      isActive: false,
    },
  })

  // Invalidate cache for all users with this variant
  const client = await getRedisClient()
  if (client) {
    try {
      const assignments = await prisma.aBTestAssignment.findMany({
        where: { variantId },
        select: { userId: true },
      })

      for (const assignment of assignments) {
        await client.del(CacheKeys.abTestVariant(assignment.userId))
      }
    } catch (error) {
      console.error('Error invalidating AB test caches:', error)
    }
  }
}

/**
 * Example A/B test variants to create
 */
export const EXAMPLE_VARIANTS: ABTestConfig[] = [
  {
    name: 'social_priority',
    description: 'Prioritize content from followed users more heavily',
    weights: {
      contentWeight: 0.25,
      socialWeight: 0.40, // Increased from 0.25
      engagementWeight: 0.15,
      recencyWeight: 0.10,
      qualityWeight: 0.10,
      embeddingWeight: 0.00,
    },
    isControl: false,
    trafficPercent: 25,
  },
  {
    name: 'quality_focus',
    description: 'Emphasize highly-cited and well-reviewed content',
    weights: {
      contentWeight: 0.25,
      socialWeight: 0.15,
      engagementWeight: 0.15,
      recencyWeight: 0.10,
      qualityWeight: 0.35, // Increased from 0.10
      embeddingWeight: 0.00,
    },
    isControl: false,
    trafficPercent: 25,
  },
  {
    name: 'ml_embeddings',
    description: 'Use ML embeddings for semantic similarity',
    weights: {
      contentWeight: 0.20,
      socialWeight: 0.20,
      engagementWeight: 0.15,
      recencyWeight: 0.10,
      qualityWeight: 0.10,
      embeddingWeight: 0.25, // New weight for embeddings
    },
    isControl: false,
    trafficPercent: 25,
  },
]
