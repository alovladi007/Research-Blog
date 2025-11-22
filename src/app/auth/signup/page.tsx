'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'STUDENT',
    institution: '',
    department: '',
    bio: '',
    researchInterests: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, user } = useAuth()
  const router = useRouter()

  // Redirect if bypass is enabled or user is already logged in
  useEffect(() => {
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

    if (bypassAuth) {
      console.log('🔓 [DEV] Auth bypass enabled - redirecting to dashboard')
      router.push('/dashboard')
      return
    }

    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    setLoading(true)
    
    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        institution: formData.institution,
        department: formData.department,
        bio: formData.bio,
        researchInterests: formData.researchInterests
          .split(',')
          .map(i => i.trim())
          .filter(Boolean),
      })
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Join Scholar Hub</h1>
          <p className="text-center text-gray-600 mt-2">
            Create your account and connect with researchers worldwide
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="email"
                name="email"
                label="Email Address"
                placeholder="you@university.edu"
                value={formData.email}
                onChange={handleChange}
                required
                helperText="Use your academic or corporate email for instant verification"
              />
              
              <Input
                type="text"
                name="name"
                label="Full Name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="password"
                name="password"
                label="Password"
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />
              
              <Input
                type="password"
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="STUDENT">Student</option>
                  <option value="RESEARCHER">Researcher</option>
                  <option value="PROFESSOR">Professor</option>
                </select>
              </div>
              
              <Input
                type="text"
                name="institution"
                label="Institution"
                placeholder="University/Company name"
                value={formData.institution}
                onChange={handleChange}
              />
            </div>
            
            <Input
              type="text"
              name="department"
              label="Department"
              placeholder="e.g., Computer Science, Biology"
              value={formData.department}
              onChange={handleChange}
            />
            
            <Textarea
              name="bio"
              label="Bio (Optional)"
              placeholder="Tell us about yourself and your research interests..."
              value={formData.bio}
              onChange={handleChange}
              rows={3}
            />
            
            <Input
              type="text"
              name="researchInterests"
              label="Research Interests"
              placeholder="e.g., Machine Learning, Quantum Computing, Neuroscience (comma-separated)"
              value={formData.researchInterests}
              onChange={handleChange}
              helperText="Separate multiple interests with commas"
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={!formData.email || !formData.password || !formData.name}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}