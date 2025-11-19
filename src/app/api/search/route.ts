import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') // 'all', 'users', 'posts', 'papers', 'groups'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const searchTerm = query.trim()

    // Search based on type
    const results: any = {
      users: [],
      posts: [],
      papers: [],
      groups: [],
    }

    // Search users
    if (!type || type === 'all' || type === 'users') {
      results.users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { institution: { contains: searchTerm, mode: 'insensitive' } },
            { department: { contains: searchTerm, mode: 'insensitive' } },
            {
              researchInterests: {
                hasSome: [searchTerm],
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          role: true,
          institution: true,
          department: true,
          researchInterests: true,
          verificationStatus: true,
        },
        take: limit,
      })
    }

    // Search posts
    if (!type || type === 'all' || type === 'posts') {
      results.posts = await prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
            {
              tags: {
                hasSome: [searchTerm],
              },
            },
          ],
          published: true,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              institution: true,
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      })
    }

    // Search papers
    if (!type || type === 'all' || type === 'papers') {
      results.papers = await prisma.paper.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { abstract: { contains: searchTerm, mode: 'insensitive' } },
            { journal: { contains: searchTerm, mode: 'insensitive' } },
            { conference: { contains: searchTerm, mode: 'insensitive' } },
            { doi: { contains: searchTerm, mode: 'insensitive' } },
            { arxivId: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          authors: {
            select: {
              id: true,
              name: true,
              avatar: true,
              institution: true,
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      })
    }

    // Search groups
    if (!type || type === 'all' || type === 'groups') {
      results.groups = await prisma.group.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
          isPrivate: false, // Only search public groups
        },
        include: {
          _count: {
            select: {
              members: true,
              posts: true,
            },
          },
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      })
    }

    // Return results based on type
    if (type && type !== 'all') {
      return NextResponse.json({
        results: results[type],
        count: results[type].length,
      })
    }

    // Return all results with counts
    return NextResponse.json({
      results,
      counts: {
        users: results.users.length,
        posts: results.posts.length,
        papers: results.papers.length,
        groups: results.groups.length,
        total:
          results.users.length +
          results.posts.length +
          results.papers.length +
          results.groups.length,
      },
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'An error occurred during search' },
      { status: 500 }
    )
  }
}
