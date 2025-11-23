'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, Plus, Search, Download, ExternalLink, Calendar, Users, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { useAuth } from '@/contexts/AuthContext'

interface Author {
  id: string
  name: string
  email: string
  avatar: string | null
  institution: string | null
  orcid: string | null
}

interface Project {
  id: string
  title: string
}

interface Review {
  id: string
  reviewer: {
    id: string
    name: string
    avatar: string | null
  }
}

interface Paper {
  id: string
  title: string
  abstract: string
  doi: string | null
  arxivId: string | null
  publishedDate: string | null
  journal: string | null
  conference: string | null
  pdfUrl: string | null
  authors: Author[]
  project: Project | null
  reviews: Review[]
  _count: {
    reviews: number
  }
  createdAt: string
}

export default function PapersPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [papers, setPapers] = useState<Paper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const debouncedSearch = useDebounce(searchQuery, 500)

  // Fetch papers
  useEffect(() => {
    const fetchPapers = async () => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('authorId', user.id)
        if (debouncedSearch) {
          params.append('search', debouncedSearch)
        }

        const response = await fetch(`/api/papers?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setPapers(data)
        }
      } catch (error) {
        console.error('Failed to fetch papers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPapers()
  }, [user, debouncedSearch])

  // Calculate stats
  const totalPapers = papers.length
  const totalReviews = papers.reduce((sum, paper) => sum + paper._count.reviews, 0)

  // Calculate h-index: number of papers with at least h reviews
  const calculateHIndex = () => {
    const reviewCounts = papers.map(p => p._count.reviews).sort((a, b) => b - a)
    let hIndex = 0
    for (let i = 0; i < reviewCounts.length; i++) {
      if (reviewCounts[i] >= i + 1) {
        hIndex = i + 1
      } else {
        break
      }
    }
    return hIndex
  }

  // Filter papers by status
  const getFilteredPapers = () => {
    if (selectedTab === 'all') return papers
    if (selectedTab === 'published') return papers.filter(p => p.publishedDate !== null)
    if (selectedTab === 'under-review') return papers.filter(p => p.publishedDate === null)
    return papers
  }

  const filteredPapers = getFilteredPapers()

  if (isLoading && !user?.id) {
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
          <h1 className="text-3xl font-bold">Research Papers</h1>
          <p className="text-gray-600 mt-1">Manage your publications and submissions</p>
        </div>
        <Button className="bg-scholar-600 hover:bg-scholar-700">
          <Plus className="h-4 w-4 mr-2" />
          Submit Paper
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Papers</p>
                <p className="text-2xl font-bold">{isLoading ? '-' : totalPapers}</p>
              </div>
              <BookOpen className="h-8 w-8 text-scholar-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reviews</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '-' : totalReviews}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">h-index</p>
                <p className="text-2xl font-bold">{isLoading ? '-' : calculateHIndex()}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search your papers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {isLoading && searchQuery && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Papers</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="under-review">Under Review</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-scholar-600" />
            </div>
          ) : filteredPapers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No papers found</h3>
                <p className="text-gray-600">
                  {searchQuery ? 'Try a different search term' : 'Submit your first paper to get started'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPapers.map((paper, index) => {
                const status = paper.publishedDate ? 'published' : 'under-review'
                const year = paper.publishedDate
                  ? new Date(paper.publishedDate).getFullYear()
                  : new Date(paper.createdAt).getFullYear()
                const venue = paper.journal || paper.conference || 'Unpublished'

                return (
                  <motion.div
                    key={paper.id}
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
                                  status === 'published'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }
                              >
                                {status}
                              </Badge>
                              <span className="text-sm text-gray-500">{year}</span>
                              {paper.project && (
                                <Badge variant="outline" className="text-xs">
                                  {paper.project.title}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-xl">{paper.title}</CardTitle>
                            <CardDescription className="mt-2">
                              {paper.authors.map(a => a.name).join(', ')}
                            </CardDescription>
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">{venue}</span>
                              {paper.doi && (
                                <>
                                  {' • '}
                                  <span className="font-mono text-xs">DOI: {paper.doi}</span>
                                </>
                              )}
                              {paper.arxivId && (
                                <>
                                  {' • '}
                                  <span className="font-mono text-xs">arXiv: {paper.arxivId}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {paper.pdfUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-2" />
                                  PDF
                                </a>
                              </Button>
                            )}
                            {paper.doi && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={`https://doi.org/${paper.doi}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {paper._count.reviews > 0 && (
                        <CardContent>
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-1" />
                            <span className="font-medium">{paper._count.reviews}</span>
                            <span className="ml-1">review{paper._count.reviews === 1 ? '' : 's'}</span>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
