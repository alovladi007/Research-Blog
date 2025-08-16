'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users,
  Plus,
  Search,
  Lock,
  Globe,
  Settings,
  UserPlus,
  MessageSquare,
  FileText,
  Calendar,
  TrendingUp,
  Shield,
  Star,
  MoreVertical,
  Mail
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// Mock data for groups
const mockGroups = [
  {
    id: '1',
    name: 'Quantum Computing Research',
    description: 'Collaborative research on quantum algorithms and error correction',
    avatar: null,
    isPrivate: false,
    memberCount: 45,
    postCount: 234,
    role: 'ADMIN',
    tags: ['quantum-computing', 'algorithms', 'physics'],
    lastActivity: new Date('2024-01-21T10:00:00'),
    members: [
      { name: 'Dr. Alice Chen', role: 'ADMIN', institution: 'MIT' },
      { name: 'Prof. Bob Wilson', role: 'MODERATOR', institution: 'Stanford' },
      { name: 'Emma Davis', role: 'MEMBER', institution: 'Berkeley' },
    ]
  },
  {
    id: '2',
    name: 'Climate Science Initiative',
    description: 'Interdisciplinary group studying climate change impacts',
    avatar: null,
    isPrivate: true,
    memberCount: 128,
    postCount: 567,
    role: 'MEMBER',
    tags: ['climate-science', 'sustainability', 'policy'],
    lastActivity: new Date('2024-01-20T15:30:00'),
    members: [
      { name: 'Dr. Sarah Green', role: 'ADMIN', institution: 'NOAA' },
      { name: 'Prof. James Brown', role: 'MEMBER', institution: 'Yale' },
    ]
  },
  {
    id: '3',
    name: 'AI Ethics Working Group',
    description: 'Discussing ethical implications of artificial intelligence',
    avatar: null,
    isPrivate: false,
    memberCount: 89,
    postCount: 345,
    role: 'MODERATOR',
    tags: ['ai-ethics', 'philosophy', 'policy'],
    lastActivity: new Date('2024-01-19T09:15:00'),
    members: [
      { name: 'Prof. Lisa Park', role: 'ADMIN', institution: 'Oxford' },
      { name: 'Dr. Michael Lee', role: 'MODERATOR', institution: 'CMU' },
    ]
  }
]

const suggestedGroups = [
  {
    id: '4',
    name: 'Neuroscience Frontiers',
    description: 'Exploring cutting-edge neuroscience research',
    memberCount: 234,
    tags: ['neuroscience', 'brain', 'cognition']
  },
  {
    id: '5',
    name: 'Open Science Advocates',
    description: 'Promoting open access and reproducible research',
    memberCount: 456,
    tags: ['open-science', 'reproducibility', 'publishing']
  }
]

export default function GroupsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('my-groups')
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    isPrivate: false,
    tags: ''
  })

  const handleCreateGroup = () => {
    toast({
      title: 'Group created',
      description: `"${newGroup.name}" has been created successfully.`,
    })
    setCreateGroupOpen(false)
    setNewGroup({ name: '', description: '', isPrivate: false, tags: '' })
  }

  const handleJoinGroup = (groupName: string) => {
    toast({
      title: 'Join request sent',
      description: `Your request to join "${groupName}" has been sent.`,
    })
  }

  const handleInviteMember = (email: string) => {
    toast({
      title: 'Invitation sent',
      description: `An invitation has been sent to ${email}.`,
    })
    setInviteMemberOpen(false)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Research Groups</h1>
          <p className="text-gray-600 mt-1">Collaborate with researchers in your field</p>
        </div>
        <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
          <DialogTrigger asChild>
            <Button className="bg-scholar-600 hover:bg-scholar-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create Research Group</DialogTitle>
              <DialogDescription>
                Start a new collaborative research group for your field of study.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Quantum Computing Research"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Describe the group's research focus and goals..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={newGroup.tags}
                  onChange={(e) => setNewGroup({ ...newGroup, tags: e.target.value })}
                  placeholder="quantum-computing, algorithms, physics"
                />
              </div>
              <div className="flex items-center space-x-4">
                <Label>Privacy</Label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="privacy"
                      checked={!newGroup.isPrivate}
                      onChange={() => setNewGroup({ ...newGroup, isPrivate: false })}
                      className="mr-2"
                    />
                    <Globe className="h-4 w-4 mr-1" />
                    Public
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="privacy"
                      checked={newGroup.isPrivate}
                      onChange={() => setNewGroup({ ...newGroup, isPrivate: true })}
                      className="mr-2"
                    />
                    <Lock className="h-4 w-4 mr-1" />
                    Private
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateGroupOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} className="bg-scholar-600 hover:bg-scholar-700">
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search groups by name, topic, or institution..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="my-groups">My Groups</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="my-groups" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {mockGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-scholar-100 text-scholar-700">
                            {group.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-xl">{group.name}</CardTitle>
                            {group.isPrivate ? (
                              <Lock className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Globe className="h-4 w-4 text-gray-500" />
                            )}
                            {group.role === 'ADMIN' && (
                              <Badge className="bg-scholar-600">Admin</Badge>
                            )}
                            {group.role === 'MODERATOR' && (
                              <Badge variant="secondary">Moderator</Badge>
                            )}
                          </div>
                          <CardDescription className="mt-1">
                            {group.description}
                          </CardDescription>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {group.memberCount} members
                            </span>
                            <span className="flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              {group.postCount} posts
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Active {new Date(group.lastActivity).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {group.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(group.role === 'ADMIN' || group.role === 'MODERATOR') && (
                          <Dialog open={inviteMemberOpen && selectedGroup?.id === group.id} 
                                  onOpenChange={(open) => {
                                    setInviteMemberOpen(open)
                                    if (open) setSelectedGroup(group)
                                  }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Invite
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Invite Members</DialogTitle>
                                <DialogDescription>
                                  Invite researchers to join {group.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label htmlFor="email">Email Address</Label>
                                  <Input
                                    id="email"
                                    type="email"
                                    placeholder="researcher@university.edu"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="message">Message (optional)</Label>
                                  <Textarea
                                    id="message"
                                    placeholder="Add a personal message..."
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setInviteMemberOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={() => handleInviteMember('researcher@university.edu')} 
                                        className="bg-scholar-600 hover:bg-scholar-700">
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Invitation
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-6">
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 3).map((member, i) => (
                          <Avatar key={i} className="h-8 w-8 border-2 border-white">
                            <AvatarFallback className="bg-gray-200 text-xs">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {group.memberCount > 3 && (
                          <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                            <span className="text-xs font-medium">+{group.memberCount - 3}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">
                          Recent members from {group.members[0].institution}, {group.members[1].institution}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="discover" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {suggestedGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-scholar-100 text-scholar-700">
                            {group.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-xl">{group.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {group.description}
                          </CardDescription>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {group.memberCount} members
                            </span>
                            <span className="flex items-center">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Growing
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {group.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => handleJoinGroup(group.name)} 
                              className="bg-scholar-600 hover:bg-scholar-700">
                        Join Group
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4 mt-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No pending invitations</p>
                <p className="text-sm mt-2">Group invitations will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}