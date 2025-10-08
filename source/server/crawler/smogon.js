/**
 * Smogon Crawler
 * 
 * Specialized crawler for Smogon Strategy Pokedex and forums with domain-specific
 * parsing and rate limiting optimized for their server capacity.
 * 
 * @fileoverview Smogon-specific crawler implementation
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import { BaseCrawler } from './base-crawler.js';
import { getSourceConfig } from '../config/crawler.js';
import { logger } from '../utils/logger.js';
import * as cheerio from 'cheerio';

/**
 * Smogon-specific crawler
 */
export class SmogonCrawler extends BaseCrawler {
  constructor(config) {
    const smogonConfig = getSourceConfig('smogon');
    super({ ...smogonConfig, ...config });
    
    this.baseUrl = this.config.baseUrl;
    this.selectors = this.config.selectors;
  }

  /**
   * Crawl a specific Pokémon from Smogon Strategy Pokedex
   * @param {string} pokemonName - Pokémon name
   * @param {Object} options - Crawl options
   * @returns {Promise<Object>} Pokémon strategy data
   */
  async crawlStrategyPokemon(pokemonName, options = {}) {
    try {
      const url = this.buildStrategyUrl(pokemonName);
      
      logger.info(`Crawling Smogon Strategy Pokedex for ${pokemonName}`);
      
      const result = await this.crawlUrl(url, options);
      const parsedData = this.parseStrategyPage(result.data, pokemonName);
      
      return {
        source: 'smogon',
        type: 'strategy',
        pokemonName,
        url,
        data: parsedData,
        timestamp: result.timestamp
      };
    } catch (error) {
      logger.error(`Failed to crawl Smogon strategy for ${pokemonName}:`, error.message);
      throw error;
    }
  }

  /**
   * Crawl multiple Pokémon from Strategy Pokedex
   * @param {Array<string>} pokemonNames - Array of Pokémon names
   * @param {Object} options - Crawl options
   * @returns {Promise<Array>} Strategy data array
   */
  async crawlMultipleStrategyPokemon(pokemonNames, options = {}) {
    const results = [];
    const errors = [];

    for (const pokemonName of pokemonNames) {
      try {
        const result = await this.crawlStrategyPokemon(pokemonName, options);
        results.push(result);
        
        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        errors.push({ pokemonName, error: error.message });
        logger.warn(`Failed to crawl strategy for ${pokemonName}:`, error.message);
      }
    }

    logger.info(`Smogon strategy crawl completed: ${results.length} success, ${errors.length} errors`);
    return { results, errors };
  }

