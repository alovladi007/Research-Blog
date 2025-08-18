#!/bin/bash

# This script helps set up the database for production

echo "Setting up database..."

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed the database (optional)
# echo "Seeding database..."
# npx prisma db seed

echo "Database setup complete!"