# ScholarHub API Documentation

Base URL: `http://localhost:3200/api` (development)

## Authentication

All protected endpoints require a JWT token in one of two formats:

**Option 1: Cookie (Recommended)**
```
Cookie: auth-token=<JWT_TOKEN>
```

**Option 2: Authorization Header**
```
Authorization: Bearer <JWT_TOKEN>
```

## Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Auth endpoints | 5 requests | 15 minutes |
| Upload endpoints | 10 requests | 1 minute |
| General API | 60 requests | 1 minute |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Authentication Endpoints

### Sign Up
```http
POST /api/auth/signup
```

**Request Body:**
```json
{
  "email": "user@university.edu",
  "password": "password123",
  "name": "John Doe",
  "role": "STUDENT",  // STUDENT | RESEARCHER | PROFESSOR
  "institution": "MIT",
  "department": "Computer Science",
  "bio": "PhD student in AI",
  "researchInterests": ["AI", "Machine Learning"]
}
```

**Response:** `201 Created`
```json
{
  "message": "User created successfully",
  "user": {
    "id": "user_123",
    "email": "user@university.edu",
    "name": "John Doe",
    "role": "STUDENT",
    "verificationStatus": "VERIFIED"
  },
  "token": "eyJhbGci...",
  "verified": true
}
```

### Sign In
```http
POST /api/auth/signin
```

**Request Body:**
```json
{
  "email": "user@university.edu",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Signin successful",
  "user": { /* user object */ },
  "token": "eyJhbGci..."
}
```

### Get Session
```http
GET /api/auth/session
```
**Auth:** Required

**Response:** `200 OK`
```json
{
  "user": { /* user object */ }
}
```

### Verify Email
```http
GET /api/auth/verify?token=<verification_token>
POST /api/auth/verify
```

**Request Body (POST):**
```json
{
  "token": "verification_token_here"
}
```

**Response:** `200 OK`
```json
{
  "message": "Email verified successfully",
  "verified": true
}
```

---

## Users Endpoints

### Get Users
```http
GET /api/users
```

**Response:** `200 OK`
```json
[
  {
    "id": "user_123",
    "name": "John Doe",
    "email": "user@university.edu",
    "avatar": "https://...",
    "role": "STUDENT",
    "institution": "MIT",
    "verificationStatus": "VERIFIED"
  }
]
```

### Get User by ID
```http
GET /api/users/:id
```

**Response:** `200 OK`
```json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "user@university.edu",
  "bio": "PhD student in AI",
  "role": "STUDENT",
  "institution": "MIT",
  "department": "Computer Science",
  "researchInterests": ["AI", "Machine Learning"],
  "_count": {
    "posts": 5,
    "followers": 10,
    "following": 8
  }
}
```

### Update User
```http
PUT /api/users/:id
```
**Auth:** Required (own profile only)

**Request Body:**
```json
{
  "name": "Jane Doe",
  "bio": "Updated bio",
  "institution": "Stanford",
  "researchInterests": ["AI", "NLP"]
}
```

### Follow/Unfollow User
```http
POST /api/users/:id/follow
```
**Auth:** Required

**Response:** `200 OK`
```json
{
  "following": true  // or false if unfollowed
}
```

### Get Followers
```http
GET /api/users/:id/followers
```

### Get Following
```http
GET /api/users/:id/following
```

---

## Posts Endpoints

### Get Posts
```http
GET /api/posts?type=ARTICLE&author=user_123&group=group_456&tags=AI,ML
```

**Query Parameters:**
- `type`: Filter by post type (ARTICLE, QUESTION, DISCUSSION, PAPER, ANNOUNCEMENT)
- `author`: Filter by author ID
- `group`: Filter by group ID
- `project`: Filter by project ID
- `tags`: Comma-separated tags

