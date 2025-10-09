/**
 * Unit tests for validation utilities
 *
 * Tests schema validation and text sanitization functions
 */

import { describe, it, expect } from '@jest/globals';
import {
  sanitizeText,
  validateSchema,
  validateSpecies,
  validateTidbit,
  validateUrl,
  validateEmail,
  validateHash,
  validateVersion,
} from '../../source/server/utils/validation.js';

describe('sanitizeText', () => {
  it('should preserve accented characters in Pokémon names', () => {
    const input = 'Flabébé is a fairy type';
    const result = sanitizeText(input);
    expect(result).toBe('Flabébé is a fairy type');
  });

  it('should preserve apostrophes in Pokémon names', () => {
    const input = "Farfetch'd is a bird Pokémon";
    const result = sanitizeText(input);
    expect(result).toBe("Farfetch'd is a bird Pokémon");
  });

  it('should preserve gender symbols', () => {
    const input = 'Nidoran♀ and Nidoran♂ are different species';
    const result = sanitizeText(input);
    expect(result).toBe('Nidoran♀ and Nidoran♂ are different species');
  });

  it('should preserve parentheses', () => {
    const input = 'Deoxys (Attack Forme) has high attack';
    const result = sanitizeText(input);
    expect(result).toBe('Deoxys (Attack Forme) has high attack');
  });

  it('should preserve hyphens in names', () => {
    const input = 'Ho-Oh and Porygon-Z are legendary';
    const result = sanitizeText(input);
    expect(result).toBe('Ho-Oh and Porygon-Z are legendary');
  });

  it('should preserve periods and colons', () => {
    const input = 'Mr. Mime and Type: Null are unique names';
    const result = sanitizeText(input);
    expect(result).toBe('Mr. Mime and Type: Null are unique names');
  });

  it('should remove HTML tags', () => {
    const input = 'Pikachu is <strong>electric</strong> type';
    const result = sanitizeText(input);
    expect(result).toBe('Pikachu is electric type');
  });

  it('should normalize whitespace', () => {
    const input = 'Charizard   has    multiple   spaces';
    const result = sanitizeText(input);
    expect(result).toBe('Charizard has multiple spaces');
  });

  it('should trim leading and trailing whitespace', () => {
    const input = '  Bulbasaur is grass type  ';
    const result = sanitizeText(input);
    expect(result).toBe('Bulbasaur is grass type');
  });

  it('should handle mixed Unicode and ASCII', () => {
    const input = "Pokémon like Flabébé and Farfetch'd";
    const result = sanitizeText(input);
    expect(result).toBe("Pokémon like Flabébé and Farfetch'd");
  });

  it('should preserve common punctuation', () => {
    const input = "Hello! How are you? I'm fine, thanks.";
    const result = sanitizeText(input);
    expect(result).toBe("Hello! How are you? I'm fine, thanks.");
  });

  it('should handle empty string', () => {
    const result = sanitizeText('');
    expect(result).toBe('');
  });

  it('should handle non-string input', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText(123)).toBe('');
  });

  it('should remove dangerous special characters', () => {
    const input = 'Pikachu$%^&*+=[]{}\\|;:`~';
    const result = sanitizeText(input);
    // Should preserve the name but remove most special chars except allowed punctuation
    expect(result).toContain('Pikachu');
    expect(result).not.toContain('$');
    expect(result).not.toContain('%');
  });
});

describe('validateSchema', () => {
  it('should validate required fields', () => {
    const schema = {
      name: { type: 'string', required: true },
      age: { type: 'number', required: true },
    };

    const validData = { name: 'Pikachu', age: 25 };
    const result = validateSchema(validData, schema);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing required fields', () => {
    const schema = {
      name: { type: 'string', required: true },
      age: { type: 'number', required: true },
    };

    const invalidData = { name: 'Pikachu' };
    const result = validateSchema(invalidData, schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: age');
  });

  it('should validate field types', () => {
    const schema = {
      name: { type: 'string' },
      age: { type: 'number' },
    };

    const invalidData = { name: 'Pikachu', age: '25' };
    const result = validateSchema(invalidData, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should warn on exceeding max length for arrays', () => {
    const schema = {
      types: { type: 'array', maxLength: 2 },
    };

    const data = { types: ['electric', 'flying', 'fire'] };
    const result = validateSchema(data, schema);

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateSpecies', () => {
  it('should validate valid species data', () => {
    const species = {
      id: 25,
      name: 'Pikachu',
      types: ['electric'],
      sources: { bulbapedia: 'https://example.com' },
    };

    const result = validateSpecies(species);
    expect(result.valid).toBe(true);
  });

  it('should reject species without required fields', () => {
    const species = {
      name: 'Pikachu',
      types: ['electric'],
    };

    const result = validateSpecies(species);
    expect(result.valid).toBe(false);
  });
});

describe('validateTidbit', () => {
  it('should validate valid tidbit data', () => {
    const tidbit = {
      title: 'Interesting Fact',
      body: 'Pikachu is based on a mouse.',
      sourceRefs: ['bulbapedia'],
    };

    const result = validateTidbit(tidbit);
    expect(result.valid).toBe(true);
  });
});

describe('validateUrl', () => {
  it('should validate valid URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('http://bulbapedia.bulbagarden.net')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(validateUrl('not a url')).toBe(false);
    expect(validateUrl('')).toBe(false);
  });
});

describe('validateEmail', () => {
  it('should validate valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.email@domain.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('not an email')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
  });
});

describe('validateHash', () => {
  it('should validate valid SHA-256 hashes', () => {
    const validHash = 'a'.repeat(64);
    expect(validateHash(validHash)).toBe(true);
  });

  it('should reject invalid hashes', () => {
    expect(validateHash('tooshort')).toBe(false);
    expect(validateHash('z'.repeat(64))).toBe(false); // Invalid hex chars
  });
});

describe('validateVersion', () => {
  it('should validate valid version strings', () => {
    expect(validateVersion('20250108-1430')).toBe(true);
  });

  it('should reject invalid version strings', () => {
    expect(validateVersion('2025-01-08')).toBe(false);
    expect(validateVersion('invalid')).toBe(false);
  });
});
