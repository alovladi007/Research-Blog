'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, FileText, Plus, Search, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export interface Citation {
  id: string
  type: 'article' | 'book' | 'conference' | 'thesis' | 'website'
  authors: string[]
  title: string
  year: number
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  doi?: string
  url?: string
  publisher?: string
  conference?: string
  accessed?: Date
}

interface CitationManagerProps {
  citations: Citation[]
  onAddCitation: (citation: Citation) => void
  onRemoveCitation: (id: string) => void
}

export function CitationManager({ citations, onAddCitation, onRemoveCitation }: CitationManagerProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<'apa' | 'mla' | 'chicago'>('apa')

  const formatCitationAPA = (citation: Citation): string => {
    const authors = citation.authors.join(', ')
    const year = `(${citation.year})`
    const title = citation.type === 'article' ? citation.title : `*${citation.title}*`
    
    if (citation.type === 'article' && citation.journal) {
      const journal = `*${citation.journal}*`
      const volume = citation.volume ? `, ${citation.volume}` : ''
      const issue = citation.issue ? `(${citation.issue})` : ''
      const pages = citation.pages ? `, ${citation.pages}` : ''
      const doi = citation.doi ? ` https://doi.org/${citation.doi}` : ''
      
      return `${authors} ${year}. ${title}. ${journal}${volume}${issue}${pages}.${doi}`
    }
    
    if (citation.type === 'book' && citation.publisher) {
      return `${authors} ${year}. ${title}. ${citation.publisher}.`
    }
    
    return `${authors} ${year}. ${title}.`
  }

  const formatCitationMLA = (citation: Citation): string => {
    const firstAuthor = citation.authors[0]
    const otherAuthors = citation.authors.slice(1).join(', ')
    const authors = otherAuthors ? `${firstAuthor}, et al.` : firstAuthor
    
    if (citation.type === 'article' && citation.journal) {
      const pages = citation.pages ? `: ${citation.pages}` : ''
      return `${authors}. "${citation.title}." ${citation.journal}, vol. ${citation.volume}, no. ${citation.issue}, ${citation.year}${pages}.`
    }
    
    if (citation.type === 'book' && citation.publisher) {
      return `${authors}. ${citation.title}. ${citation.publisher}, ${citation.year}.`
    }
    
    return `${authors}. "${citation.title}." ${citation.year}.`
  }

  const formatCitationChicago = (citation: Citation): string => {
    const authors = citation.authors.join(', ')
    
    if (citation.type === 'article' && citation.journal) {
      const pages = citation.pages ? `: ${citation.pages}` : ''
      return `${authors}. "${citation.title}." ${citation.journal} ${citation.volume}, no. ${citation.issue} (${citation.year})${pages}.`
    }
    
    if (citation.type === 'book' && citation.publisher) {
      return `${authors}. ${citation.title}. ${citation.publisher}, ${citation.year}.`
    }
    
    return `${authors}. "${citation.title}." ${citation.year}.`
  }

  const formatCitation = (citation: Citation): string => {
    switch (selectedFormat) {
      case 'apa':
        return formatCitationAPA(citation)
      case 'mla':
        return formatCitationMLA(citation)
      case 'chicago':
        return formatCitationChicago(citation)
      default:
        return formatCitationAPA(citation)
    }
  }

  const copyCitation = (citation: Citation) => {
    const formatted = formatCitation(citation)
    navigator.clipboard.writeText(formatted)
    toast({
      title: 'Citation copied',
      description: 'The citation has been copied to your clipboard',
    })
  }

  const copyAllCitations = () => {
    const formatted = citations.map(c => formatCitation(c)).join('\n\n')
    navigator.clipboard.writeText(formatted)
    toast({
      title: 'All citations copied',
      description: `${citations.length} citations have been copied to your clipboard`,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Manage Citations ({citations.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Citation Manager</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manage" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manage">Manage</TabsTrigger>
            <TabsTrigger value="add">Add Citation</TabsTrigger>
            <TabsTrigger value="search">Search Papers</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-4">
            <div className="flex items-center justify-between">
              <Select value={selectedFormat} onValueChange={(v: any) => setSelectedFormat(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apa">APA</SelectItem>
                  <SelectItem value="mla">MLA</SelectItem>
                  <SelectItem value="chicago">Chicago</SelectItem>
                </SelectContent>
              </Select>
              
              {citations.length > 0 && (
                <Button onClick={copyAllCitations} size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {citations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No citations added yet</p>
              ) : (
                citations.map((citation) => (
                  <Card key={citation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{citation.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {citation.authors.join(', ')} • {citation.year}
                          </p>
                          <p className="text-xs mt-2 font-mono bg-gray-50 p-2 rounded">
                            {formatCitation(citation)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCitation(citation)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveCitation(citation.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <AddCitationForm onAdd={(citation) => {
              onAddCitation(citation)
              toast({
                title: 'Citation added',
                description: 'The citation has been added to your list',
              })
            }} />
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search papers by title, author, or DOI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Search integration with arXiv, PubMed, and Semantic Scholar coming soon...
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function AddCitationForm({ onAdd }: { onAdd: (citation: Citation) => void }) {
  const [formData, setFormData] = useState<Partial<Citation>>({
    type: 'article',
    authors: [''],
    title: '',
    year: new Date().getFullYear(),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const citation: Citation = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData as Citation,
    }
    onAdd(citation)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Type</Label>
        <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="article">Journal Article</SelectItem>
            <SelectItem value="book">Book</SelectItem>
            <SelectItem value="conference">Conference Paper</SelectItem>
            <SelectItem value="thesis">Thesis</SelectItem>
            <SelectItem value="website">Website</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Title</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Authors (comma separated)</Label>
        <Input
          value={formData.authors?.join(', ')}
          onChange={(e) => setFormData({ ...formData, authors: e.target.value.split(',').map(a => a.trim()) })}
          required
        />
      </div>

      <div>
        <Label>Year</Label>
        <Input
          type="number"
          value={formData.year}
          onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
          required
        />
      </div>

      {formData.type === 'article' && (
        <>
          <div>
            <Label>Journal</Label>
            <Input
              value={formData.journal || ''}
              onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Volume</Label>
              <Input
                value={formData.volume || ''}
                onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
              />
            </div>
            <div>
              <Label>Issue</Label>
              <Input
                value={formData.issue || ''}
                onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
              />
            </div>
            <div>
              <Label>Pages</Label>
              <Input
                value={formData.pages || ''}
                onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      <div>
        <Label>DOI (optional)</Label>
        <Input
          value={formData.doi || ''}
          onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Citation
      </Button>
    </form>
  )
}