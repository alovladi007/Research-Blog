const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const url = require('url');

/*
 * Minimal REST API server without external dependencies. This server handles
 * registration, login, and basic posting functionality for the research
 * micro‑blogging platform. Data is persisted to a JSON file. Authentication
 * tokens are signed using an HMAC so they cannot be tampered with. This
 * implementation is simplified for demonstration purposes; a production
 * version should use a robust database, proper email verification and HTTPS.
 */

const PORT = process.env.PORT || 3001;
const DATA_PATH = path.join(__dirname, 'data.json');
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'supersecretresearchkey';

// Allowed email domains. Domains beginning with '.' match any suffix.
const ALLOWED_DOMAINS = ['.edu', 'company.com'];

// Load or initialize data file
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // Create default structure if file does not exist
    return {
      users: [],
      posts: [],
      nextUserId: 1,
      nextPostId: 1
    };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// Helper: check if email domain is allowed
function isDomainAllowed(email) {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  return ALLOWED_DOMAINS.some(allowed => {
    if (allowed.startsWith('.')) {
      return domain.endsWith(allowed);
    }
    return domain === allowed;
  });
}

// Password hashing using PBKDF2
function hashPassword(password, salt = null) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

// Generate signed token with payload and expiration (in seconds)
function generateToken(payload, expiresIn = 12 * 60 * 60) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

// Verify token and return decoded payload or null if invalid/expired
function verifyToken(token) {
  try {
    const [headerB64, bodyB64, sig] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Helper: parse JSON body from request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        // Prevent overly large bodies
        req.connection.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        const json = data ? JSON.parse(data) : {};
        resolve(json);
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

// CORS headers for simple fetch from browser
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const data = loadData();

  // Helper to send JSON responses
  function sendJSON(status, obj) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  }

  // Registration
  if (req.method === 'POST' && pathname === '/api/register') {
    try {
      const body = await parseBody(req);
      const { email, password, name } = body;
      if (!email || !password || !name) {
        return sendJSON(400, { message: 'Email, password and name are required' });
      }
      if (!isDomainAllowed(email)) {
        return sendJSON(400, { message: 'Email domain is not allowed' });
      }
      const existing = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return sendJSON(400, { message: 'User already exists' });
      }
      const { salt, hash } = hashPassword(password);
      const user = {
        id: data.nextUserId++,
        email,
        password_hash: hash,
        salt,
        name,
        role: 'student',
        email_verified: true,
        created_at: new Date().toISOString()
      };
      data.users.push(user);
      saveData(data);
      return sendJSON(200, { message: 'Registration successful' });
    } catch (err) {
      return sendJSON(400, { message: err.message });
    }
  }

  // Login
  if (req.method === 'POST' && pathname === '/api/login') {
    try {
      const body = await parseBody(req);
      const { email, password } = body;
      if (!email || !password) {
        return sendJSON(400, { message: 'Email and password are required' });
      }
      const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return sendJSON(401, { message: 'Invalid credentials' });
      const { hash } = hashPassword(password, user.salt);
      if (hash !== user.password_hash) return sendJSON(401, { message: 'Invalid credentials' });
      const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });
      return sendJSON(200, { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (err) {
      return sendJSON(400, { message: err.message });
    }
  }

  // Protected endpoints require Authorization header
  if (pathname.startsWith('/api/')) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendJSON(401, { message: 'Unauthorized' });
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) return sendJSON(401, { message: 'Invalid or expired token' });

    // GET posts
    if (req.method === 'GET' && pathname === '/api/posts') {
      // Compose posts with author names
      const posts = data.posts
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(p => {
          const user = data.users.find(u => u.id === p.user_id);
          return { id: p.id, content: p.content, created_at: p.created_at, author_name: user ? user.name : 'Unknown' };
        });
      return sendJSON(200, { posts });
    }

    // Create new post
    if (req.method === 'POST' && pathname === '/api/posts') {
      try {
        const body = await parseBody(req);
        const { content } = body;
        if (!content || !content.trim()) {
          return sendJSON(400, { message: 'Content is required' });
        }
        const post = {
          id: data.nextPostId++,
          user_id: payload.id,
          content: content.trim(),
          created_at: new Date().toISOString()
        };
        data.posts.push(post);
        saveData(data);
        return sendJSON(200, { message: 'Post created' });
      } catch (err) {
        return sendJSON(400, { message: err.message });
      }
    }

    return sendJSON(404, { message: 'Not found' });
  }

  // Fallback: 404 for unknown endpoints
  sendJSON(404, { message: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});