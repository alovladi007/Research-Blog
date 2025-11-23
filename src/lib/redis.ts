/**
 * Redis Caching Layer for Recommendations
 *
 * Provides sub-second response times by caching:
 * - User recommendation results
 * - Computed scores
 * - Similar user mappings
 * - Popular content rankings
 */

import { createClient } from 'redis'
import type { RedisClientType } from 'redis'

let redisClient: ReturnType<typeof createClient> | null = null
let isRedisAvailable = false

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<ReturnType<typeof createClient> | null> {
  // Skip if Redis is disabled
  if (process.env.REDIS_DISABLED === 'true') {
    console.log('Redis is disabled via environment variable')
    return null
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.error('Redis connection failed after 3 retries')
            return new Error('Redis connection failed')
          }
          return retries * 1000 // Exponential backoff
        },
      },
    })

    client.on('error', (err) => {
      console.error('Redis Client Error:', err)
      isRedisAvailable = false
    })

    client.on('connect', () => {
      console.log('Redis connected successfully')
      isRedisAvailable = true
    })

    await client.connect()
    redisClient = client
    return client
  } catch (error) {
    console.error('Failed to initialize Redis:', error)
    isRedisAvailable = false
    return null
  }
}

/**
 * Get Redis client (initialize if needed)
 */
export async function getRedisClient(): Promise<ReturnType<typeof createClient> | null> {
  if (!redisClient) {
    await initRedis()
  }
  return redisClient
}

/**
 * Check if Redis is available
 */
export function isRedisEnabled(): boolean {
  return isRedisAvailable && redisClient !== null
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  userRecommendations: (userId: string, type: string) =>
    `rec:user:${userId}:${type}`,

  userProfile: (userId: string) =>
    `profile:${userId}`,

  similarUsers: (userId: string) =>
    `similar:${userId}`,

  trendingPosts: () =>
    `trending:posts`,

  trendingPapers: () =>
    `trending:papers`,

  userEngagementPattern: (userId: string) =>
    `engagement:${userId}`,

  abTestVariant: (userId: string) =>
    `abtest:${userId}`,

  contentEmbedding: (contentType: string, contentId: string) =>
    `embedding:${contentType}:${contentId}`,
}

/**
 * Get cached recommendations
 */
export async function getCachedRecommendations<T>(
  userId: string,
  type: string = 'mixed'
): Promise<T | null> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return null

  try {
    const key = CacheKeys.userRecommendations(userId, type)
    const cached = await client.get(key)

    if (cached) {
      return JSON.parse(cached) as T
    }
  } catch (error) {
    console.error('Redis get error:', error)
  }

  return null
}

/**
 * Cache recommendations
 */
export async function cacheRecommendations(
  userId: string,
  type: string,
  data: any,
  ttlSeconds: number = 300 // 5 minutes default
): Promise<void> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return

  try {
    const key = CacheKeys.userRecommendations(userId, type)
    await client.setEx(key, ttlSeconds, JSON.stringify(data))
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

/**
 * Invalidate user's recommendation cache
 */
export async function invalidateRecommendationCache(userId: string): Promise<void> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return

  try {
    const keys = [
      CacheKeys.userRecommendations(userId, 'mixed'),
      CacheKeys.userRecommendations(userId, 'posts'),
      CacheKeys.userRecommendations(userId, 'papers'),
      CacheKeys.userProfile(userId),
    ]

    await client.del(keys)
  } catch (error) {
    console.error('Redis delete error:', error)
  }
}

/**
 * Cache user profile data
 */
export async function cacheUserProfile(
  userId: string,
  data: any,
  ttlSeconds: number = 3600 // 1 hour
): Promise<void> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return

  try {
    const key = CacheKeys.userProfile(userId)
    await client.setEx(key, ttlSeconds, JSON.stringify(data))
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

/**
 * Get cached user profile
 */
export async function getCachedUserProfile<T>(userId: string): Promise<T | null> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return null

  try {
    const key = CacheKeys.userProfile(userId)
    const cached = await client.get(key)

    if (cached) {
      return JSON.parse(cached) as T
    }
  } catch (error) {
    console.error('Redis get error:', error)
  }

  return null
}

/**
 * Cache trending content
 */
export async function cacheTrendingContent(
  type: 'posts' | 'papers',
  data: any,
  ttlSeconds: number = 600 // 10 minutes
): Promise<void> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return

  try {
    const key = type === 'posts' ? CacheKeys.trendingPosts() : CacheKeys.trendingPapers()
    await client.setEx(key, ttlSeconds, JSON.stringify(data))
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

/**
 * Get cached trending content
 */
export async function getCachedTrendingContent<T>(
  type: 'posts' | 'papers'
): Promise<T | null> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return null

  try {
    const key = type === 'posts' ? CacheKeys.trendingPosts() : CacheKeys.trendingPapers()
    const cached = await client.get(key)

    if (cached) {
      return JSON.parse(cached) as T
    }
  } catch (error) {
    console.error('Redis get error:', error)
  }

  return null
}

/**
 * Increment recommendation view counter
 */
export async function incrementRecommendationViews(
  userId: string,
  itemId: string
): Promise<void> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return

  try {
    const key = `rec:views:${userId}:${itemId}`
    await client.incr(key)
    await client.expire(key, 86400) // 24 hours
  } catch (error) {
    console.error('Redis increment error:', error)
  }
}

/**
 * Store similar users mapping
 */
export async function cacheSimilarUsers(
  userId: string,
  similarUserIds: string[],
  ttlSeconds: number = 3600
): Promise<void> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return

  try {
    const key = CacheKeys.similarUsers(userId)
    await client.setEx(key, ttlSeconds, JSON.stringify(similarUserIds))
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

/**
 * Get cached similar users
 */
export async function getCachedSimilarUsers(userId: string): Promise<string[] | null> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return null

  try {
    const key = CacheKeys.similarUsers(userId)
    const cached = await client.get(key)

    if (cached) {
      return JSON.parse(cached) as string[]
    }
  } catch (error) {
    console.error('Redis get error:', error)
  }

  return null
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    isRedisAvailable = false
  }
}

/**
 * Flush all caches (use carefully!)
 */
export async function flushAllCaches(): Promise<void> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) return

  try {
    await client.flushDb()
    console.log('All Redis caches flushed')
  } catch (error) {
    console.error('Redis flush error:', error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean
  keys: number
  memoryUsed?: string
} | null> {
  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) {
    return { connected: false, keys: 0 }
  }

  try {
    const keys = await client.dbSize()
    const info = await client.info('memory')

    // Parse memory info
    const memoryMatch = info.match(/used_memory_human:(.+)/)
    const memoryUsed = memoryMatch ? memoryMatch[1].trim() : undefined

    return {
      connected: true,
      keys,
      memoryUsed,
    }
  } catch (error) {
    console.error('Redis stats error:', error)
    return null
  }
}
