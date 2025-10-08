#!/bin/bash

# Infinite Pokédex - Setup Script
# Installs all dependencies and prepares the development environment

echo "🚀 Setting up Infinite Pokédex development environment..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install chromium

# Create necessary directories
echo "📁 Creating data directories..."
mkdir -p data/cache data/output
mkdir -p test-results
mkdir -p coverage

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cat > .env << EOF
# Infinite Pokédex Environment Variables

# OpenRouter API Key (for tidbit synthesis)
OPENROUTER_API_KEY=your_api_key_here

# CDN Configuration
CDN_BUCKET_URL=https://your-cdn.com/pokedex

# Crawler Configuration
CRAWL_RATE_LIMIT=1000

# Development
NODE_ENV=development
LOG_LEVEL=debug
EOF
    echo "⚠️  Please update .env with your actual configuration"
fi

# Run initial tests
echo "🧪 Running initial tests..."
npm test

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update .env with your configuration"
echo "  2. Run 'npm run dev' to start development server"
echo "  3. Run 'npm test' to run tests"
echo "  4. Run 'npm run test:e2e' to run E2E tests"
echo ""
echo "For Docker development:"
echo "  - Run 'npm run docker:build' to build containers"
echo "  - Run 'npm run docker:up' to start services"
echo ""
