'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Folder, Plus, Search, Users, Calendar, GitBranch, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { useAuth } from '@/contexts/AuthContext'

interface User {
  id: string
  name: string
  avatar: string | null
  role: string
}

interface ProjectMember {
  id: string
  role: string
  user: User
}

interface Project {
  id: string
  title: string
  description: string
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  visibility: 'PUBLIC' | 'PRIVATE'
  startDate: string | null
  endDate: string | null
  createdAt: string
  members: ProjectMember[]
  _count: {
    members: number
    posts: number
    papers: number
  }
}

export default function ProjectsPage() {
  const { token } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'all' | 'ACTIVE' | 'COMPLETED'>('all')
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const debouncedSearch = useDebounce(searchQuery, 500)

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!token) return

      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('myProjects', 'true')
        params.append('limit', '100')
        if (debouncedSearch) {
          params.append('search', debouncedSearch)
        }
        if (selectedTab !== 'all') {
          params.append('status', selectedTab)
        }

        const response = await fetch(`/api/projects?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects || [])
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [token, debouncedSearch, selectedTab])

  // Calculate stats
  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'ACTIVE').length
  const completedProjects = projects.filter(p => p.status === 'COMPLETED').length
  const totalCollaborators = projects.reduce((sum, p) => sum + p._count.members, 0)

  if (isLoading && !token) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-scholar-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Research Projects</h1>
          <p className="text-gray-600 mt-1">Manage your collaborative research projects</p>
        </div>
        <Button className="bg-scholar-600 hover:bg-scholar-700">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold">{isLoading ? '-' : totalProjects}</p>
              </div>
              <Folder className="h-8 w-8 text-scholar-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">{isLoading ? '-' : activeProjects}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{isLoading ? '-' : completedProjects}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collaborators</p>
                <p className="text-2xl font-bold">{isLoading ? '-' : totalCollaborators}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {isLoading && searchQuery && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Projects</TabsTrigger>
          <TabsTrigger value="ACTIVE">Active</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-scholar-600" />
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                <p className="text-gray-600">
                  {searchQuery ? 'Try a different search term' : 'Create your first project to get started'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge
                              className={
                                project.status === 'ACTIVE'
                                  ? 'bg-blue-100 text-blue-700'
                                  : project.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }
                            >
                              {project.status.toLowerCase()}
                            </Badge>
                            {project.endDate && (
                              <span className="text-sm text-gray-500 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Due {new Date(project.endDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <CardTitle className="text-xl">{project.title}</CardTitle>
                          <CardDescription className="mt-2">
                            {project.description}
                          </CardDescription>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {project._count.members} member{project._count.members !== 1 ? 's' : ''}
                            </span>
                            {project._count.papers > 0 && (
                              <span className="flex items-center">
                                <GitBranch className="h-4 w-4 mr-1" />
                                {project._count.papers} paper{project._count.papers !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline">View Project</Button>
                      </div>
                    </CardHeader>
                    {project.members.length > 0 && (
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {project.members.slice(0, 5).map((member, i) => (
                              <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                                <AvatarImage src={member.user.avatar || undefined} />
                                <AvatarFallback className="bg-gray-200 text-xs">
                                  {member.user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            Lead: {project.members[0]?.user.name || 'Unknown'}
                          </span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
