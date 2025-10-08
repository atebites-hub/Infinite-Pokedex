/**
 * Smogon Crawler Tests
 *
 * Unit tests for Smogon crawler functionality including strategy pokedex
 * and forum crawling capabilities.
 *
 * @fileoverview Smogon crawler test suite
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SmogonCrawler } from '../../source/server/crawler/smogon.js';

describe('SmogonCrawler', () => {
  let crawler;

  beforeEach(() => {
    crawler = new SmogonCrawler({
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerSecond: 1,
        burstLimit: 5,
      },
    });
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(crawler.baseUrl).toBe('https://www.smogon.com');
      expect(crawler.selectors).toBeDefined();
      expect(crawler.config.rateLimit.requestsPerMinute).toBe(60);
    });

    it('should have required selectors', () => {
      expect(crawler.selectors.title).toBeDefined();
      expect(crawler.selectors.content).toBeDefined();
      expect(crawler.selectors.strategy).toBeDefined();
      expect(crawler.selectors.moves).toBeDefined();
      expect(crawler.selectors.abilities).toBeDefined();
    });
  });

  describe('URL building', () => {
    it('should build correct strategy URL', () => {
      const url = crawler.buildStrategyUrl('pikachu');
      expect(url).toBe('https://www.smogon.com/dex/sv/pokemon/pikachu/');
    });

    it('should build correct forum URL', () => {
      const url = crawler.buildForumUrl('/forums/threads/123');
      expect(url).toBe('https://www.smogon.com/forums/threads/123');
    });

    it('should build correct forum search URL', () => {
      const url = crawler.buildForumSearchUrl('pikachu');
      expect(url).toBe('https://www.smogon.com/forums/search/?q=pikachu');
    });
  });

  describe('HTML parsing', () => {
    const mockHtml = `
      <html>
        <body>
          <h1>Pikachu</h1>
          <div class="dex-pokemon-page">
            <div class="dex-pokemon-gen9dex">
              <div class="type">Electric</div>
              <div class="ability">
                <span class="ability-name">Static</span>
                <span class="ability-description">Contact may paralyze</span>
              </div>
              <div class="move">
                <span class="move-name">Thunderbolt</span>
                <span class="move-type">Electric</span>
                <span class="move-power">90</span>
                <span class="move-accuracy">100</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    it('should parse strategy name', () => {
      const $ = require('cheerio').load(mockHtml);
      const name = crawler.extractStrategyName($);
      expect(name).toBe('Pikachu');
    });

    it('should parse strategy types', () => {
      const $ = require('cheerio').load(mockHtml);
      const types = crawler.extractStrategyTypes($);
      expect(types).toContain('Electric');
    });

    it('should parse abilities', () => {
      const $ = require('cheerio').load(mockHtml);
      const abilities = crawler.extractStrategyAbilities($);
      expect(abilities).toHaveLength(1);
      expect(abilities[0].name).toBe('Static');
      expect(abilities[0].description).toBe('Contact may paralyze');
    });

    it('should parse moves', () => {
      const $ = require('cheerio').load(mockHtml);
      const moves = crawler.extractStrategyMoves($);
      expect(moves).toHaveLength(1);
      expect(moves[0].name).toBe('Thunderbolt');
      expect(moves[0].type).toBe('Electric');
      expect(moves[0].power).toBe('90');
      expect(moves[0].accuracy).toBe('100');
    });
  });

  describe('Forum parsing', () => {
    const mockForumHtml = `
      <html>
        <body>
          <div class="forum-post">
            <div class="thread-title">Pikachu Discussion</div>
            <div class="thread-author">Trainer123</div>
            <div class="thread-date">2024-01-01</div>
            <div class="thread-replies">5</div>
          </div>
          <div class="forum-post-content">
            <div class="post-author">Trainer456</div>
            <div class="post-date">2024-01-02</div>
            <div class="post-content">Pikachu is really strong in OU this gen!</div>
          </div>
        </body>
      </html>
    `;

    it('should parse forum threads', () => {
      const $ = require('cheerio').load(mockForumHtml);
      const threads = crawler.extractForumThreads($);
      expect(threads).toHaveLength(1);
      expect(threads[0].title).toBe('Pikachu Discussion');
      expect(threads[0].author).toBe('Trainer123');
    });

    it('should parse forum posts', () => {
      const $ = require('cheerio').load(mockForumHtml);
      const posts = crawler.extractForumPosts($);
      expect(posts).toHaveLength(1);
      expect(posts[0].content).toBe('Pikachu is really strong in OU this gen!');
      expect(posts[0].author).toBe('Trainer456');
    });

    it('should extract tidbits from forum content', () => {
      const $ = require('cheerio').load(mockForumHtml);
      const tidbits = crawler.extractTidbits($);
      expect(tidbits).toContain('Pikachu is really strong in OU this gen!');
    });
  });

  describe('Search results parsing', () => {
    const mockSearchHtml = `
      <html>
        <body>
          <div class="search-result">
            <div class="result-title">Pikachu OU Analysis</div>
            <div class="result-url">/forums/threads/123</div>
            <div class="result-snippet">Pikachu has great speed and special attack...</div>
          </div>
          <div class="discussion-result">
            <div class="discussion-title">Pikachu Discussion Thread</div>
            <div class="discussion-content">Lots of discussion about Pikachu's viability</div>
            <div class="discussion-participants">15 users</div>
          </div>
        </body>
      </html>
    `;

    it('should parse search results', () => {
      const $ = require('cheerio').load(mockSearchHtml);
      const results = crawler.extractSearchResults($);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Pikachu OU Analysis');
      expect(results[0].snippet).toBe(
        'Pikachu has great speed and special attack...'
      );
    });

    it('should parse discussion results', () => {
      const $ = require('cheerio').load(mockSearchHtml);
      const discussions = crawler.extractDiscussionResults($);
      expect(discussions).toHaveLength(1);
      expect(discussions[0].title).toBe('Pikachu Discussion Thread');
      expect(discussions[0].participants).toBe('15 users');
    });

    it('should extract search tidbits', () => {
      const $ = require('cheerio').load(mockSearchHtml);
      const tidbits = crawler.extractSearchTidbits($);
      expect(tidbits).toContain(
        'Pikachu has great speed and special attack...'
      );
    });
  });

  describe('Statistics', () => {
    it('should return correct stats', () => {
      const stats = crawler.getStats();
      expect(stats.source).toBe('smogon');
      expect(stats.baseUrl).toBe('https://www.smogon.com');
      expect(stats.rateLimit).toBeDefined();
      expect(stats.cacheStats).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid HTML gracefully', () => {
      const invalidHtml = '<html><body>Invalid content</body></html>';
      const $ = require('cheerio').load(invalidHtml);

      expect(() => crawler.extractStrategyName($)).not.toThrow();
      expect(() => crawler.extractStrategyTypes($)).not.toThrow();
      expect(() => crawler.extractStrategyAbilities($)).not.toThrow();
    });

    it('should return empty arrays for missing data', () => {
      const emptyHtml = '<html><body></body></html>';
      const $ = require('cheerio').load(emptyHtml);

      expect(crawler.extractStrategyTypes($)).toEqual([]);
      expect(crawler.extractStrategyAbilities($)).toEqual([]);
      expect(crawler.extractStrategyMoves($)).toEqual([]);
    });
  });
});
