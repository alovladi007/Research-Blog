import { prisma } from '@/lib/db'
import { Post, User, Paper, Group } from '@prisma/client'

export interface SearchFilters {
  query?: string
  type?: 'posts' | 'users' | 'papers' | 'groups' | 'all'
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
  institution?: string
  role?: string
  sortBy?: 'relevance' | 'recent' | 'popular' | 'citations'
  limit?: number
  offset?: number
}

export interface SearchResult {
  posts: any[]
  users: any[]
  papers: any[]
  groups: any[]
  totalCount: number
}

// Advanced search function with full-text search and filtering
export async function advancedSearch(filters: SearchFilters): Promise<SearchResult> {
  const {
    query = '',
    type = 'all',
    tags = [],
    dateFrom,
    dateTo,
    institution,
    role,
    sortBy = 'relevance',
    limit = 20,
    offset = 0
  } = filters

  const results: SearchResult = {
    posts: [],
    users: [],
    papers: [],
    groups: [],
    totalCount: 0
  }

  // Build search conditions
  const searchConditions: any = {}
  
  if (query) {
    searchConditions.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { content: { contains: query, mode: 'insensitive' } },
    ]
  }

  if (tags.length > 0) {
    searchConditions.tags = { hasSome: tags }
  }

  if (dateFrom || dateTo) {
    searchConditions.createdAt = {}
    if (dateFrom) searchConditions.createdAt.gte = dateFrom
    if (dateTo) searchConditions.createdAt.lte = dateTo
  }

  // Search posts
  if (type === 'all' || type === 'posts') {
    const posts = await prisma.post.findMany({
      where: searchConditions,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            institution: true,
            avatar: true,
            verificationStatus: true
          }
        },
        reactions: true,
        comments: true,
        _count: {
          select: {
            reactions: true,
            comments: true,
            bookmarks: true
          }
        }
      },
      orderBy: getSortOrder('post', sortBy),
      take: limit,
      skip: offset
    })
    results.posts = posts
  }

  // Search users
  if (type === 'all' || type === 'users') {
    const userConditions: any = {}
    
    if (query) {
      userConditions.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } },
        { institution: { contains: query, mode: 'insensitive' } },
        { researchInterests: { hasSome: [query] } }
      ]
    }

    if (institution) {
      userConditions.institution = { contains: institution, mode: 'insensitive' }
    }

    if (role) {
      userConditions.role = role
    }

    const users = await prisma.user.findMany({
      where: {
        ...userConditions,
        verificationStatus: 'VERIFIED'
      },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        role: true,
        institution: true,
        department: true,
        researchInterests: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            papers: true
          }
        }
      },
      orderBy: getSortOrder('user', sortBy),
      take: limit,
      skip: offset
    })
    results.users = users
  }

  // Search papers
  if (type === 'all' || type === 'papers') {
    const paperConditions: any = {}
    
    if (query) {
      paperConditions.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { abstract: { contains: query, mode: 'insensitive' } },
        { journal: { contains: query, mode: 'insensitive' } }
      ]
    }

    const papers = await prisma.paper.findMany({
      where: paperConditions,
      include: {
        authors: {
          select: {
            id: true,
            name: true,
            institution: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      },
      orderBy: getSortOrder('paper', sortBy),
      take: limit,
      skip: offset
    })
    results.papers = papers
  }

  // Search groups
  if (type === 'all' || type === 'groups') {
    const groupConditions: any = {}
    
    if (query) {
      groupConditions.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    }

    const groups = await prisma.group.findMany({
      where: groupConditions,
      include: {
        _count: {
          select: {
            members: true,
            posts: true
          }
        }
      },
      orderBy: getSortOrder('group', sortBy),
      take: limit,
      skip: offset
    })
    results.groups = groups
  }

  // Calculate total count
  results.totalCount = 
    results.posts.length + 
    results.users.length + 
    results.papers.length + 
    results.groups.length

  return results
}

// Get sort order based on entity type and sort preference
function getSortOrder(entityType: string, sortBy: string): any {
  switch (sortBy) {
    case 'recent':
      return { createdAt: 'desc' }
    case 'popular':
      if (entityType === 'post') return { viewCount: 'desc' }
      if (entityType === 'user') return { followers: { _count: 'desc' } }
      if (entityType === 'paper') return { citations: 'desc' }
      if (entityType === 'group') return { members: { _count: 'desc' } }
      return { createdAt: 'desc' }
    case 'citations':
      if (entityType === 'paper') return { citations: 'desc' }
      return { createdAt: 'desc' }
    default:
      return { createdAt: 'desc' }
  }
}

// Recommendation engine
export interface RecommendationOptions {
  userId: string
  type: 'posts' | 'users' | 'papers' | 'groups'
  limit?: number
}

