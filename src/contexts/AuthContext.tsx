'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: string
  institution?: string
  department?: string
  bio?: string
  researchInterests: string[]
  verificationStatus: string
  _count?: {
    posts: number
    followers: number
    following: number
  }
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (data: SignUpData) => Promise<void>
  signOut: () => void
  updateUser: (data: Partial<User>) => void
  checkSession: () => Promise<void>
}

interface SignUpData {
  email: string
  password: string
  name: string
  role?: string
  institution?: string
  department?: string
  bio?: string
  researchInterests?: string[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      checkSession()
    } else {
      setLoading(false)
    }
  }, [])

  const checkSession = useCallback(async () => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setToken(storedToken)
      } else {
        // Token is invalid or expired
        localStorage.removeItem('token')
        setUser(null)
        setToken(null)
      }
    } catch (error) {
      console.error('Session check failed:', error)
      localStorage.removeItem('token')
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Sign in failed')
      }

      const data = await response.json()
      setUser(data.user)
      setToken(data.token)
      localStorage.setItem('token', data.token)
      router.push('/dashboard')
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (signUpData: SignUpData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signUpData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Sign up failed')
      }

      const data = await response.json()
      setUser(data.user)
      setToken(data.token)
      localStorage.setItem('token', data.token)
      router.push('/dashboard')
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const signOut = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    router.push('/')
  }

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signIn,
        signUp,
        signOut,
        updateUser,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function ProtectedComponent(props: P) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.push('/auth/signin')
      }
    }, [user, loading, router])

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }
}