  /**
   * Crawl Smogon forums for tidbits and discussions
   * @param {string} forumPath - Forum path to crawl
   * @param {Object} options - Crawl options
   * @returns {Promise<Object>} Forum data
   */
  async crawlForum(forumPath, options = {}) {
    try {
      const url = this.buildForumUrl(forumPath);
      
      logger.info(`Crawling Smogon forums: ${forumPath}`);
      
      const result = await this.crawlUrl(url, options);
      const parsedData = this.parseForumPage(result.data, forumPath);
      
      return {
        source: 'smogon',
        type: 'forum',
        forumPath,
        url,
        data: parsedData,
        timestamp: result.timestamp
      };
    } catch (error) {
      logger.error(`Failed to crawl Smogon forum ${forumPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Search for Pokémon discussions in forums
   * @param {string} pokemonName - Pokémon name to search for
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Forum search results
   */
  async searchForumDiscussions(pokemonName, options = {}) {
    try {
      const searchUrl = this.buildForumSearchUrl(pokemonName);
      
      logger.info(`Searching Smogon forums for ${pokemonName}`);
      
      const result = await this.crawlUrl(searchUrl, options);
      const parsedData = this.parseForumSearchResults(result.data, pokemonName);
      
      return {
        source: 'smogon',
        type: 'forum_search',
        pokemonName,
        url: searchUrl,
        data: parsedData,
        timestamp: result.timestamp
      };
    } catch (error) {
      logger.error(`Failed to search Smogon forums for ${pokemonName}:`, error.message);
      throw error;
    }
  }

  /**
   * Build strategy URL for Pokémon
   * @param {string} pokemonName - Pokémon name
   * @returns {string} Full URL
   */
  buildStrategyUrl(pokemonName) {
    const path = this.config.paths.strategy.replace('{name}', pokemonName.toLowerCase());
    return `${this.baseUrl}${path}`;
  }

  /**
   * Build forum URL
   * @param {string} forumPath - Forum path
   * @returns {string} Full URL
   */
  buildForumUrl(forumPath) {
    return `${this.baseUrl}${forumPath}`;
  }

  /**
   * Build forum search URL
   * @param {string} pokemonName - Pokémon name
   * @returns {string} Full URL
   */
  buildForumSearchUrl(pokemonName) {
    const searchPath = `/forums/search/?q=${encodeURIComponent(pokemonName)}`;
    return `${this.baseUrl}${searchPath}`;
  }

  /**
   * Parse strategy page HTML
   * @param {string} html - HTML content
   * @param {string} pokemonName - Pokémon name
   * @returns {Object} Parsed strategy data
   */
  parseStrategyPage(html, pokemonName) {
    try {
      const $ = cheerio.load(html);
      
      const data = {
        name: this.extractStrategyName($),
        types: this.extractStrategyTypes($),
        abilities: this.extractStrategyAbilities($),
        moves: this.extractStrategyMoves($),
        stats: this.extractStrategyStats($),
        strategies: this.extractStrategies($),
        sets: this.extractSets($),
        usage: this.extractUsageStats($),
        viability: this.extractViability($)
      };

      return data;
    } catch (error) {
      logger.error(`Failed to parse Smogon strategy page for ${pokemonName}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse forum page HTML
   * @param {string} html - HTML content
   * @param {string} forumPath - Forum path
   * @returns {Object} Parsed forum data
   */
  parseForumPage(html, forumPath) {
    try {
      const $ = cheerio.load(html);
      
      const data = {
        threads: this.extractForumThreads($),
        posts: this.extractForumPosts($),
        discussions: this.extractDiscussions($),
        tidbits: this.extractTidbits($)
      };

      return data;
    } catch (error) {
      logger.error(`Failed to parse Smogon forum page ${forumPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse forum search results HTML
   * @param {string} html - HTML content
   * @param {string} pokemonName - Pokémon name
   * @returns {Object} Parsed search results
   */
  parseForumSearchResults(html, pokemonName) {
    try {
      const $ = cheerio.load(html);
      
      const data = {
        pokemonName,
        results: this.extractSearchResults($),
        discussions: this.extractDiscussionResults($),
        tidbits: this.extractSearchTidbits($)
      };

      return data;
    } catch (error) {
      logger.error(`Failed to parse Smogon search results for ${pokemonName}:`, error.message);
      throw error;
    }
  }

  /**
   * Extract Pokémon name from strategy page
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {string} Pokémon name
   */
  extractStrategyName($) {
    return $(this.selectors.title).first().text().trim();
  }

  /**
   * Extract types from strategy page
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<string>} Types array
   */
  extractStrategyTypes($) {
    const types = [];
    $(this.selectors.strategy + ' .type').each((i, el) => {
      const type = $(el).text().trim();
      if (type) types.push(type);
    });
    return types;
  }

  /**
   * Extract abilities from strategy page
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Abilities array
   */
  extractStrategyAbilities($) {
    const abilities = [];
    $(this.selectors.abilities + ' .ability').each((i, el) => {
      const name = $(el).find('.ability-name').text().trim();
      const description = $(el).find('.ability-description').text().trim();
      if (name) {
        abilities.push({ name, description });
      }
    });
    return abilities;
  }

  /**
   * Extract moves from strategy page
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Moves array
   */
  extractStrategyMoves($) {
    const moves = [];
    $(this.selectors.moves + ' .move').each((i, el) => {
      const name = $(el).find('.move-name').text().trim();
      const type = $(el).find('.move-type').text().trim();
      const power = $(el).find('.move-power').text().trim();
      const accuracy = $(el).find('.move-accuracy').text().trim();
      
      if (name) {
        moves.push({ name, type, power, accuracy });
      }
    });
    return moves;
  }

  /**
   * Extract base stats from strategy page
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Object} Base stats
   */
  extractStrategyStats($) {
    const stats = {};
    $(this.selectors.stats + ' tr').each((i, el) => {
      const label = $(el).find('td:first-child').text().trim();
      const value = $(el).find('td:last-child').text().trim();
      if (label && value) {
        stats[label.toLowerCase()] = parseInt(value) || 0;
      }
    });
    return stats;
  }

  /**
   * Extract competitive strategies
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Strategies array
   */
  extractStrategies($) {
    const strategies = [];
    $(this.selectors.strategy + ' .strategy').each((i, el) => {
      const name = $(el).find('.strategy-name').text().trim();
      const description = $(el).find('.strategy-description').text().trim();
      const viability = $(el).find('.strategy-viability').text().trim();
      
      if (name) {
        strategies.push({ name, description, viability });
      }
    });
    return strategies;
  }

  /**
   * Extract competitive sets
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Sets array
   */
  extractSets($) {
    const sets = [];
    $(this.selectors.strategy + ' .set').each((i, el) => {
      const name = $(el).find('.set-name').text().trim();
      const moves = [];
      $(el).find('.set-moves .move').each((j, moveEl) => {
        moves.push($(moveEl).text().trim());
      });
      const ability = $(el).find('.set-ability').text().trim();
      const item = $(el).find('.set-item').text().trim();
      
      if (name) {
        sets.push({ name, moves, ability, item });
      }
    });
    return sets;
  }

  /**
   * Extract usage statistics
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Object} Usage stats
   */
  extractUsageStats($) {
    const usage = {};
    $(this.selectors.strategy + ' .usage-stats tr').each((i, el) => {
      const tier = $(el).find('td:first-child').text().trim();
      const percentage = $(el).find('td:last-child').text().trim();
      if (tier && percentage) {
        usage[tier] = parseFloat(percentage.replace('%', '')) || 0;
      }
    });
    return usage;
  }

  /**
   * Extract viability rankings
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Object} Viability data
   */
  extractViability($) {
    const viability = {};
    $(this.selectors.strategy + ' .viability tr').each((i, el) => {
      const tier = $(el).find('td:first-child').text().trim();
      const rank = $(el).find('td:last-child').text().trim();
      if (tier && rank) {
        viability[tier] = rank;
      }
    });
    return viability;
  }

  /**
   * Extract forum threads
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Threads array
   */
  extractForumThreads($) {
    const threads = [];
    $(this.selectors.forumPosts).each((i, el) => {
      const title = $(el).find('.thread-title').text().trim();
      const author = $(el).find('.thread-author').text().trim();
      const date = $(el).find('.thread-date').text().trim();
      const replies = $(el).find('.thread-replies').text().trim();
      
      if (title) {
        threads.push({ title, author, date, replies });
      }
    });
    return threads;
  }

  /**
   * Extract forum posts
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Posts array
   */
  extractForumPosts($) {
    const posts = [];
    $(this.selectors.forumContent).each((i, el) => {
      const content = $(el).text().trim();
      const author = $(el).find('.post-author').text().trim();
      const date = $(el).find('.post-date').text().trim();
      
      if (content) {
        posts.push({ content, author, date });
      }
    });
    return posts;
  }

  /**
   * Extract discussions from forum
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Discussions array
   */
  extractDiscussions($) {
    const discussions = [];
    $(this.selectors.forumPosts).each((i, el) => {
      const title = $(el).find('.discussion-title').text().trim();
      const content = $(el).find('.discussion-content').text().trim();
      const participants = $(el).find('.discussion-participants').text().trim();
      
      if (title && content) {
        discussions.push({ title, content, participants });
      }
    });
    return discussions;
  }

  /**
   * Extract tidbits from forum content
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<string>} Tidbits array
   */
  extractTidbits($) {
    const tidbits = [];
    $(this.selectors.forumContent).each((i, el) => {
      const content = $(el).text().trim();
      // Extract interesting tidbits (this could be more sophisticated)
      if (content.length > 50 && content.length < 500) {
        tidbits.push(content);
      }
    });
    return tidbits;
  }

  /**
   * Extract search results
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Search results
   */
  extractSearchResults($) {
    const results = [];
    $('.search-result').each((i, el) => {
      const title = $(el).find('.result-title').text().trim();
      const url = $(el).find('.result-url').attr('href');
      const snippet = $(el).find('.result-snippet').text().trim();
      
      if (title) {
        results.push({ title, url, snippet });
      }
    });
    return results;
  }

  /**
   * Extract discussion results from search
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Discussion results
   */
  extractDiscussionResults($) {
    const discussions = [];
    $('.discussion-result').each((i, el) => {
      const title = $(el).find('.discussion-title').text().trim();
      const content = $(el).find('.discussion-content').text().trim();
      const participants = $(el).find('.discussion-participants').text().trim();
      
      if (title) {
        discussions.push({ title, content, participants });
      }
    });
    return discussions;
  }

  /**
   * Extract tidbits from search results
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<string>} Search tidbits
   */
  extractSearchTidbits($) {
    const tidbits = [];
    $('.search-result .result-snippet').each((i, el) => {
      const snippet = $(el).text().trim();
      if (snippet.length > 20) {
        tidbits.push(snippet);
      }
    });
    return tidbits;
  }

  /**
   * Get crawler statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      source: 'smogon',
      baseUrl: this.baseUrl,
      rateLimit: this.config.rateLimit,
      cacheStats: this.getCacheStats(),
      circuitBreakerState: this.circuitBreaker.state
    };
  }
}