export async function getRecommendations(options: RecommendationOptions): Promise<any[]> {
  const { userId, type, limit = 10 } = options

  // Get user's interests and activity
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      posts: {
        select: { tags: true },
        take: 20
      },
      reactions: {
        include: {
          post: {
            select: { tags: true, authorId: true }
          }
        },
        take: 50
      },
      following: {
        select: { followingId: true }
      },
      groups: {
        select: { groupId: true }
      }
    }
  })

  if (!user) return []

  // Extract user's interests from their activity
  const userTags = new Set<string>()
  const interactedAuthors = new Set<string>()
  const followingIds = user.following.map((f: any) => f.followingId)
  const groupIds = user.groups.map((g: any) => g.groupId)

  // Collect tags from user's posts
  user.posts.forEach((post: any) => {
    post.tags.forEach((tag: string) => userTags.add(tag))
  })

  // Collect tags and authors from user's reactions
  user.reactions.forEach((reaction: any) => {
    if (reaction.post) {
      reaction.post.tags.forEach((tag: string) => userTags.add(tag))
      interactedAuthors.add(reaction.post.authorId)
    }
  })

  // Add user's research interests
  user.researchInterests.forEach((interest: string) => userTags.add(interest))

  const tagsArray = Array.from(userTags)

  // Generate recommendations based on type
  switch (type) {
    case 'posts':
      return await recommendPosts(userId, tagsArray, followingIds, limit)
    case 'users':
      return await recommendUsers(userId, tagsArray, followingIds, user.institution || '', limit)
    case 'papers':
      return await recommendPapers(userId, tagsArray, limit)
    case 'groups':
      return await recommendGroups(userId, tagsArray, groupIds, limit)
    default:
      return []
  }
}

async function recommendPosts(userId: string, tags: string[], followingIds: string[], limit: number) {
  return await prisma.post.findMany({
    where: {
      AND: [
        { authorId: { not: userId } },
        {
          OR: [
            { tags: { hasSome: tags } },
            { authorId: { in: followingIds } }
          ]
        },
        { published: true }
      ]
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          institution: true,
          avatar: true
        }
      },
      _count: {
        select: {
          reactions: true,
          comments: true
        }
      }
    },
    orderBy: [
      { viewCount: 'desc' },
      { createdAt: 'desc' }
    ],
    take: limit
  })
}

async function recommendUsers(userId: string, tags: string[], followingIds: string[], institution: string, limit: number) {
  return await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: userId } },
        { id: { notIn: followingIds } },
        { verificationStatus: 'VERIFIED' },
        {
          OR: [
            { researchInterests: { hasSome: tags } },
            { institution: institution }
          ]
        }
      ]
    },
    select: {
      id: true,
      name: true,
      bio: true,
      avatar: true,
      role: true,
      institution: true,
      researchInterests: true,
      _count: {
        select: {
          followers: true,
          posts: true,
          papers: true
        }
      }
    },
    orderBy: [
      { followers: { _count: 'desc' } },
      { posts: { _count: 'desc' } }
    ],
    take: limit
  })
}

async function recommendPapers(userId: string, tags: string[], limit: number) {
  // For papers, we'll recommend based on matching research interests
  // In a real system, this would use more sophisticated algorithms
  return await prisma.paper.findMany({
    where: {
      OR: tags.map((tag: string) => ({
        OR: [
          { title: { contains: tag, mode: 'insensitive' } },
          { abstract: { contains: tag, mode: 'insensitive' } }
        ]
      }))
    },
    include: {
      authors: {
        select: {
          id: true,
          name: true,
          institution: true
        }
      },
      reviews: {
        select: {
          rating: true
        }
      }
    },
    orderBy: [
      { citations: 'desc' },
      { createdAt: 'desc' }
    ],
    take: limit
  })
}

async function recommendGroups(userId: string, tags: string[], joinedGroupIds: string[], limit: number) {
  return await prisma.group.findMany({
    where: {
      AND: [
        { id: { notIn: joinedGroupIds } },
        { isPrivate: false }
      ]
    },
    include: {
      _count: {
        select: {
          members: true,
          posts: true
        }
      }
    },
    orderBy: [
      { members: { _count: 'desc' } },
      { posts: { _count: 'desc' } }
    ],
    take: limit
  })
}

// Trending topics calculation
export async function getTrendingTopics(limit: number = 10): Promise<{ tag: string; count: number }[]> {
  const recentPosts = await prisma.post.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    },
    select: {
      tags: true
    }
  })

  // Count tag occurrences
  const tagCounts = new Map<string, number>()
  recentPosts.forEach((post: any) => {
    post.tags.forEach((tag: string) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    })
  })

  // Sort by count and return top tags
  return Array.from(tagCounts.entries())
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }))
}