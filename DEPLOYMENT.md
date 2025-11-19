# ScholarHub Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- AWS S3 bucket (for file uploads)
- SMTP server (for emails)
- Redis (optional, for production rate limiting)

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Database (Required)
DATABASE_URL="postgresql://user:password@localhost:5432/scholar_hub"

# Authentication (Required)
JWT_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"  # Change to your domain in production
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"

# Email Configuration (Required)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"  # Use app-specific password for Gmail
SMTP_FROM="ScholarHub <noreply@scholarhub.com>"

# AWS S3 (Required for file uploads)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="scholar-hub"

# Redis (Optional - for production rate limiting)
REDIS_URL="redis://localhost:6379"

# Analytics (Optional)
GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# AI Features (Optional)
OPENAI_API_KEY=""
SEMANTIC_SCHOLAR_API_KEY=""

# Socket.io (Optional)
SOCKET_PORT="3001"  # Only if running Socket.io separately
```

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with sample data (optional)
npm run prisma:seed
```

### 3. Start Development Server

**Option A: Standard Next.js (no real-time features)**
```bash
npm run dev
```
Visit: http://localhost:3000

**Option B: With Socket.io (recommended)**
```bash
npm run dev:socket
```
Visit: http://localhost:3000

Socket.io will run on the same port as Next.js.

## Production Deployment

### Option 1: Vercel (Recommended for serverless)

**Note:** Socket.io won't work on Vercel. For real-time features, use Option 2 or deploy Socket.io separately.

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
npm run build
vercel --prod
```

### Option 2: Custom Server (For Socket.io support)

#### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:socket"]
```

Build and run:
```bash
docker build -t scholarhub .
docker run -p 3000:3000 --env-file .env scholarhub
```

#### VPS Deployment (Ubuntu/Debian)

```bash
# 1. Clone repository
git clone https://github.com/your-org/scholar-hub.git
cd scholar-hub

# 2. Install dependencies
npm ci --only=production

# 3. Set up environment
cp .env.example .env
nano .env  # Edit with your values

# 4. Set up database
npx prisma migrate deploy
npx prisma generate

# 5. Build application
npm run build

# 6. Start with PM2
npm install -g pm2
pm2 start server.js --name scholarhub
pm2 save
pm2 startup
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name scholarhub.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io support
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: Render

Create `render.yaml` (already included):

```yaml
services:
  - type: web
    name: scholarhub
    env: node
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npm run start:socket
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      # Add all other env vars
```

Deploy:
```bash
# Connect to Render and deploy
render deploy
```

## Database Migration

### Development
```bash
# Create new migration
npx prisma migrate dev --name description_of_changes

# Apply migrations
npx prisma migrate dev
```

### Production
```bash
# Deploy migrations
npx prisma migrate deploy

# Rollback (if needed)
npx prisma migrate resolve --rolled-back migration_name
```

## AWS S3 Setup

1. Create S3 bucket: `scholar-hub`
2. Set bucket permissions:
   - Block public access: OFF (for public-read objects)
   - CORS configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["https://your-domain.com"],
        "ExposeHeaders": []
    }
]
```

3. Create IAM user with S3 permissions:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`

4. Add credentials to `.env`

## Email Setup (Gmail Example)

1. Enable 2FA on your Gmail account
2. Generate App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification
   - App passwords → Generate
3. Use app password in `SMTP_PASS`

## Health Checks

Create health check endpoints:

```bash
# Check API
curl http://localhost:3000/api/auth/session

# Check database
npx prisma db execute --url=$DATABASE_URL
```

## Monitoring

### Error Tracking

Install Sentry:
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### Performance Monitoring

Use Vercel Analytics or custom solution:
```bash
npm install @vercel/analytics
```

## SSL/HTTPS

### Let's Encrypt (Free)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d scholarhub.com -d www.scholarhub.com
sudo certbot renew --dry-run
```

## Scaling

### Horizontal Scaling

1. Use load balancer (Nginx, AWS ALB)
2. Multiple application instances with PM2 cluster mode:

```bash
pm2 start server.js -i max --name scholarhub-cluster
```

### Database Scaling

1. Enable connection pooling (PgBouncer)
2. Read replicas for queries
3. Database indexes (already configured in schema)

### Redis Setup (Production Rate Limiting)

```bash
# Install Redis
sudo apt install redis-server

# Configure
sudo nano /etc/redis/redis.conf
# Set maxmemory-policy: allkeys-lru

# Start
sudo systemctl start redis
sudo systemctl enable redis
```

Update `src/lib/rate-limit.ts` to use Redis in production.

## Backup Strategy

### Database Backups

```bash
# Daily backup script
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20240101.sql
```

### S3 Versioning

Enable versioning on S3 bucket for file recovery.

## Troubleshooting

### Build Errors

```bash
# Clear cache
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Database Connection Issues

```bash
# Test connection
npx prisma db pull

# Reset database (caution!)
npx prisma migrate reset
```

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

## Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] HTTPS enabled in production
- [ ] Database credentials secured
- [ ] S3 bucket permissions configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers set
- [ ] Regular dependency updates
- [ ] Regular backups configured
- [ ] Error tracking enabled

## Post-Deployment

1. Test all features
2. Monitor error logs
3. Check performance metrics
4. Set up alerts
5. Schedule regular backups
6. Plan for scaling

## Support

For issues, check:
- [GitHub Issues](https://github.com/your-org/scholar-hub/issues)
- [Documentation](https://docs.scholarhub.com)
- Email: support@scholarhub.com
