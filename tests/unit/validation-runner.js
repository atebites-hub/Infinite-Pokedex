/**
 * Validation Test Runner
 *
 * Simple test runner to verify the validation utilities, especially the
 * sanitizeText fix for Unicode character preservation.
 */

import { sanitizeText } from '../../source/server/utils/validation.js';

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

console.log('🧪 Testing sanitizeText Unicode Character Preservation...\n');

// Test 1: Preserve accented characters in Pokémon names
runTest('Preserves accented characters (Flabébé)', () => {
  const input = 'Flabébé is a fairy type';
  const result = sanitizeText(input);
  return result === 'Flabébé is a fairy type';
});

// Test 2: Preserve apostrophes in Pokémon names
runTest("Preserves apostrophes (Farfetch'd)", () => {
  const input = "Farfetch'd is a bird Pokémon";
  const result = sanitizeText(input);
  return result === "Farfetch'd is a bird Pokémon";
});

// Test 3: Preserve gender symbols
runTest('Preserves gender symbols (Nidoran♀/♂)', () => {
  const input = 'Nidoran♀ and Nidoran♂ are different species';
  const result = sanitizeText(input);
  return result === 'Nidoran♀ and Nidoran♂ are different species';
});

// Test 4: Preserve parentheses
runTest('Preserves parentheses (Deoxys forms)', () => {
  const input = 'Deoxys (Attack Forme) has high attack';
  const result = sanitizeText(input);
  return result === 'Deoxys (Attack Forme) has high attack';
});

// Test 5: Preserve hyphens in names
runTest('Preserves hyphens (Ho-Oh, Porygon-Z)', () => {
  const input = 'Ho-Oh and Porygon-Z are legendary';
  const result = sanitizeText(input);
  return result === 'Ho-Oh and Porygon-Z are legendary';
});

// Test 6: Preserve periods and colons
runTest('Preserves periods and colons (Mr. Mime, Type: Null)', () => {
  const input = 'Mr. Mime and Type: Null are unique names';
  const result = sanitizeText(input);
  return result === 'Mr. Mime and Type: Null are unique names';
});

// Test 7: Remove HTML tags
runTest('Removes HTML tags', () => {
  const input = 'Pikachu is <strong>electric</strong> type';
  const result = sanitizeText(input);
  return result === 'Pikachu is electric type';
});

// Test 8: Normalize whitespace
runTest('Normalizes whitespace', () => {
  const input = 'Charizard   has    multiple   spaces';
  const result = sanitizeText(input);
  return result === 'Charizard has multiple spaces';
});

// Test 9: Trim leading and trailing whitespace
runTest('Trims whitespace', () => {
  const input = '  Bulbasaur is grass type  ';
  const result = sanitizeText(input);
  return result === 'Bulbasaur is grass type';
});

// Test 10: Handle mixed Unicode and ASCII
runTest('Handles mixed Unicode and ASCII', () => {
  const input = "Pokémon like Flabébé and Farfetch'd";
  const result = sanitizeText(input);
  return result === "Pokémon like Flabébé and Farfetch'd";
});

// Test 11: Preserve common punctuation
runTest('Preserves common punctuation', () => {
  const input = "Hello! How are you? I'm fine, thanks.";
  const result = sanitizeText(input);
  return result === "Hello! How are you? I'm fine, thanks.";
});

// Test 12: Handle empty string
runTest('Handles empty string', () => {
  const result = sanitizeText('');
  return result === '';
});

// Test 13: Handle non-string input
runTest('Handles null input', () => {
  const result = sanitizeText(null);
  return result === '';
});

runTest('Handles undefined input', () => {
  const result = sanitizeText(undefined);
  return result === '';
});

runTest('Handles number input', () => {
  const result = sanitizeText(123);
  return result === '';
});

// Test 14: Remove dangerous special characters while preserving name
runTest('Removes dangerous characters but preserves name', () => {
  const input = 'Pikachu$%^&*+=[]{}\\|;:`~';
  const result = sanitizeText(input);
  // Should preserve the name but remove most special chars except allowed punctuation
  return (
    result.includes('Pikachu') && !result.includes('$') && !result.includes('%')
  );
});

// Test 15: Complex real-world example with multiple Unicode characters
runTest('Complex example: Multiple accented names', () => {
  const input =
    "Pokémon like Flabébé, Farfetch'd, and Nidoran♀ have special characters";
  const result = sanitizeText(input);
  return (
    result.includes('Flabébé') &&
    result.includes("Farfetch'd") &&
    result.includes('Nidoran♀')
  );
});

// Test 16: Test with Japanese characters (some Pokémon names)
runTest('Preserves Japanese characters', () => {
  const input = 'ポケモン (Pokémon in Japanese)';
  const result = sanitizeText(input);
  return result.includes('ポケモン');
});

// Print summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Test Summary: ${testsPassed}/${testsTotal} tests passed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Exit with appropriate code
if (testsPassed === testsTotal) {
  console.log(
    '✅ All sanitizeText tests passed! Unicode preservation is working correctly.\n'
  );
  process.exit(0);
} else {
  console.log(
    `❌ ${testsTotal - testsPassed} test(s) failed. Please review the failures above.\n`
  );
  process.exit(1);
}
