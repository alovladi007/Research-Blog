import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken, extractToken } from '@/lib/auth'
import { authLimiter, apiLimiter, strictLimiter } from '@/lib/rate-limit'

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/projects',
  '/papers',
  '/feed',
  '/api/posts',
  '/api/groups',
  '/api/projects',
  '/api/papers',
  '/api/upload',
  '/api/notifications',
  '/api/messages',
]

// Public routes that should not require auth
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/api/auth/signin',
  '/api/auth/signup',
]

// Routes that need strict rate limiting
const strictRateLimitRoutes = [
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/upload',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // 1. SECURITY HEADERS
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  // Strict-Transport-Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  // Content-Security-Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://scholar-hub.s3.amazonaws.com",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ')
  )

  // 2. CORS HEADERS
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    process.env.NEXTAUTH_URL || 'http://localhost:3200',
    'http://localhost:3200',
  ]

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    )
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers })
  }

  // 3. RATE LIMITING
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'

  try {
    // Apply strict rate limiting for auth and upload endpoints
    if (strictRateLimitRoutes.some(route => pathname.startsWith(route))) {
      const result = await strictLimiter.check(ip)

      response.headers.set('X-RateLimit-Limit', result.limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', result.reset.toString())

      if (!result.success) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests. Please try again later.',
          }),
          {
            status: 429,
            headers: {
              ...Object.fromEntries(response.headers.entries()),
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
            },
          }
        )
      }
    }
    // Apply auth rate limiting for auth endpoints
    else if (pathname.startsWith('/api/auth/')) {
      const result = await authLimiter.check(ip)

      response.headers.set('X-RateLimit-Limit', result.limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', result.reset.toString())

      if (!result.success) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too many authentication attempts. Please try again later.',
          }),
          {
            status: 429,
            headers: {
              ...Object.fromEntries(response.headers.entries()),
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
            },
          }
        )
      }
    }
    // Apply general API rate limiting
    else if (pathname.startsWith('/api/')) {
      const result = await apiLimiter.check(ip)

      response.headers.set('X-RateLimit-Limit', result.limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', result.reset.toString())

      if (!result.success) {
        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded. Please slow down.',
          }),
          {
            status: 429,
            headers: {
              ...Object.fromEntries(response.headers.entries()),
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
            },
          }
        )
      }
    }
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Continue on rate limit errors
  }

  // 4. AUTHENTICATION CHECK
  // Skip auth for public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return response
  }

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(route)
  )

  if (!isProtectedRoute) {
    return response
  }

  // Extract and verify token
  const token = extractToken(request)

  if (!token) {
    // Redirect to signin for page requests
    if (!pathname.startsWith('/api/')) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // Return 401 for API requests
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'Content-Type': 'application/json',
        },
      }
    )
  }

  // Verify token
  const payload = verifyToken(token)

  if (!payload) {
    // Redirect to signin for page requests
    if (!pathname.startsWith('/api/')) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // Return 401 for API requests
    return new NextResponse(
      JSON.stringify({ error: 'Invalid or expired token' }),
      {
        status: 401,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'Content-Type': 'application/json',
        },
      }
    )
  }

  // Add user ID to request headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-User-Id', payload.userId)
  }

  return response
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
