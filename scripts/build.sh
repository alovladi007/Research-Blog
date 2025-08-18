#!/bin/bash

echo "Starting build process..."

# Check if DATABASE_URL exists, if not use a dummy URL for build
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set, using dummy URL for Prisma generation"
  export DATABASE_URL="postgresql://user:password@localhost:5432/db"
fi

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Build Next.js app
echo "Building Next.js application..."
npm run next:build

echo "Build complete!"