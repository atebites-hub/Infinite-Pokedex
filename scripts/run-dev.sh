#!/bin/bash

# Infinite Pokédex - Development Server
# Starts the Vite development server

echo "🚀 Starting Infinite Pokédex development server..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies not found. Running setup..."
    ./scripts/setup.sh
fi

# Start development server
echo "🌐 Starting Vite dev server on http://localhost:5173"
npm run dev
