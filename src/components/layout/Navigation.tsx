'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'

export default function Navigation() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { getNotifications } = useNotifications()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user])

  const loadNotifications = async () => {
    try {
      const data = await getNotifications(1, 5, true)
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/feed', label: 'Feed', icon: '📰' },
    { href: '/groups', label: 'Groups', icon: '👥' },
    { href: '/projects', label: 'Projects', icon: '🚀' },
    { href: '/papers', label: 'Papers', icon: '📄' },
    { href: '/messages', label: 'Messages', icon: '💬' },
  ]

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Main Nav */}
          <div className="flex">
            <Link href="/" className="flex items-center px-2">
              <span className="text-2xl font-bold text-blue-600">Scholar Hub</span>
            </Link>
            
            {user && (
              <div className="hidden md:flex items-center space-x-4 ml-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Search */}
                <div className="hidden md:block">
                  <input
                    type="search"
                    placeholder="Search..."
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                  >
                    <span className="text-xl">🔔</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="font-semibold">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <div key={notif.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                              <p className="text-sm text-gray-700">{notif.content}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notif.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            No new notifications
                          </div>
                        )}
                      </div>
                      <Link
                        href="/notifications"
                        className="block p-3 text-center text-sm text-blue-600 hover:bg-gray-50"
                      >
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-700">
                      {user.name}
                    </span>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <Link
                        href={`/profile/${user.id}`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        My Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Settings
                      </Link>
                      <hr className="my-1" />
                      <button
                        onClick={signOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}