**Response:** `200 OK`
```json
[
  {
    "id": "post_123",
    "title": "Introduction to AI",
    "content": "Post content...",
    "type": "ARTICLE",
    "tags": ["AI", "Machine Learning"],
    "author": { /* user object */ },
    "_count": {
      "comments": 5,
      "reactions": 12
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Post
```http
POST /api/posts
```
**Auth:** Required

**Request Body:**
```json
{
  "title": "My Research Post",
  "content": "Post content here...",
  "type": "ARTICLE",
  "tags": ["AI", "Research"],
  "latex": false,
  "groupId": "group_123",  // optional
  "projectId": "project_456"  // optional
}
```

### Get Post by ID
```http
GET /api/posts/:id
```

### Update Post
```http
PUT /api/posts/:id
```
**Auth:** Required (author only)

### Delete Post
```http
DELETE /api/posts/:id
```
**Auth:** Required (author only)

### Add Comment
```http
POST /api/posts/:id/comments
```
**Auth:** Required

**Request Body:**
```json
{
  "content": "Great post!",
  "parentId": "comment_123"  // optional, for replies
}
```

### Add Reaction
```http
POST /api/posts/:id/reactions
```
**Auth:** Required

**Request Body:**
```json
{
  "type": "LIKE"  // LIKE | INSIGHTFUL | HELPFUL | CELEBRATE
}
```

**Response:** `200 OK`
```json
{
  "action": "added",  // or "removed" if toggled off
  "reaction": { /* reaction object */ }
}
```

### Toggle Bookmark
```http
POST /api/posts/:id/bookmark
```
**Auth:** Required

**Response:** `200 OK`
```json
{
  "bookmarked": true  // or false if removed
}
```

---

## Papers Endpoints

### Get Papers
```http
GET /api/papers?search=quantum&author=user_123&project=project_456
```

**Query Parameters:**
- `search`: Search in title, abstract, journal, conference
- `author`: Filter by author ID
- `project`: Filter by project ID

**Response:** `200 OK`
```json
[
  {
    "id": "paper_123",
    "title": "Quantum Computing Advances",
    "abstract": "Abstract text...",
    "doi": "10.1234/example",
    "arxivId": "2024.12345",
    "publishedDate": "2024-01-01",
    "journal": "Nature",
    "citations": 150,
    "authors": [/* user objects */],
    "_count": {
      "reviews": 3
    }
  }
]
```

### Create Paper
```http
POST /api/papers
```
**Auth:** Required

**Request Body:**
```json
{
  "title": "My Research Paper",
  "abstract": "Paper abstract...",
  "doi": "10.1234/example",
  "arxivId": "2024.12345",
  "publishedDate": "2024-01-01",
  "journal": "Nature",
  "conference": "NeurIPS 2024",
  "pdfUrl": "https://...",
  "projectId": "project_123",
  "authorIds": ["user_123", "user_456"]
}
```

### Get Paper by ID
```http
GET /api/papers/:id
```

### Update Paper
```http
PUT /api/papers/:id
```
**Auth:** Required (authors only)

### Delete Paper
```http
DELETE /api/papers/:id
```
**Auth:** Required (authors only)

### Get Reviews
```http
GET /api/papers/:id/reviews?publicOnly=true
```

**Response:** `200 OK`
```json
{
  "reviews": [
    {
      "id": "review_123",
      "content": "Excellent work!",
      "rating": 5,
      "isPublic": true,
      "reviewer": { /* user object */ },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "stats": {
    "total": 3,
    "averageRating": 4.5
  }
}
```

### Submit Review
```http
POST /api/papers/:id/reviews
```
**Auth:** Required (not paper author)

**Request Body:**
```json
{
  "content": "Excellent research with clear methodology",
  "rating": 5,
  "isPublic": true
}
```

---

## Groups Endpoints

### Get Groups
```http
GET /api/groups?search=AI&limit=20
```

**Response:** `200 OK`
```json
[
  {
    "id": "group_123",
    "name": "AI Research Group",
    "description": "Group for AI researchers",
    "avatar": "https://...",
    "isPrivate": false,
    "_count": {
      "members": 25,
      "posts": 100
    }
  }
]
```

### Create Group
```http
POST /api/groups
```
**Auth:** Required

**Request Body:**
```json
{
  "name": "My Research Group",
  "description": "Group description",
  "isPrivate": false
}
```

### Get Group by ID
```http
GET /api/groups/:id
```

### Join Group
```http
POST /api/groups/:id/members
```
**Auth:** Required

### Leave Group
```http
DELETE /api/groups/:id/members
```
**Auth:** Required

---

## Projects Endpoints

### Get Projects
```http
GET /api/projects?status=ACTIVE&visibility=PUBLIC
```

**Query Parameters:**
- `status`: ACTIVE | COMPLETED | ARCHIVED
- `visibility`: PUBLIC | PRIVATE

**Response:** `200 OK`
```json
[
  {
    "id": "project_123",
    "title": "AI Safety Research",
    "description": "Research on AI alignment",
    "status": "ACTIVE",
    "visibility": "PUBLIC",
    "_count": {
      "members": 5,
      "papers": 3
    }
  }
]
```

### Create Project
```http
POST /api/projects
```
**Auth:** Required

**Request Body:**
```json
{
  "title": "My Research Project",
  "description": "Project description",
  "status": "ACTIVE",
  "visibility": "PUBLIC",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

### Get Project Members
```http
GET /api/projects/:id/members
```

**Response:** `200 OK`
```json
[
  {
    "id": "member_123",
    "role": "LEAD",
    "user": { /* user object */ },
    "joinedAt": "2024-01-01T00:00:00Z"
  }
]
```

### Add Member
```http
POST /api/projects/:id/members
```
**Auth:** Required (project lead only)

**Request Body:**
```json
{
  "userId": "user_456",
  "role": "MEMBER"  // LEAD | MEMBER | ADVISOR
}
```

### Remove Member
```http
DELETE /api/projects/:id/members?userId=user_456
```
**Auth:** Required (project lead or self)

---

## Messaging Endpoints

### Get Messages
```http
GET /api/messages/:roomId?limit=50&before=message_123
```
**Auth:** Required (participant only)

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "id": "message_123",
      "content": "Hello!",
      "sender": { /* user object */ },
      "read": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "hasMore": true
}
```

### Send Message
```http
POST /api/messages/:roomId
```
**Auth:** Required

**Request Body:**
```json
{
  "content": "Hello, how are you?"
}
```

### Mark as Read
```http
PUT /api/messages/:roomId
```
**Auth:** Required

---

## Search Endpoint

### Search
```http
GET /api/search?q=machine+learning&type=all&limit=20
```

**Query Parameters:**
- `q`: Search query (min 2 characters)
- `type`: all | users | posts | papers | groups
- `limit`: Results per category (default: 20)

**Response:** `200 OK`
```json
{
  "results": {
    "users": [/* user objects */],
    "posts": [/* post objects */],
    "papers": [/* paper objects */],
    "groups": [/* group objects */]
  },
  "counts": {
    "users": 5,
    "posts": 10,
    "papers": 3,
    "groups": 2,
    "total": 20
  }
}
```

---

## Upload Endpoint

### Upload File
```http
POST /api/upload
```
**Auth:** Required
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File to upload
- `type`: avatar | paper | attachment

**File Limits:**
- Images (avatar): 10MB
- PDFs (paper): 50MB
- Documents (attachment): 20MB

**Allowed Types:**
- Images: jpeg, png, gif, webp
- Documents: pdf, doc, docx, txt

**Response:** `201 Created`
```json
{
  "url": "https://scholar-hub.s3.amazonaws.com/...",
  "key": "avatars/user_123/...",
  "size": 1024567,
  "mimeType": "image/jpeg",
  "filename": "avatar.jpg"
}
```

### Delete File
```http
DELETE /api/upload?key=avatars/user_123/...
```
**Auth:** Required (file owner only)

---

## Notifications Endpoint

### Get Notifications
```http
GET /api/notifications
```
**Auth:** Required

**Response:** `200 OK`
```json
[
  {
    "id": "notif_123",
    "type": "FOLLOW",
    "content": "John Doe started following you",
    "read": false,
    "relatedId": "user_456",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Mark as Read
```http
PUT /api/notifications
```
**Auth:** Required

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [/* validation errors */]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "An error occurred"
}
```

---

## WebSocket Events (Socket.io)

Connect to: `ws://localhost:3200` (or your domain)

### Client → Server Events

```javascript
// Join user room
socket.emit('join', userId)

// Join chat room
socket.emit('join-chat', roomId)

// Leave chat room
socket.emit('leave-chat', roomId)

// Send message
socket.emit('send-message', {
  roomId: 'room_123',
  message: { /* message object */ }
})

// Typing indicator
socket.emit('typing', {
  roomId: 'room_123',
  userId: 'user_123',
  userName: 'John Doe'
})

// Stop typing
socket.emit('stop-typing', {
  roomId: 'room_123',
  userId: 'user_123'
})

// User status
socket.emit('user-online', userId)
socket.emit('user-offline', userId)
```

### Server → Client Events

```javascript
// New message
socket.on('new-message', (message) => {
  console.log('New message:', message)
})

// User typing
socket.on('user-typing', ({ userId, userName }) => {
  console.log(`${userName} is typing...`)
})

// User stopped typing
socket.on('user-stop-typing', ({ userId }) => {
  // Handle stop typing
})

// Notification
socket.on('notification', (notification) => {
  console.log('New notification:', notification)
})

// User status
socket.on('user-status', ({ userId, status }) => {
  console.log(`${userId} is ${status}`)
})
```

---

## Pagination

Most list endpoints support pagination:

```http
GET /api/posts?page=1&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [/* items */],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## Testing

### With cURL

```bash
# Sign up
curl -X POST http://localhost:3200/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@university.edu","password":"test123","name":"Test User","role":"STUDENT"}'

# Sign in
curl -X POST http://localhost:3200/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@university.edu","password":"test123"}'

# Get posts (with token)
curl http://localhost:3200/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### With Postman/Insomnia

1. Import this documentation as OpenAPI
2. Set base URL to `http://localhost:3200/api`
3. Add token to Authorization header
4. Test endpoints

---

## Versioning

Current API version: `v1`

All endpoints are currently unversioned. Future versions will use:
```
/api/v2/posts
```
