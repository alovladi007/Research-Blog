'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { withAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'

interface Project {
  id: string
  title: string
  description: string
  status: string
  visibility: string
  startDate?: Date
  endDate?: Date
  members: any[]
  _count: {
    members: number
    posts: number
    papers: number
  }
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    loadProjects()
  }, [filter, searchQuery])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.append('status', filter === 'active' ? 'ACTIVE' : 'COMPLETED')
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }
      
      const response = await fetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newProject),
      })
      
      if (response.ok) {
        setShowCreateForm(false)
        setNewProject({
          title: '',
          description: '',
          status: 'ACTIVE',
          visibility: 'PUBLIC',
          startDate: '',
          endDate: '',
        })
        loadProjects()
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleJoinProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({}),
      })
      
      if (response.ok) {
        loadProjects()
      }
    } catch (error) {
      console.error('Failed to join project:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Research Projects</h1>
          <Button onClick={() => setShowCreateForm(true)}>
            Create Project
          </Button>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="search"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                {(['all', 'active', 'completed'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={filter === status ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Project Form */}
        {showCreateForm && (
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-xl font-semibold">Create New Project</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <Input
                  label="Project Title"
                  value={newProject.title}
                  onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
                <Textarea
                  label="Description"
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={newProject.status}
                      onChange={(e) => setNewProject(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visibility
                    </label>
                    <select
                      value={newProject.visibility}
                      onChange={(e) => setNewProject(prev => ({ ...prev, visibility: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="PRIVATE">Private</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Start Date (Optional)"
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                  <Input
                    label="End Date (Optional)"
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit">Create Project</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : projects.length > 0 ? (
            projects.map((project) => (
              <Card key={project.id} hover>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold flex-1">{project.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                  
                  {(project.startDate || project.endDate) && (
                    <div className="text-xs text-gray-500 mb-3">
                      {project.startDate && (
                        <span>Started: {formatDate(project.startDate)}</span>
                      )}
                      {project.startDate && project.endDate && ' • '}
                      {project.endDate && (
                        <span>Ends: {formatDate(project.endDate)}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>👥 {project._count.members} members</span>
                    <span>📄 {project._count.papers} papers</span>
                    <span>📝 {project._count.posts} posts</span>
                  </div>
                  
                  {/* Project Lead */}
                  {project.members.length > 0 && (
                    <div className="text-sm text-gray-600 mb-4">
                      <span className="font-medium">Lead:</span> {project.members[0].user.name}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Link href={`/projects/${project.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Button size="sm" onClick={() => handleJoinProject(project.id)}>
                      Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="text-center py-12">
                <p className="text-gray-500 mb-2">No projects found</p>
                <p className="text-sm text-gray-400">
                  Start a new research project and invite collaborators!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default withAuth(ProjectsPage)