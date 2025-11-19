// Simple in-memory rate limiter
// For production, use Redis-backed rate limiting (@upstash/ratelimit)

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max requests per window
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export function rateLimit(config: RateLimitConfig) {
  return {
    check: async (identifier: string): Promise<RateLimitResult> => {
      const now = Date.now()
      const key = `${identifier}`

      let entry = rateLimitStore.get(key)

      if (!entry || entry.resetTime < now) {
        // Create new entry
        entry = {
          count: 1,
          resetTime: now + config.interval,
        }
        rateLimitStore.set(key, entry)

        return {
          success: true,
          limit: config.uniqueTokenPerInterval,
          remaining: config.uniqueTokenPerInterval - 1,
          reset: entry.resetTime,
        }
      }

      if (entry.count >= config.uniqueTokenPerInterval) {
        return {
          success: false,
          limit: config.uniqueTokenPerInterval,
          remaining: 0,
          reset: entry.resetTime,
        }
      }

      entry.count++

      return {
        success: true,
        limit: config.uniqueTokenPerInterval,
        remaining: config.uniqueTokenPerInterval - entry.count,
        reset: entry.resetTime,
      }
    },
  }
}

// Predefined rate limiters
export const authLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 5, // 5 attempts per 15 minutes
})

export const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 60, // 60 requests per minute
})

export const strictLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10, // 10 requests per minute
})
