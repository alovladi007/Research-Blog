'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import Navigation from '@/components/layout/Navigation'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main>{children}</main>
      </div>
    </AuthProvider>
  )
}