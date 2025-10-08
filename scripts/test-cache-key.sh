#!/bin/bash

# Cache Key Fix Test Runner
# Runs the cache key fix tests to verify the TidbitSynthesizer bug fix

echo "🧪 Running Cache Key Fix Tests..."
echo "=================================="

# Run the cache key fix test runner
node tests/unit/cache-key-fix-runner.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cache key fix tests passed successfully!"
    exit 0
else
    echo ""
    echo "❌ Cache key fix tests failed!"
    exit 1
fi
