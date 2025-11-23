import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractToken } from '@/lib/auth'
import { getCrossDomainRecommendations } from '@/lib/advanced-recommendations'

/**
 * GET /api/recommendations/discover
 *
 * Get cross-domain recommendations (groups, projects, users to follow)
 * Helps users discover new communities and collaborations
 *
 * Query parameters:
 * - limit: number (default: 10)
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
    const limit = parseInt(searchParams.get('limit') || '10')

    const discoveries = await getCrossDomainRecommendations(payload.userId, limit)

    return NextResponse.json({
      groups: discoveries.groups.map(g => ({
        ...g,
        recommendationType: 'group',
        reason: 'Based on your research interests and network',
      })),
      projects: discoveries.projects.map(p => ({
        ...p,
        recommendationType: 'project',
        reason: 'Researchers in your network are involved',
      })),
      users: discoveries.users.map(u => ({
        ...u,
        recommendationType: 'user',
        reason: 'Similar research interests',
      })),
      total: discoveries.groups.length + discoveries.projects.length + discoveries.users.length,
    })
  } catch (error) {
    console.error('Error fetching cross-domain recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discoveries' },
      { status: 500 }
    )
  }
}
