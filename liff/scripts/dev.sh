#!/bin/sh

# LIFF Development Script
# This script ensures npm dependencies are installed and starts the development server

echo "🚀 Starting LIFF development server..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development server
echo "🔥 Starting Vite development server..."
npm run dev -- --host --port 3001 