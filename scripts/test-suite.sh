#!/bin/bash

# Infinite Pokédex - Test Suite
# Runs all tests for the project

echo "🧪 Running Infinite Pokédex Test Suite..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run from project root."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔍 Running linting..."
npm run lint

echo "🎨 Running formatting check..."
npm run format

echo "🧪 Running unit tests..."
npm test

echo "🔑 Running cache key fix tests..."
./scripts/test-cache-key.sh

echo "🌐 Running E2E tests..."
npm run test:e2e

echo "✅ All tests completed!"

# Check if dev server is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "🚀 Development server is running at http://localhost:3000"
else
    echo "⚠️  Development server is not running. Start with: npm run dev"
fi

echo "📱 PWA Test Checklist:"
echo "  - [ ] App installs on mobile device"
echo "  - [ ] Offline functionality works"
echo "  - [ ] Service Worker caches resources"
echo "  - [ ] IndexedDB operations work"
echo "  - [ ] Gen 9 Pokédex UI renders correctly"
echo "  - [ ] Animations are smooth"
echo "  - [ ] Search functionality works"
echo "  - [ ] Favorites system works"
echo "  - [ ] Settings persist"