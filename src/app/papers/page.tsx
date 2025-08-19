'use client'

import { useState, useEffect } from 'react'
import { useAuth, withAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'

interface Paper {
  id: string
  title: string
  abstract: string
  doi?: string
  arxivId?: string
  journal?: string
  conference?: string
  publishedDate: Date
  pdfUrl?: string
  citations: number
  authors: any[]
  reviews: any[]
  _count: {
    reviews: number
  }
}

function PapersPage() {
  const { user } = useAuth()
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [newPaper, setNewPaper] = useState({
    title: '',
    abstract: '',
    doi: '',
    arxivId: '',
    journal: '',
    conference: '',
    pdfUrl: '',
  })
  
  const [newReview, setNewReview] = useState({
    content: '',
    rating: 5,
  })

  useEffect(() => {
    loadPapers()
  }, [searchQuery])

  const loadPapers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(`/api/papers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPapers(data.papers)
      }
    } catch (error) {
      console.error('Failed to load papers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitPaper = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newPaper),
      })
      
      if (response.ok) {
        setShowSubmitForm(false)
        setNewPaper({
          title: '',
          abstract: '',
          doi: '',
          arxivId: '',
          journal: '',
          conference: '',
          pdfUrl: '',
        })
        loadPapers()
      }
    } catch (error) {
      console.error('Failed to submit paper:', error)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaper) return
    
    try {
      const response = await fetch(`/api/papers/${selectedPaper.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newReview),
      })
      
      if (response.ok) {
        setShowReviewForm(false)
        setNewReview({ content: '', rating: 5 })
        setSelectedPaper(null)
        loadPapers()
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Research Papers</h1>
          <Button onClick={() => setShowSubmitForm(true)}>
            Submit Paper
          </Button>
        </div>

        {/* Search Bar */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <Input
              type="search"
              placeholder="Search papers by title, abstract, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Submit Paper Form */}
        {showSubmitForm && (
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-xl font-semibold">Submit New Paper</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPaper} className="space-y-4">
                <Input
                  label="Title"
                  value={newPaper.title}
                  onChange={(e) => setNewPaper(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
                <Textarea
                  label="Abstract"
                  value={newPaper.abstract}
                  onChange={(e) => setNewPaper(prev => ({ ...prev, abstract: e.target.value }))}
                  rows={4}
                  required
                  helperText="Minimum 100 characters"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="DOI (Optional)"
                    value={newPaper.doi}
                    onChange={(e) => setNewPaper(prev => ({ ...prev, doi: e.target.value }))}
                    placeholder="10.1234/example"
                  />
                  <Input
                    label="arXiv ID (Optional)"
                    value={newPaper.arxivId}
                    onChange={(e) => setNewPaper(prev => ({ ...prev, arxivId: e.target.value }))}
                    placeholder="2101.00000"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Journal (Optional)"
                    value={newPaper.journal}
                    onChange={(e) => setNewPaper(prev => ({ ...prev, journal: e.target.value }))}
                  />
                  <Input
                    label="Conference (Optional)"
                    value={newPaper.conference}
                    onChange={(e) => setNewPaper(prev => ({ ...prev, conference: e.target.value }))}
                  />
                </div>
                <Input
                  label="PDF URL (Optional)"
                  type="url"
                  value={newPaper.pdfUrl}
                  onChange={(e) => setNewPaper(prev => ({ ...prev, pdfUrl: e.target.value }))}
                />
                <div className="flex space-x-2">
                  <Button type="submit">Submit Paper</Button>
                  <Button type="button" variant="outline" onClick={() => setShowSubmitForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Review Form Modal */}
        {showReviewForm && selectedPaper && (
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-xl font-semibold">Review: {selectedPaper.title}</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <Textarea
                  label="Review Content"
                  value={newReview.content}
                  onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  required
                  helperText="Provide constructive feedback on the paper"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rating
                  </label>
                  <select
                    value={newReview.rating}
                    onChange={(e) => setNewReview(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5].map(rating => (
                      <option key={rating} value={rating}>
                        {rating} - {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit">Submit Review</Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowReviewForm(false)
                    setSelectedPaper(null)
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Papers List */}
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : papers.length > 0 ? (
            papers.map((paper) => (
              <Card key={paper.id} hover>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{paper.title}</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-2">
                        {paper.authors.map((author, idx) => (
                          <span key={author.id}>
                            {author.name}{idx < paper.authors.length - 1 && ','}
                          </span>
                        ))}
                      </div>
                      {(paper.journal || paper.conference) && (
                        <p className="text-sm text-gray-500">
                          {paper.journal || paper.conference} • {formatDate(paper.publishedDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {paper.pdfUrl && (
                        <a
                          href={paper.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          📄 PDF
                        </a>
                      )}
                      {paper.doi && (
                        <a
                          href={`https://doi.org/${paper.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          🔗 DOI
                        </a>
                      )}
                      {paper.arxivId && (
                        <a
                          href={`https://arxiv.org/abs/${paper.arxivId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          📚 arXiv
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4 line-clamp-3">{paper.abstract}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>📊 {paper.citations} citations</span>
                      <span>⭐ {paper._count.reviews} reviews</span>
                      {paper.reviews.length > 0 && (
                        <span>
                          Rating: {(paper.reviews.reduce((acc, r) => acc + r.rating, 0) / paper.reviews.length).toFixed(1)}/5
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPaper(paper)
                        setShowReviewForm(true)
                      }}
                    >
                      Write Review
                    </Button>
                  </div>
                  
                  {/* Reviews Section */}
                  {paper.reviews.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">Recent Reviews</h4>
                      <div className="space-y-2">
                        {paper.reviews.slice(0, 2).map((review) => (
                          <div key={review.id} className="bg-gray-50 p-3 rounded">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{review.reviewer.name}</span>
                              <span className="text-sm text-gray-500">
                                {'⭐'.repeat(review.rating)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">{review.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 mb-2">No papers found</p>
                <p className="text-sm text-gray-400">
                  Be the first to submit a paper!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default withAuth(PapersPage)