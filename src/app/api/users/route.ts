import { NextRequest, NextResponse } from 'next/server'
import { searchUsers } from '@/lib/db-helpers'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const role = searchParams.get('role')
    const institution = searchParams.get('institution')
    const verified = searchParams.get('verified')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    if (query) {
      // Search users
      const users = await searchUsers(query, limit)
      return NextResponse.json({ users }, { status: 200 })
    }

    // Build where clause
    const where: any = {}
    if (role) where.role = role
    if (institution) where.institution = { contains: institution, mode: 'insensitive' }
    if (verified === 'true') where.verificationStatus = 'VERIFIED'

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        institution: true,
        department: true,
        bio: true,
        researchInterests: true,
        verificationStatus: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            papers: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.user.count({ where })

    return NextResponse.json(
      {
        users,
        page,
        limit,
        total,
        hasMore: skip + users.length < total,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching users' },
      { status: 500 }
    )
  }
}