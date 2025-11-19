import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, serializeCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Clear the auth cookie by setting it to expire immediately
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    )

    // Set cookie with immediate expiration
    response.headers.set(
      'Set-Cookie',
      serializeCookie(AUTH_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0, // Expire immediately
        path: '/',
      })
    )

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    )
  }
}
