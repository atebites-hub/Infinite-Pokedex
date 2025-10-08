/**
 * Tidbit Synthesizer Tests
 *
 * Tests for the TidbitSynthesizer class, focusing on cache key generation
 * and forum data handling.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TidbitSynthesizer } from '../../source/server/processors/tidbit-synthesizer.js';

describe('TidbitSynthesizer', () => {
  let synthesizer;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      openRouterApiKey: 'test-api-key',
    };
    synthesizer = new TidbitSynthesizer(mockConfig);
  });

  describe('getCacheKey', () => {
    it('should generate different cache keys for different forum data', () => {
      const speciesId = 'pikachu';
      const speciesData = {
        name: 'Pikachu',
        types: ['Electric'],
        stats: { hp: 35, attack: 55 },
        abilities: ['Static'],
        description: 'A mouse Pokémon',
        trivia: ['First Pokémon in Pokédex'],
      };

      const forumData1 = 'Forum discussions about Pikachu being strong in OU';
      const forumData2 = 'Forum discussions about Pikachu being weak in OU';

      const cacheKey1 = synthesizer.getCacheKey(
        speciesId,
        speciesData,
        forumData1
      );
      const cacheKey2 = synthesizer.getCacheKey(
        speciesId,
        speciesData,
        forumData2
      );

      expect(cacheKey1).not.toBe(cacheKey2);
      expect(cacheKey1).toContain(speciesId);
      expect(cacheKey2).toContain(speciesId);
    });

    it('should generate same cache key for identical inputs', () => {
      const speciesId = 'pikachu';
      const speciesData = {
        name: 'Pikachu',
        types: ['Electric'],
        stats: { hp: 35, attack: 55 },
        abilities: ['Static'],
        description: 'A mouse Pokémon',
        trivia: ['First Pokémon in Pokédex'],
      };
      const forumData = 'Forum discussions about Pikachu being strong in OU';

      const cacheKey1 = synthesizer.getCacheKey(
        speciesId,
        speciesData,
        forumData
      );
      const cacheKey2 = synthesizer.getCacheKey(
        speciesId,
        speciesData,
        forumData
      );

      expect(cacheKey1).toBe(cacheKey2);
    });

    it('should use full SHA-256 hash (64 characters)', () => {
      const speciesId = 'pikachu';
      const speciesData = {
        name: 'Pikachu',
        types: ['Electric'],
        stats: { hp: 35, attack: 55 },
        abilities: ['Static'],
        description: 'A mouse Pokémon',
        trivia: ['First Pokémon in Pokédex'],
      };
      const forumData = 'Forum discussions about Pikachu being strong in OU';

      const cacheKey = synthesizer.getCacheKey(
        speciesId,
        speciesData,
        forumData
      );

      // Extract hash part (after speciesId-)
      const hashPart = cacheKey.split('-')[1];
      expect(hashPart).toHaveLength(64); // Full SHA-256 hash
    });

    it('should exclude tidbits array from cache key', () => {
      const speciesId = 'pikachu';
      const speciesData = {
        name: 'Pikachu',
        types: ['Electric'],
        stats: { hp: 35, attack: 55 },
        abilities: ['Static'],
        description: 'A mouse Pokémon',
        trivia: ['First Pokémon in Pokédex'],
        tidbits: [
          { title: 'Old tidbit', body: 'This should not affect cache key' },
        ],
      };
      const forumData = 'Forum discussions about Pikachu being strong in OU';

      const cacheKey1 = synthesizer.getCacheKey(
        speciesId,
        speciesData,
        forumData
      );

      // Add tidbits to speciesData and generate cache key again
      const speciesDataWithTidbits = {
        ...speciesData,
        tidbits: [
          {
            title: 'New tidbit',
            body: 'This should not affect cache key either',
          },
        ],
      };

      const cacheKey2 = synthesizer.getCacheKey(
        speciesId,
        speciesDataWithTidbits,
        forumData
      );

      // Cache keys should be identical despite different tidbits
      expect(cacheKey1).toBe(cacheKey2);
    });

    it('should handle undefined forum data', () => {
      const speciesId = 'pikachu';
      const speciesData = {
        name: 'Pikachu',
        types: ['Electric'],
        stats: { hp: 35, attack: 55 },
        abilities: ['Static'],
        description: 'A mouse Pokémon',
        trivia: ['First Pokémon in Pokédex'],
      };

      const cacheKey = synthesizer.getCacheKey(
        speciesId,
        speciesData,
        undefined
      );
      expect(cacheKey).toContain(speciesId);
      expect(cacheKey).toHaveLength(speciesId.length + 1 + 64); // speciesId + '-' + 64-char hash
    });
  });

  describe('getStats', () => {
    it('should return synthesizer statistics', () => {
      const stats = synthesizer.getStats();

      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('apiKey');
      expect(stats).toHaveProperty('baseUrl');
      expect(stats.cacheSize).toBe(0);
      expect(stats.apiKey).toBe('configured');
      expect(stats.baseUrl).toBe('https://openrouter.ai/api/v1');
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      // Add something to cache
      synthesizer.cache.set('test-key', 'test-value');
      expect(synthesizer.cache.size).toBe(1);

      // Clear cache
      synthesizer.clearCache();
      expect(synthesizer.cache.size).toBe(0);
    });
  });
});
