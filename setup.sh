#!/bin/bash

# Research Blog Setup Script
# This script will set up and start the Research Blog application

set -e  # Exit on error

echo "🚀 Research Blog Setup Script"
echo "=============================="
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Step 1: Check if .env exists
echo "📝 Step 1: Checking environment file..."
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi
echo "✅ .env file exists"
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Installing dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages (this may take a few minutes)..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Step 3: Set up Prisma
echo "🗄️  Step 3: Setting up Prisma..."
echo "Generating Prisma client..."
npx prisma generate

# Ask user if they want to run migrations
echo ""
read -p "Do you want to set up the database now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running database migrations..."
    npx prisma migrate dev --name init
    echo "✅ Database set up complete"
else
    echo "⏭️  Skipping database setup"
fi
echo ""

# Step 4: Start the server
echo "🚀 Step 4: Starting development server..."
echo ""
echo "Starting server on http://localhost:3200"
echo "Press Ctrl+C to stop the server"
echo ""
echo "=============================="
echo ""

npm run dev:socket
