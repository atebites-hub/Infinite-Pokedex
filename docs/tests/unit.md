# Unit Tests Documentation

## Overview

This document describes the unit test suites for the Infinite Pokédex project. Unit tests verify individual functions and modules in isolation to ensure correctness and prevent regressions.

## Test Framework

**Primary Framework**: Node.js with custom test runners  
**Alternative**: Jest (configured but requires ES module setup)  
**Coverage Goal**: 80%+ for all modules

## Running Tests

### All Unit Tests

```bash
npm test
```

### Individual Test Suites

```bash
# Validation utilities
node tests/unit/validation-runner.js

# Cache key fix tests
node tests/unit/cache-key-fix-runner.js

# Or use the shell script
./scripts/test-cache-key.sh
```

## Test Suites

### Validation Utilities (`validation-runner.js`)

Tests the schema validation and text sanitization functions.

**File**: `tests/unit/validation-runner.js`  
**Module Under Test**: `source/server/utils/validation.js`

#### Test Coverage

**sanitizeText() Function:**
- ✅ Preserves accented characters (Flabébé)
- ✅ Preserves apostrophes (Farfetch'd)
- ✅ Preserves gender symbols (Nidoran♀/♂)
- ✅ Preserves parentheses (Deoxys forms)
- ✅ Preserves hyphens (Ho-Oh, Porygon-Z)
- ✅ Preserves periods and colons (Mr. Mime, Type: Null)
- ✅ Removes HTML tags
- ✅ Normalizes whitespace
- ✅ Trims leading/trailing whitespace
- ✅ Handles mixed Unicode and ASCII
- ✅ Preserves common punctuation
- ✅ Handles empty strings
- ✅ Handles null/undefined/non-string inputs
- ✅ Removes dangerous special characters
- ✅ Handles complex real-world examples
- ✅ Preserves Japanese characters

**Run Command:**
```bash
node tests/unit/validation-runner.js
```

**Expected Output:**
```
🧪 Testing sanitizeText Unicode Character Preservation...

✅ Preserves accented characters (Flabébé)
✅ Preserves apostrophes (Farfetch'd)
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Test Summary: 18/18 tests passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ All sanitizeText tests passed!
```

#### Edge Cases Tested

1. **Unicode Characters**: Accented letters (é, ñ, à), Japanese characters (ポケモン)
2. **Special Symbols**: Gender symbols (♀, ♂)
3. **Punctuation**: Apostrophes, hyphens, periods, colons, parentheses
4. **HTML Content**: Tags, nested tags
5. **Whitespace**: Multiple spaces, leading/trailing, tabs
6. **Invalid Input**: null, undefined, numbers
7. **Mixed Content**: Unicode + ASCII, multiple special characters

### Cache Key Fix Tests (`cache-key-fix-runner.js`)

Tests the TidbitSynthesizer cache key generation fix.

**File**: `tests/unit/cache-key-fix-runner.js`  
**Module Under Test**: `source/server/processors/tidbit-synthesizer.js`

#### Test Coverage

- ✅ Different forum data generates different cache keys
- ✅ Same inputs generate same cache key
- ✅ Hash is full SHA-256 (64 characters)
- ✅ Tidbits array excluded from cache key
- ✅ Handles undefined forum data
- ✅ Handles empty forum data
- ✅ Consistent cache keys for same data
- ✅ Different species data generates different keys
- ✅ Cache key format validation
- ✅ Special characters in species ID

**Run Command:**
```bash
./scripts/test-cache-key.sh
# or
node tests/unit/cache-key-fix-runner.js
```

### Smogon Crawler Tests (`smogon-crawler.test.js`)

Tests the Smogon crawler functionality.

**File**: `tests/unit/smogon-crawler.test.js`  
**Module Under Test**: `source/server/crawler/smogon.js`

**Note**: Currently requires Jest ES module configuration to run.

#### Test Coverage

- Constructor initialization
- URL building (strategy, forum)
- HTML parsing (strategy pages)
- Forum parsing
- Search results parsing
- Rate limiting integration

### Rate Limiter Tests (`rate-limiter-fix.test.js`)

Tests the RateLimiter class in BaseCrawler.

**File**: `tests/unit/rate-limiter-fix.test.js`  
**Module Under Test**: `source/server/crawler/base-crawler.js`

**Note**: Currently requires Jest ES module configuration to run.

#### Test Coverage

- Token consumption
- Token refill
- Fractional token generation
- Burst token handling
- Minute limit enforcement
- Integration tests (rapid requests, long-term consistency)

### Tidbit Synthesizer Tests (`tidbit-synthesizer.test.js`)

Tests the TidbitSynthesizer class.

**File**: `tests/unit/tidbit-synthesizer.test.js`  
**Module Under Test**: `source/server/processors/tidbit-synthesizer.js`

**Note**: Currently requires Jest ES module configuration to run.

#### Test Coverage

- Cache key generation
- Forum data handling
- Cache clearing

## Writing New Tests

### Test Runner Pattern

For tests that can run independently without Jest:

```javascript
/**
 * Test Runner for [Module Name]
 */

import { functionToTest } from '../../source/path/to/module.js';

// Test results tracking
let testsPassed = 0;
let testsTotal = 0;

function runTest(testName, testFunction) {
  testsTotal++;
  try {
    const result = testFunction();
    if (result) {
      console.log(`✅ ${testName}`);
      testsPassed++;
    } else {
      console.log(`❌ ${testName}`);
    }
  } catch (error) {
    console.log(`❌ ${testName} - Error: ${error.message}`);
  }
}

console.log('🧪 Testing [Module Name]...\n');

// Test 1
runTest('Test description', () => {
  const result = functionToTest('input');
  return result === 'expected';
});

// Print summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} tests passed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Exit with appropriate code
if (testsPassed === testsTotal) {
  console.log('✅ All tests passed!\n');
  process.exit(0);
} else {
  console.log(`❌ ${testsTotal - testsPassed} test(s) failed.\n`);
  process.exit(1);
}
```

### Jest Pattern

For tests that use Jest (when configuration is fixed):

```javascript
const { describe, it, expect, beforeEach } = require('@jest/globals');
const { functionToTest } = require('../../source/path/to/module.js');

describe('Module Name', () => {
  let instance;

  beforeEach(() => {
    instance = new ModuleClass();
  });

  describe('functionToTest', () => {
    it('should handle normal case', () => {
      const result = functionToTest('input');
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      const result = functionToTest(null);
      expect(result).toBe('');
    });
  });
});
```

## Test Guidelines

### Best Practices

1. **Test One Thing**: Each test should verify one specific behavior
2. **Clear Names**: Test names should clearly describe what's being tested
3. **Edge Cases**: Always test edge cases (null, undefined, empty, extreme values)
4. **Real-World Data**: Use realistic data (actual Pokémon names, real text)
5. **Independent Tests**: Tests should not depend on each other
6. **Fast Execution**: Unit tests should run quickly (< 1 second each)

### Test Structure

1. **Arrange**: Set up test data and preconditions
2. **Act**: Execute the function being tested
3. **Assert**: Verify the result matches expectations

### Coverage Goals

- **Functions**: 80%+ of functions have tests
- **Lines**: 80%+ of code lines are executed by tests
- **Branches**: 80%+ of conditional branches are tested
- **Edge Cases**: All known edge cases have explicit tests

## Known Issues

### Jest ES Module Support

The project uses ES modules (`type: "module"` in package.json), but Jest has difficulty importing ES modules. Current workarounds:

1. **Use Custom Test Runners**: For critical tests, use Node.js directly with custom test runners (e.g., `validation-runner.js`, `cache-key-fix-runner.js`)
2. **Future Fix**: Configure Jest with experimental VM modules or migrate to Vitest

### Affected Test Files

These files require Jest ES module configuration to run:
- `tests/unit/smogon-crawler.test.js`
- `tests/unit/rate-limiter-fix.test.js`
- `tests/unit/tidbit-synthesizer.test.js`
- `tests/unit/cache-key-fix.test.js`
- `tests/unit/validation.test.js`

## CI/CD Integration

### Test Suite Script

The main test suite script (`scripts/test-suite.sh`) runs all tests:

```bash
./scripts/test-suite.sh
```

**Includes:**
1. Linting
2. Format checking
3. Unit tests (npm test)
4. Cache key fix tests
5. E2E tests (Playwright)

### Pre-Commit Checks

Before committing, ensure:
1. All tests pass: `npm test`
2. No linter errors: `npm run lint`
3. Code is formatted: `npm run format`
4. Coverage meets 80%+ threshold

## Related Documentation

- [Testing Guidelines](/docs/agents/Testing%20Guidelines.md) - Overall testing strategy
- [Validation Code Documentation](/docs/code/server/validation.md) - Validation utilities details
- [Backend Structure](/docs/agents/Backend%20Structure%20Doc.md) - Server architecture

## Recent Updates

### 2025-01-08: Validation Test Suite

Added comprehensive validation test suite (`validation-runner.js`) to verify Unicode character preservation fix in `sanitizeText()` function. All 18 tests passing.

**Key Tests Added:**
- Unicode character preservation (Flabébé, ポケモン)
- Gender symbol preservation (Nidoran♀/♂)
- Punctuation preservation (apostrophes, hyphens, etc.)
- HTML tag removal
- Edge case handling
