import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { recordABTestFeedback } from '@/lib/ab-testing'
import { invalidateRecommendationCache } from '@/lib/redis'
import { z } from 'zod'

const feedbackSchema = z.object({
  itemType: z.enum(['post', 'paper', 'group', 'project', 'user']),
  itemId: z.string(),
  feedback: z.enum(['positive', 'negative', 'not_interested']),
  reason: z.string().optional(),
  sessionId: z.string().optional(),
  position: z.number().optional(),
  variantId: z.string().optional(),
})

/**
 * POST /api/recommendations/feedback
 *
 * Submit feedback on a recommendation
 *
 * Body:
 * {
 *   itemType: 'post' | 'paper' | 'group' | 'project' | 'user',
 *   itemId: string,
 *   feedback: 'positive' | 'negative' | 'not_interested',
 *   reason?: string,
 *   sessionId?: string,
 *   position?: number,
 *   variantId?: string
 * }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validationResult = feedbackSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { itemType, itemId, feedback, reason, sessionId, position, variantId } =
      validationResult.data

    // Store feedback
    await prisma.recommendationFeedback.create({
      data: {
        userId: payload.userId,
        itemType,
        itemId,
        feedback,
        reason,
        sessionId,
        position,
      },
    })

    // Record A/B test feedback if variant is provided
    if (variantId && variantId !== 'control') {
      await recordABTestFeedback(
        payload.userId,
        variantId,
        feedback === 'positive' ? 'positive' : 'negative',
        true // clicked
      )
    }

    // If negative feedback, invalidate user's recommendation cache to refresh
    if (feedback === 'negative' || feedback === 'not_interested') {
      await invalidateRecommendationCache(payload.userId)

      // Optionally: reduce this item's score in future recommendations
      // This could be implemented as a user preference or filter
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded',
    })
  } catch (error) {
    console.error('Error recording feedback:', error)
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/recommendations/feedback
 *
 * Get user's feedback history
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
    const itemType = searchParams.get('itemType')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      userId: payload.userId,
    }

    if (itemType) {
      where.itemType = itemType
    }

    const feedback = await prisma.recommendationFeedback.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json({
      feedback,
      total: feedback.length,
    })
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
