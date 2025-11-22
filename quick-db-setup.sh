#!/bin/bash

# Quick Database Setup Script for Research Blog
# Uses Docker to set up PostgreSQL

set -e

echo "🗄️  Research Blog - Quick Database Setup"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo ""
    echo "Please install Docker Desktop from:"
    echo "https://www.docker.com/products/docker-desktop"
    echo ""
    echo "Alternatively, see database-setup.md for other installation options."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running!"
    echo ""
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is installed and running"
echo ""

# Check if container already exists
if docker ps -a | grep -q research-blog-db; then
    echo "⚠️  Container 'research-blog-db' already exists"
    read -p "Do you want to remove it and start fresh? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing container..."
        docker rm -f research-blog-db
        echo "✅ Removed"
    else
        echo "Using existing container..."
        docker start research-blog-db 2>/dev/null || true
    fi
else
    echo "📦 Creating PostgreSQL container..."
    docker run -d \
      --name research-blog-db \
      -e POSTGRES_USER=scholar \
      -e POSTGRES_PASSWORD=password123 \
      -e POSTGRES_DB=scholar_hub \
      -p 5433:5432 \
      postgres:15-alpine

    echo "✅ PostgreSQL container created"
fi

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Update .env file
echo "📝 Updating .env file..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Update DATABASE_URL in .env
if grep -q "^DATABASE_URL=" .env; then
    # macOS sed requires backup extension
    sed -i.bak 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://scholar:password123@localhost:5433/scholar_hub"|' .env
    rm .env.bak
    echo "✅ Updated DATABASE_URL in .env"
else
    echo 'DATABASE_URL="postgresql://scholar:password123@localhost:5433/scholar_hub"' >> .env
    echo "✅ Added DATABASE_URL to .env"
fi

echo ""
echo "🔄 Running Prisma migrations..."
npx prisma migrate dev --name init

echo ""
read -p "Do you want to seed the database with test data? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    npx prisma db seed
    echo "✅ Database seeded"
    echo ""
    echo "📧 Test Login Credentials:"
    echo "   Email: alice.johnson@mit.edu"
    echo "   Password: password123"
else
    echo "⏭️  Skipping seed"
fi

echo ""
echo "========================================="
echo "✅ Database setup complete!"
echo ""
echo "Container name: research-blog-db"
echo "Database: scholar_hub"
echo "Port: 5433"
echo "User: scholar"
echo "Password: password123"
echo ""
echo "To stop database:  docker stop research-blog-db"
echo "To start database: docker start research-blog-db"
echo "To remove database: docker rm -f research-blog-db"
echo ""
echo "🚀 Restart your dev server to connect:"
echo "   npm run dev:socket"
echo "========================================="
