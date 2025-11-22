# Database Setup Guide for Research Blog

Your Research Blog application requires PostgreSQL to store data. Here are three ways to set it up:

---

## Option 1: Using Docker (Recommended - Easiest)

### Install Docker Desktop
1. Download from: https://www.docker.com/products/docker-desktop
2. Install and start Docker Desktop

### Run PostgreSQL Container
```bash
# Run PostgreSQL on port 5433
docker run -d \
  --name research-blog-db \
  -e POSTGRES_USER=scholar \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=scholar_hub \
  -p 5433:5432 \
  postgres:15-alpine

# Verify it's running
docker ps | grep research-blog-db
```

### Update .env file
```bash
# Edit .env and update DATABASE_URL:
DATABASE_URL="postgresql://scholar:password123@localhost:5433/scholar_hub"
```

### Stop/Start Database Later
```bash
# Stop
docker stop research-blog-db

# Start
docker start research-blog-db

# Remove completely
docker rm -f research-blog-db
```

---

## Option 2: Using Homebrew (macOS)

### Install PostgreSQL
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15
```

### Create Database on Custom Port
```bash
# Create a custom PostgreSQL instance on port 5433
/opt/homebrew/opt/postgresql@15/bin/pg_ctl \
  -D /opt/homebrew/var/postgres-5433 \
  -o "-p 5433" \
  -l /opt/homebrew/var/log/postgres-5433.log \
  initdb

# Start on port 5433
/opt/homebrew/opt/postgresql@15/bin/pg_ctl \
  -D /opt/homebrew/var/postgres-5433 \
  -o "-p 5433" \
  -l /opt/homebrew/var/log/postgres-5433.log \
  start

# Create user and database
/opt/homebrew/opt/postgresql@15/bin/createuser -p 5433 -s scholar
/opt/homebrew/opt/postgresql@15/bin/createdb -p 5433 -O scholar scholar_hub
```

### Update .env file
```bash
DATABASE_URL="postgresql://scholar@localhost:5433/scholar_hub"
```

---

## Option 3: Postgres.app (macOS - GUI)

### Install
1. Download from: https://postgresapp.com
2. Move to Applications folder
3. Open Postgres.app
4. Click "Initialize" for a new server

### Configure Port
1. In Postgres.app, click on the server
2. Click "Server Settings"
3. Change port to 5433
4. Create database named `scholar_hub`

### Update .env file
```bash
DATABASE_URL="postgresql://postgres@localhost:5433/scholar_hub"
```

---

## After Installing PostgreSQL

Once PostgreSQL is running, complete the setup:

```bash
cd "/Users/vladimirantoine/Research Blogs (EUREKA)/Research-Blog"

# Run database migrations
npx prisma migrate dev --name init

# Seed with test data (optional)
npx prisma db seed

# Restart the development server (Ctrl+C then):
npm run dev:socket
```

---

## Test Database Connection

```bash
# Test connection
npx prisma studio

# This should open a browser at http://localhost:5555
# showing your database tables
```

---

## Troubleshooting

### Port 5433 Already in Use
```bash
# Find what's using port 5433
lsof -i :5433

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
```

### Connection Refused
- Make sure PostgreSQL is running
- Check the port number matches in your DATABASE_URL
- Verify the username and password are correct

### Need to Change Port
If you need to use a different port, update these files:
1. `.env` - DATABASE_URL
2. Start PostgreSQL on that port

---

## Quick Start (Docker - Copy/Paste)

```bash
# 1. Start PostgreSQL
docker run -d \
  --name research-blog-db \
  -e POSTGRES_USER=scholar \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=scholar_hub \
  -p 5433:5432 \
  postgres:15-alpine

# 2. Update .env (edit manually to set):
# DATABASE_URL="postgresql://scholar:password123@localhost:5433/scholar_hub"

# 3. Run migrations
cd "/Users/vladimirantoine/Research Blogs (EUREKA)/Research-Blog"
npx prisma migrate dev --name init

# 4. Seed database
npx prisma db seed

# Done! Your database is ready
```

---

## Test Credentials (after seeding)

- **Email**: alice.johnson@mit.edu
- **Password**: password123

Other test users:
- bob.smith@stanford.edu
- carol.williams@berkeley.edu
- david.brown@harvard.edu
- eve.davis@princeton.edu
- frank.wilson@yale.edu

All use password: `password123`
