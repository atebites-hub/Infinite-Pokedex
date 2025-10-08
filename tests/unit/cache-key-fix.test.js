/**
 * Cache Key Fix Tests
 * 
 * Tests to verify the TidbitSynthesizer cache key fix works correctly.
 * This test ensures that:
 * 1. Different forum data generates different cache keys
 * 2. Same inputs generate same cache key
 * 3. Hash is full SHA-256 (64 characters)
 * 4. Tidbits array does not affect cache key
 * 5. Handles undefined forum data
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TidbitSynthesizer } from '../../source/server/processors/tidbit-synthesizer.js';

describe('TidbitSynthesizer Cache Key Fix', () => {
  let synthesizer;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      openRouterApiKey: 'test-api-key'
    };
    synthesizer = new TidbitSynthesizer(mockConfig);
  });

  describe('Cache Key Generation', () => {
    const speciesId = 'pikachu';
    const speciesData = {
      name: 'Pikachu',
      types: ['Electric'],
      stats: { hp: 35, attack: 55 },
      abilities: ['Static'],
      description: 'A mouse Pokémon',
      trivia: ['First Pokémon in Pokédex']
    };

    it('should generate different cache keys for different forum data', () => {
      const forumData1 = 'Forum discussions about Pikachu being strong in OU';
      const forumData2 = 'Forum discussions about Pikachu being weak in OU';

      const cacheKey1 = synthesizer.getCacheKey(speciesId, speciesData, forumData1);
      const cacheKey2 = synthesizer.getCacheKey(speciesId, speciesData, forumData2);

      expect(cacheKey1).not.toBe(cacheKey2);
      expect(cacheKey1).toContain(speciesId);
      expect(cacheKey2).toContain(speciesId);
    });

    it('should generate same cache key for identical inputs', () => {
      const forumData = 'Forum discussions about Pikachu being strong in OU';

      const cacheKey1 = synthesizer.getCacheKey(speciesId, speciesData, forumData);
      const cacheKey2 = synthesizer.getCacheKey(speciesId, speciesData, forumData);

      expect(cacheKey1).toBe(cacheKey2);
    });

    it('should use full SHA-256 hash (64 characters)', () => {
      const forumData = 'Forum discussions about Pikachu being strong in OU';
      const cacheKey = synthesizer.getCacheKey(speciesId, speciesData, forumData);
      
      // Extract hash part (after speciesId-)
      const hashPart = cacheKey.split('-')[1];
      expect(hashPart).toHaveLength(64); // Full SHA-256 hash
    });

    it('should exclude tidbits array from cache key', () => {
      const forumData = 'Forum discussions about Pikachu being strong in OU';
      
      const cacheKey1 = synthesizer.getCacheKey(speciesId, speciesData, forumData);
      
      // Add tidbits to speciesData and generate cache key again
      const speciesDataWithTidbits = {
        ...speciesData,
        tidbits: [
          { title: 'Old tidbit', body: 'This should not affect cache key' }
        ]
      };
      
      const cacheKey2 = synthesizer.getCacheKey(speciesId, speciesDataWithTidbits, forumData);

      // Cache keys should be identical despite different tidbits
      expect(cacheKey1).toBe(cacheKey2);
    });

    it('should handle undefined forum data', () => {
      const cacheKey = synthesizer.getCacheKey(speciesId, speciesData, undefined);
      
      expect(cacheKey).toContain(speciesId);
      expect(cacheKey).toMatch(/^pikachu-[a-f0-9]{64}$/);
    });

    it('should handle empty forum data', () => {
      const cacheKey = synthesizer.getCacheKey(speciesId, speciesData, '');
      
      expect(cacheKey).toContain(speciesId);
      expect(cacheKey).toMatch(/^pikachu-[a-f0-9]{64}$/);
    });

    it('should generate consistent cache keys for same data', () => {
      const forumData = 'Forum discussions about Pikachu being strong in OU';
      
      // Generate multiple cache keys with same data
      const cacheKeys = Array.from({ length: 5 }, () => 
        synthesizer.getCacheKey(speciesId, speciesData, forumData)
      );
      
      // All cache keys should be identical
      const firstKey = cacheKeys[0];
      cacheKeys.forEach(key => {
        expect(key).toBe(firstKey);
      });
    });

    it('should handle different species data correctly', () => {
      const forumData = 'Forum discussions about Pokémon';
      
      const pikachuData = {
        name: 'Pikachu',
        types: ['Electric'],
        stats: { hp: 35, attack: 55 },
        abilities: ['Static'],
        description: 'A mouse Pokémon',
        trivia: ['First Pokémon in Pokédex']
      };
      
      const charizardData = {
        name: 'Charizard',
        types: ['Fire', 'Flying'],
        stats: { hp: 78, attack: 84 },
        abilities: ['Blaze'],
        description: 'A dragon Pokémon',
        trivia: ['Final evolution of Charmander']
      };

      const pikachuKey = synthesizer.getCacheKey('pikachu', pikachuData, forumData);
      const charizardKey = synthesizer.getCacheKey('charizard', charizardData, forumData);

      expect(pikachuKey).not.toBe(charizardKey);
      expect(pikachuKey).toContain('pikachu');
      expect(charizardKey).toContain('charizard');
    });
  });

  describe('Cache Key Format', () => {
    it('should follow the pattern: speciesId-hash', () => {
      const speciesId = 'test-pokemon';
      const speciesData = { name: 'Test Pokémon' };
      const forumData = 'Test forum data';
      
      const cacheKey = synthesizer.getCacheKey(speciesId, speciesData, forumData);
      
      expect(cacheKey).toMatch(/^test-pokemon-[a-f0-9]{64}$/);
    });

    it('should handle special characters in species ID', () => {
      const speciesId = 'pokemon-with-dashes_and_underscores';
      const speciesData = { name: 'Test Pokémon' };
      const forumData = 'Test forum data';
      
      const cacheKey = synthesizer.getCacheKey(speciesId, speciesData, forumData);
      
      expect(cacheKey).toContain(speciesId);
      expect(cacheKey).toMatch(/^pokemon-with-dashes_and_underscores-[a-f0-9]{64}$/);
    });
  });
});
