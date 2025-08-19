'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers, usePosts } from '@/hooks/useApi'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import PostCard from '@/components/posts/PostCard'
import { formatDate, getInitials } from '@/lib/utils'

export default function ProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const { user: currentUser } = useAuth()
  const { getUser, updateProfile, toggleFollow, getFollowers, getFollowing } = useUsers()
  const { getPosts } = usePosts()
  
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'followers' | 'following'>('posts')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    institution: '',
    department: '',
    researchInterests: '',
    linkedinUrl: '',
    websiteUrl: '',
  })

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const [userData, postsData, followersData, followingData] = await Promise.all([
        getUser(userId),
        getPosts({ authorId: userId, limit: 20 }),
        getFollowers(userId, 1, 10),
        getFollowing(userId, 1, 10),
      ])
      
      setProfile(userData.user)
      setIsFollowing(userData.isFollowing)
      setPosts(postsData.posts)
      setFollowers(followersData.following)
      setFollowing(followingData.following)
      
      if (userData.user) {
        setEditForm({
          name: userData.user.name || '',
          bio: userData.user.bio || '',
          institution: userData.user.institution || '',
          department: userData.user.department || '',
          researchInterests: userData.user.researchInterests?.join(', ') || '',
          linkedinUrl: userData.user.linkedinUrl || '',
          websiteUrl: userData.user.websiteUrl || '',
        })
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    try {
      await toggleFollow(userId)
      setIsFollowing(!isFollowing)
      loadProfile()
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile(userId, {
        ...editForm,
        researchInterests: editForm.researchInterests.split(',').map(i => i.trim()).filter(Boolean),
      })
      setEditing(false)
      loadProfile()
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">User not found</p>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === userId

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="flex items-center space-x-6 mb-4 md:mb-0">
                <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-3xl">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(profile.name)
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold">{profile.name}</h1>
                    {profile.verificationStatus === 'VERIFIED' && (
                      <span className="text-blue-500 text-xl" title="Verified">✓</span>
                    )}
                  </div>
                  <p className="text-gray-600">{profile.role}</p>
                  {profile.institution && (
                    <p className="text-gray-500">{profile.institution}</p>
                  )}
                  {profile.department && (
                    <p className="text-gray-500">{profile.department}</p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                {isOwnProfile ? (
                  <Button onClick={() => setEditing(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleFollow}
                      variant={isFollowing ? 'outline' : 'primary'}
                    >
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                    <Button variant="outline">
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-8 border-t">
              <div className="text-center">
                <p className="text-2xl font-semibold">{profile._count?.posts || 0}</p>
                <p className="text-sm text-gray-500">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{profile._count?.followers || 0}</p>
                <p className="text-sm text-gray-500">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{profile._count?.following || 0}</p>
                <p className="text-sm text-gray-500">Following</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{profile._count?.papers || 0}</p>
                <p className="text-sm text-gray-500">Papers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{profile._count?.projects || 0}</p>
                <p className="text-sm text-gray-500">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Modal */}
        {editing && (
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-xl font-semibold">Edit Profile</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <Input
                  label="Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Textarea
                  label="Bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                />
                <Input
                  label="Institution"
                  value={editForm.institution}
                  onChange={(e) => setEditForm(prev => ({ ...prev, institution: e.target.value }))}
                />
                <Input
                  label="Department"
                  value={editForm.department}
                  onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                />
                <Input
                  label="Research Interests"
                  value={editForm.researchInterests}
                  onChange={(e) => setEditForm(prev => ({ ...prev, researchInterests: e.target.value }))}
                  helperText="Comma-separated list"
                />
                <Input
                  label="LinkedIn URL"
                  type="url"
                  value={editForm.linkedinUrl}
                  onChange={(e) => setEditForm(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                />
                <Input
                  label="Website URL"
                  type="url"
                  value={editForm.websiteUrl}
                  onChange={(e) => setEditForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                />
                <div className="flex space-x-2">
                  <Button type="submit">Save Changes</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex space-x-4 border-b mb-6">
          {(['posts', 'about', 'followers', 'following'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'posts' && (
            <div className="space-y-6">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} onUpdate={loadProfile} />
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">No posts yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <Card>
              <CardContent className="p-6">
                {profile.bio && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Bio</h3>
                    <p className="text-gray-700">{profile.bio}</p>
                  </div>
                )}
                
                {profile.researchInterests && profile.researchInterests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Research Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.researchInterests.map((interest: string) => (
                        <span key={interest} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.orcid && (
                    <div>
                      <h3 className="font-semibold mb-1">ORCID</h3>
                      <a href={`https://orcid.org/${profile.orcid}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {profile.orcid}
                      </a>
                    </div>
                  )}
                  
                  {profile.googleScholarId && (
                    <div>
                      <h3 className="font-semibold mb-1">Google Scholar</h3>
                      <a href={`https://scholar.google.com/citations?user=${profile.googleScholarId}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View Profile
                      </a>
                    </div>
                  )}
                  
                  {profile.linkedinUrl && (
                    <div>
                      <h3 className="font-semibold mb-1">LinkedIn</h3>
                      <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View Profile
                      </a>
                    </div>
                  )}
                  
                  {profile.websiteUrl && (
                    <div>
                      <h3 className="font-semibold mb-1">Website</h3>
                      <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {profile.websiteUrl}
                      </a>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 pt-6 border-t text-sm text-gray-500">
                  <p>Member since {formatDate(profile.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'followers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {followers.length > 0 ? (
                followers.map((follower: any) => (
                  <Card key={follower.id} hover>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                            {getInitials(follower.name)}
                          </div>
                          <div>
                            <p className="font-semibold">{follower.name}</p>
                            <p className="text-sm text-gray-500">{follower.role}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No followers yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'following' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {following.length > 0 ? (
                following.map((user: any) => (
                  <Card key={user.id} hover>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.role}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">Not following anyone yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}