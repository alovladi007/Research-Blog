'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  TrendingUp,
  Users,
  FileText,
  Code,
  Beaker,
  BookOpen,
  Link2,
  ThumbsUp,
  Eye,
  Calendar,
  Tag
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

// Mock data for posts
const mockPosts = [
  {
    id: '1',
    author: {
      name: 'Dr. Michael Chen',
      role: 'RESEARCHER',
      institution: 'MIT',
      avatar: null,
      verified: true,
    },
    type: 'PAPER',
    title: 'Novel Approach to Quantum Error Correction Using Machine Learning',
    content: 'Excited to share our latest research on quantum error correction! We\'ve developed a new ML-based approach that reduces error rates by 45% compared to traditional methods. The preprint is now available on arXiv.',
    tags: ['quantum-computing', 'machine-learning', 'error-correction'],
    citations: 12,
    reactions: {
      likes: 234,
      insightful: 89,
      helpful: 56,
    },
    comments: 34,
    views: 1420,
    createdAt: new Date('2024-01-20T10:30:00'),
    attachments: [
      {
        type: 'paper',
        title: 'Quantum Error Correction with ML',
        url: 'https://arxiv.org/...',
      }
    ],
  },
  {
    id: '2',
    author: {
      name: 'Prof. Sarah Williams',
      role: 'PROFESSOR',
      institution: 'Stanford University',
      avatar: null,
      verified: true,
    },
    type: 'DISCUSSION',
    title: 'Thoughts on the Future of Peer Review in Academic Publishing',
    content: 'The traditional peer review system is showing its age. With the rise of preprint servers and open science initiatives, I believe we need to reimagine how we validate and disseminate research. Here are my thoughts on potential reforms:\n\n1. Open peer review with public comments\n2. Post-publication review systems\n3. AI-assisted initial screening\n4. Credit and recognition for reviewers\n\nWhat are your experiences and ideas?',
    tags: ['peer-review', 'open-science', 'academic-publishing'],
    reactions: {
      likes: 456,
      insightful: 234,
      helpful: 123,
    },
    comments: 89,
    views: 3200,
    createdAt: new Date('2024-01-19T14:20:00'),
  },
  {
    id: '3',
    author: {
      name: 'Emma Rodriguez',
      role: 'STUDENT',
      institution: 'UC Berkeley',
      avatar: null,
      verified: true,
    },
    type: 'QUESTION',
    title: 'Best practices for managing large-scale genomic datasets?',
    content: 'Working on my PhD thesis analyzing genomic data from 10,000+ samples. The dataset is approaching 5TB and traditional tools are struggling. Looking for advice on:\n\n- Efficient storage solutions\n- Parallel processing frameworks\n- Memory-efficient algorithms\n\nAny recommendations from fellow bioinformaticians?',
    tags: ['bioinformatics', 'big-data', 'genomics'],
    reactions: {
      likes: 123,
      helpful: 89,
    },
    comments: 45,
    views: 890,
    createdAt: new Date('2024-01-21T09:15:00'),
  },
]

const trendingTopics = [
  { tag: 'machine-learning', count: '2.3k posts' },
  { tag: 'climate-change', count: '1.8k posts' },
  { tag: 'quantum-computing', count: '945 posts' },
  { tag: 'neuroscience', count: '823 posts' },
  { tag: 'crispr', count: '756 posts' },
]

export default function DashboardPage() {
  const [selectedTab, setSelectedTab] = useState('for-you')

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Post Card */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Avatar>
                  <AvatarFallback className="bg-scholar-100 text-scholar-700">JS</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <textarea
                    placeholder="Share your research, ask a question, or start a discussion..."
                    className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-scholar-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Paper
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Code className="h-4 w-4 mr-2" />
                        Code
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Link2 className="h-4 w-4 mr-2" />
                        Link
                      </Button>
                    </div>
                    <Button className="bg-scholar-600 hover:bg-scholar-700">
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feed Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="for-you">For You</TabsTrigger>
              <TabsTrigger value="following">Following</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-4 mt-4">
              {mockPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Avatar>
                            <AvatarImage src={post.author.avatar || undefined} />
                            <AvatarFallback className="bg-scholar-100 text-scholar-700">
                              {post.author.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{post.author.name}</h3>
                              {post.author.verified && (
                                <Badge variant="secondary" className="text-xs">Verified</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {post.author.role}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">
                              {post.author.institution} • {formatRelativeTime(post.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-3">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm">
                          {post.type === 'PAPER' && <FileText className="h-4 w-4 text-blue-600" />}
                          {post.type === 'DISCUSSION' && <MessageCircle className="h-4 w-4 text-green-600" />}
                          {post.type === 'QUESTION' && <Beaker className="h-4 w-4 text-purple-600" />}
                          <span className="font-medium text-gray-600">{post.type}</span>
                        </div>

                        <h2 className="text-lg font-semibold">{post.title}</h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>

                        {post.attachments && post.attachments.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            {post.attachments.map((attachment, i) => (
                              <div key={i} className="flex items-center space-x-2">
                                <BookOpen className="h-4 w-4 text-scholar-600" />
                                <a href={attachment.url} className="text-sm text-scholar-600 hover:underline">
                                  {attachment.title}
                                </a>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-3 border-t">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-4">
                          <Button variant="ghost" size="sm" className="text-gray-600">
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            {post.reactions.likes}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-600">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            {post.comments}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-600">
                            <Share2 className="h-4 w-4 mr-1" />
                            Share
                          </Button>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {post.views.toLocaleString()}
                          </span>
                          {post.citations && (
                            <span className="flex items-center">
                              <BookOpen className="h-4 w-4 mr-1" />
                              {post.citations} citations
                            </span>
                          )}
                          <Button variant="ghost" size="icon">
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trending Topics */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-scholar-600" />
                Trending Topics
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {trendingTopics.map((topic, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">#{topic.tag}</p>
                    <p className="text-xs text-gray-500">{topic.count}</p>
                  </div>
                  <Button variant="ghost" size="sm">Follow</Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Suggested Connections */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center">
                <Users className="h-5 w-5 mr-2 text-scholar-600" />
                Suggested Connections
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Dr. Lisa Park', role: 'AI Researcher', institution: 'Google Research' },
                { name: 'Prof. James Wilson', role: 'Neuroscientist', institution: 'Johns Hopkins' },
                { name: 'Dr. Aisha Patel', role: 'Climate Scientist', institution: 'NOAA' },
              ].map((person, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-scholar-100 text-scholar-700 text-sm">
                        {person.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{person.name}</p>
                      <p className="text-xs text-gray-500">{person.role}</p>
                      <p className="text-xs text-gray-500">{person.institution}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Your Impact This Week</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profile Views</span>
                <span className="font-semibold">1,234</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Post Engagement</span>
                <span className="font-semibold">+23%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">New Citations</span>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Collaboration Requests</span>
                <span className="font-semibold">3</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}