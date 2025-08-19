import prisma from './prisma'
import { Prisma } from '@prisma/client'

// Post-related helpers
export async function createPost(data: {
  title?: string
  content: string
  type?: 'ARTICLE' | 'QUESTION' | 'DISCUSSION' | 'PAPER' | 'ANNOUNCEMENT'
  authorId: string
  tags?: string[]
  groupId?: string
  projectId?: string
}) {
  return prisma.post.create({
    data: {
      ...data,
      tags: data.tags || [],
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
          institution: true,
        },
      },
      _count: {
        select: {
          comments: true,
          reactions: true,
          bookmarks: true,
        },
      },
    },
  })
}

export async function getPosts(options?: {
  skip?: number
  take?: number
  where?: Prisma.PostWhereInput
  orderBy?: Prisma.PostOrderByWithRelationInput
}) {
  return prisma.post.findMany({
    skip: options?.skip || 0,
    take: options?.take || 20,
    where: options?.where,
    orderBy: options?.orderBy || { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
          institution: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          comments: true,
          reactions: true,
          bookmarks: true,
        },
      },
    },
  })
}

export async function getPostById(id: string, userId?: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
          institution: true,
          bio: true,
          verificationStatus: true,
        },
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          _count: {
            select: {
              reactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      reactions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
      attachments: true,
      _count: {
        select: {
          comments: true,
          reactions: true,
          bookmarks: true,
        },
      },
    },
  })

  if (post && userId) {
    // Check if user has bookmarked this post
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: id,
        },
      },
    })

    // Check user's reaction
    const userReaction = await prisma.reaction.findFirst({
      where: {
        userId,
        postId: id,
      },
    })

    return {
      ...post,
      isBookmarked: !!bookmark,
      userReaction: userReaction?.type || null,
    }
  }

  // Increment view count
  await prisma.post.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  })

  return post
}

// Comment helpers
export async function createComment(data: {
  content: string
  postId: string
  authorId: string
  parentId?: string
}) {
  return prisma.comment.create({
    data,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
        },
      },
    },
  })
}

// Reaction helpers
export async function toggleReaction(data: {
  userId: string
  postId?: string
  commentId?: string
  type: 'LIKE' | 'INSIGHTFUL' | 'HELPFUL' | 'CELEBRATE'
}) {
  const { userId, postId, commentId, type } = data

  if (!postId && !commentId) {
    throw new Error('Either postId or commentId must be provided')
  }

  const where = postId
    ? { userId_postId_type: { userId, postId, type } }
    : { userId_commentId_type: { userId, commentId: commentId!, type } }

  const existingReaction = await prisma.reaction.findFirst({
    where: {
      userId,
      ...(postId ? { postId } : { commentId }),
      type,
    },
  })

  if (existingReaction) {
    // Remove reaction if it exists
    await prisma.reaction.delete({
      where: { id: existingReaction.id },
    })
    return { action: 'removed', type }
  } else {
    // Add reaction
    const reaction = await prisma.reaction.create({
      data: {
        userId,
        type,
        ...(postId ? { postId } : { commentId }),
      },
    })
    return { action: 'added', type, reaction }
  }
}

// Follow system helpers
export async function toggleFollow(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself')
  }

  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  })

  if (existingFollow) {
    await prisma.follow.delete({
      where: { id: existingFollow.id },
    })
    return { action: 'unfollowed' }
  } else {
    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    })
    
    // Create notification
    await prisma.notification.create({
      data: {
        type: 'FOLLOW',
        content: 'started following you',
        userId: followingId,
        relatedId: followerId,
      },
    })
    
    return { action: 'followed', follow }
  }
}

// Group helpers
export async function createGroup(data: {
  name: string
  description: string
  isPrivate?: boolean
  creatorId: string
}) {
  const group = await prisma.group.create({
    data: {
      name: data.name,
      description: data.description,
      isPrivate: data.isPrivate || false,
    },
  })

  // Add creator as admin
  await prisma.groupMember.create({
    data: {
      groupId: group.id,
      userId: data.creatorId,
      role: 'ADMIN',
    },
  })

  return group
}

// Project helpers
export async function createProject(data: {
  title: string
  description: string
  status?: string
  visibility?: string
  leaderId: string
  startDate?: Date
  endDate?: Date
}) {
  const project = await prisma.project.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status || 'ACTIVE',
      visibility: data.visibility || 'PUBLIC',
      startDate: data.startDate,
      endDate: data.endDate,
    },
  })

  // Add leader
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: data.leaderId,
      role: 'LEAD',
    },
  })

  return project
}

// Notification helpers
export async function createNotification(data: {
  type: string
  content: string
  userId: string
  relatedId?: string
}) {
  return prisma.notification.create({
    data,
  })
}

export async function markNotificationAsRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      id,
      userId,
    },
    data: {
      read: true,
    },
  })
}

// Search helpers
export async function searchUsers(query: string, limit = 10) {
  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { institution: { contains: query, mode: 'insensitive' } },
        { department: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      institution: true,
      department: true,
      verificationStatus: true,
    },
    take: limit,
  })
}

export async function searchPosts(query: string, options?: {
  type?: string
  tags?: string[]
  authorId?: string
  limit?: number
}) {
  return prisma.post.findMany({
    where: {
      AND: [
        {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
        options?.type ? { type: options.type as any } : {},
        options?.authorId ? { authorId: options.authorId } : {},
        options?.tags ? { tags: { hasSome: options.tags } } : {},
      ],
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
        },
      },
      _count: {
        select: {
          comments: true,
          reactions: true,
        },
      },
    },
    take: options?.limit || 20,
    orderBy: { createdAt: 'desc' },
  })
}