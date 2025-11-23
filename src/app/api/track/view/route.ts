import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const viewTrackingSchema = z.object({
  itemType: z.enum(['post', 'paper']),
  itemId: z.string(),
  duration: z.number().optional(), // in seconds
  scrollDepth: z.number().min(0).max(100).optional(), // for posts
  downloaded: z.boolean().optional(), // for papers
})

/**
 * POST /api/track/view
 *
 * Track user views for posts and papers
 * This data is used to improve recommendations
 *
 * Body:
 * {
 *   itemType: 'post' | 'paper',
 *   itemId: string,
 *   duration?: number, // seconds
 *   scrollDepth?: number, // 0-100 for posts
 *   downloaded?: boolean // for papers
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
    const validationResult = viewTrackingSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { itemType, itemId, duration, scrollDepth, downloaded } = validationResult.data

    if (itemType === 'post') {
      // Check if post exists
      const post = await prisma.post.findUnique({
        where: { id: itemId },
      })

      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      // Record view (create or update if exists recently)
      const recentView = await prisma.postView.findFirst({
        where: {
          userId: payload.userId,
          postId: itemId,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Within last hour
          },
        },
      })

      if (recentView) {
        // Update existing view with latest data
        await prisma.postView.update({
          where: { id: recentView.id },
          data: {
            duration: duration ?? recentView.duration,
            scrollDepth: scrollDepth ?? recentView.scrollDepth,
          },
        })
      } else {
        // Create new view record
        await prisma.postView.create({
          data: {
            userId: payload.userId,
            postId: itemId,
            duration,
            scrollDepth,
          },
        })

        // Increment view count on post
        await prisma.post.update({
          where: { id: itemId },
          data: {
            viewCount: {
              increment: 1,
            },
          },
        })
      }
    } else if (itemType === 'paper') {
      // Check if paper exists
      const paper = await prisma.paper.findUnique({
        where: { id: itemId },
      })

      if (!paper) {
        return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
      }

      // Record view
      const recentView = await prisma.paperView.findFirst({
        where: {
          userId: payload.userId,
          paperId: itemId,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Within last hour
          },
        },
      })

      if (recentView) {
        // Update existing view
        await prisma.paperView.update({
          where: { id: recentView.id },
          data: {
            duration: duration ?? recentView.duration,
            downloaded: downloaded ?? recentView.downloaded,
          },
        })
      } else {
        // Create new view record
        await prisma.paperView.create({
          data: {
            userId: payload.userId,
            paperId: itemId,
            duration,
            downloaded,
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking view:', error)
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    )
  }
}
