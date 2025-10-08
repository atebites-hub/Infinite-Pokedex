/**
 * Cache Key Fix Test Runner
 *
 * Simple test runner to verify the TidbitSynthesizer cache key fix works correctly.
 * This can be run with Node.js directly without Jest configuration issues.
 */

import { TidbitSynthesizer } from '../../source/server/processors/tidbit-synthesizer.js';

// Test configuration
const config = {
  openRouterApiKey: 'test-api-key',
};

const synthesizer = new TidbitSynthesizer(config);

// Test data
const speciesId = 'pikachu';
const speciesData = {
  name: 'Pikachu',
  types: ['Electric'],
  stats: { hp: 35, attack: 55 },
  abilities: ['Static'],
  description: 'A mouse Pokémon',
  trivia: ['First Pokémon in Pokédex'],
};

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

console.log('🧪 Testing TidbitSynthesizer Cache Key Fix...\n');

// Test 1: Different forum data should generate different cache keys
runTest('Different forum data generates different cache keys', () => {
  const forumData1 = 'Forum discussions about Pikachu being strong in OU';
  const forumData2 = 'Forum discussions about Pikachu being weak in OU';

  const cacheKey1 = synthesizer.getCacheKey(speciesId, speciesData, forumData1);
  const cacheKey2 = synthesizer.getCacheKey(speciesId, speciesData, forumData2);

  return (
    cacheKey1 !== cacheKey2 &&
    cacheKey1.includes(speciesId) &&
    cacheKey2.includes(speciesId)
  );
});

// Test 2: Same inputs should generate same cache key
runTest('Same inputs generate same cache key', () => {
  const forumData = 'Forum discussions about Pikachu being strong in OU';
  const cacheKey1 = synthesizer.getCacheKey(speciesId, speciesData, forumData);
  const cacheKey2 = synthesizer.getCacheKey(speciesId, speciesData, forumData);

  return cacheKey1 === cacheKey2;
});

// Test 3: Hash should be full SHA-256 (64 characters)
runTest('Hash is full SHA-256 (64 characters)', () => {
  const forumData = 'Forum discussions about Pikachu being strong in OU';
  const cacheKey = synthesizer.getCacheKey(speciesId, speciesData, forumData);
  const hashPart = cacheKey.split('-')[1];

  return hashPart.length === 64;
});

// Test 4: Tidbits array should not affect cache key
runTest('Tidbits array does not affect cache key', () => {
  const forumData = 'Forum discussions about Pikachu being strong in OU';
  const cacheKey1 = synthesizer.getCacheKey(speciesId, speciesData, forumData);

  const speciesDataWithTidbits = {
    ...speciesData,
    tidbits: [
      { title: 'Old tidbit', body: 'This should not affect cache key' },
    ],
  };

  const cacheKey2 = synthesizer.getCacheKey(
    speciesId,
    speciesDataWithTidbits,
    forumData
  );

  return cacheKey1 === cacheKey2;
});

// Test 5: Handle undefined forum data
runTest('Handles undefined forum data', () => {
  const cacheKey = synthesizer.getCacheKey(speciesId, speciesData, undefined);

  return (
    cacheKey.includes(speciesId) && cacheKey.match(/^pikachu-[a-f0-9]{64}$/)
  );
});

// Test 6: Handle empty forum data
runTest('Handles empty forum data', () => {
  const cacheKey = synthesizer.getCacheKey(speciesId, speciesData, '');

  return (
    cacheKey.includes(speciesId) && cacheKey.match(/^pikachu-[a-f0-9]{64}$/)
  );
});

// Test 7: Consistent cache keys for same data
runTest('Generates consistent cache keys for same data', () => {
  const forumData = 'Forum discussions about Pikachu being strong in OU';

  const cacheKeys = Array.from({ length: 5 }, () =>
    synthesizer.getCacheKey(speciesId, speciesData, forumData)
  );

  const firstKey = cacheKeys[0];
  return cacheKeys.every((key) => key === firstKey);
});

// Test 8: Different species data generates different keys
runTest('Different species data generates different cache keys', () => {
  const forumData = 'Forum discussions about Pokémon';

  const pikachuData = {
    name: 'Pikachu',
    types: ['Electric'],
    stats: { hp: 35, attack: 55 },
    abilities: ['Static'],
    description: 'A mouse Pokémon',
    trivia: ['First Pokémon in Pokédex'],
  };

  const charizardData = {
    name: 'Charizard',
    types: ['Fire', 'Flying'],
    stats: { hp: 78, attack: 84 },
    abilities: ['Blaze'],
    description: 'A dragon Pokémon',
    trivia: ['Final evolution of Charmander'],
  };

  const pikachuKey = synthesizer.getCacheKey('pikachu', pikachuData, forumData);
  const charizardKey = synthesizer.getCacheKey(
    'charizard',
    charizardData,
    forumData
  );

  return (
    pikachuKey !== charizardKey &&
    pikachuKey.includes('pikachu') &&
    charizardKey.includes('charizard')
  );
});

// Test 9: Cache key format follows pattern
runTest('Cache key follows pattern: speciesId-hash', () => {
  const speciesId = 'test-pokemon';
  const speciesData = { name: 'Test Pokémon' };
  const forumData = 'Test forum data';

  const cacheKey = synthesizer.getCacheKey(speciesId, speciesData, forumData);

  return cacheKey.match(/^test-pokemon-[a-f0-9]{64}$/);
});

// Test 10: Handle special characters in species ID
runTest('Handles special characters in species ID', () => {
  const speciesId = 'pokemon-with-dashes_and_underscores';
  const speciesData = { name: 'Test Pokémon' };
  const forumData = 'Test forum data';

  const cacheKey = synthesizer.getCacheKey(speciesId, speciesData, forumData);

  return (
    cacheKey.includes(speciesId) &&
    cacheKey.match(/^pokemon-with-dashes_and_underscores-[a-f0-9]{64}$/)
  );
});

// Summary
console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed`);

if (testsPassed === testsTotal) {
  console.log('🎉 All tests passed! Cache key fix is working correctly.');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please check the implementation.');
  process.exit(1);
}
