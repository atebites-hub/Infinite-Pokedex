/**
 * Bulbapedia Crawler
 * 
 * Specialized crawler for Bulbapedia with domain-specific parsing and
 * rate limiting optimized for their server capacity.
 * 
 * @fileoverview Bulbapedia-specific crawler implementation
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import { BaseCrawler } from './base-crawler.js';
import { getSourceConfig } from '../config/crawler.js';
import { logger } from '../utils/logger.js';

/**
 * Bulbapedia-specific crawler
 */
export class BulbapediaCrawler extends BaseCrawler {
  constructor(config) {
    const bulbapediaConfig = getSourceConfig('bulbapedia');
    super({ ...bulbapediaConfig, ...config });
    
    this.baseUrl = this.config.baseUrl;
    this.selectors = this.config.selectors;
  }

  /**
   * Crawl a specific Pokémon species
   * @param {string|number} speciesId - Species ID or name
   * @param {Object} options - Crawl options
   * @returns {Promise<Object>} Species data
   */
  async crawlSpecies(speciesId, options = {}) {
    try {
      const speciesName = await this.getSpeciesName(speciesId);
      const url = this.buildSpeciesUrl(speciesName);
      
      logger.info(`Crawling Bulbapedia for ${speciesName} (${speciesId})`);
      
      const result = await this.crawlUrl(url, options);
      const parsedData = this.parseSpeciesPage(result.data, speciesId);
      
      return {
        source: 'bulbapedia',
        speciesId,
        speciesName,
        url,
        data: parsedData,
        timestamp: result.timestamp
      };
    } catch (error) {
      logger.error(`Failed to crawl Bulbapedia species ${speciesId}:`, error.message);
      throw error;
    }
  }

  /**
   * Crawl multiple species
   * @param {Array} speciesIds - Array of species IDs
   * @param {Object} options - Crawl options
   * @returns {Promise<Array>} Species data array
   */
  async crawlMultipleSpecies(speciesIds, options = {}) {
    const results = [];
    const errors = [];

    for (const speciesId of speciesIds) {
      try {
        const result = await this.crawlSpecies(speciesId, options);
        results.push(result);
        
        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errors.push({ speciesId, error: error.message });
        logger.warn(`Failed to crawl species ${speciesId}:`, error.message);
      }
    }

    logger.info(`Bulbapedia crawl completed: ${results.length} success, ${errors.length} errors`);
    return { results, errors };
  }

  /**
   * Get species name from ID
   * @param {string|number} speciesId - Species ID
   * @returns {Promise<string>} Species name
   */
  async getSpeciesName(speciesId) {
    // This would typically query a species database or API
    // For now, we'll use a simple mapping or assume the ID is the name
    if (typeof speciesId === 'string') {
      return speciesId;
    }
    
    // Convert ID to name (this would be more sophisticated in practice)
    const speciesNames = {
      1: 'Bulbasaur',
      2: 'Ivysaur',
      3: 'Venusaur',
      // ... more mappings
    };
    
    return speciesNames[speciesId] || `Pokemon_${speciesId}`;
  }

  /**
   * Build species URL
   * @param {string} speciesName - Species name
   * @returns {string} Full URL
   */
  buildSpeciesUrl(speciesName) {
    const path = this.config.paths.species.replace('{name}', speciesName);
    return `${this.baseUrl}${path}`;
  }

  /**
   * Parse species page HTML
   * @param {string} html - HTML content
   * @param {string|number} speciesId - Species ID
   * @returns {Object} Parsed species data
   */
  parseSpeciesPage(html, speciesId) {
    try {
      // This would use Cheerio for parsing
      // For now, we'll return a basic structure
      const data = {
        id: speciesId,
        name: this.extractName(html),
        types: this.extractTypes(html),
        stats: this.extractStats(html),
        abilities: this.extractAbilities(html),
        moves: this.extractMoves(html),
        description: this.extractDescription(html),
        trivia: this.extractTrivia(html)
      };

      return data;
    } catch (error) {
      logger.error(`Failed to parse Bulbapedia page for ${speciesId}:`, error.message);
      throw error;
    }
  }

  /**
   * Extract Pokémon name from HTML
   * @param {string} html - HTML content
   * @returns {string} Pokémon name
   */
  extractName(html) {
    // This would use Cheerio selectors
    // For now, return a placeholder
    return 'Pokemon Name';
  }

  /**
   * Extract Pokémon types from HTML
   * @param {string} html - HTML content
   * @returns {Array<string>} Type array
   */
  extractTypes(html) {
    // This would parse the infobox for types
    return ['Normal']; // Placeholder
  }

  /**
   * Extract base stats from HTML
   * @param {string} html - HTML content
   * @returns {Object} Base stats
   */
  extractStats(html) {
    // This would parse the stats table
    return {
      hp: 0,
      attack: 0,
      defense: 0,
      spAttack: 0,
      spDefense: 0,
      speed: 0
    };
  }

  /**
   * Extract abilities from HTML
   * @param {string} html - HTML content
   * @returns {Array<string>} Abilities array
   */
  extractAbilities(html) {
    // This would parse the abilities section
    return []; // Placeholder
  }

  /**
   * Extract moves from HTML
   * @param {string} html - HTML content
   * @returns {Array<Object>} Moves array
   */
  extractMoves(html) {
    // This would parse the moves section
    return []; // Placeholder
  }

  /**
   * Extract description from HTML
   * @param {string} html - HTML content
   * @returns {string} Description
   */
  extractDescription(html) {
    // This would extract the main description
    return ''; // Placeholder
  }

  /**
   * Extract trivia from HTML
   * @param {string} html - HTML content
   * @returns {Array<string>} Trivia array
   */
  extractTrivia(html) {
    // This would extract trivia sections
    return []; // Placeholder
  }

  /**
   * Search for Pokémon by name
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   */
  async searchSpecies(query) {
    try {
      const searchUrl = `${this.baseUrl}/wiki/Special:Search/${encodeURIComponent(query)}`;
      const result = await this.crawlUrl(searchUrl);
      
      // Parse search results
      return this.parseSearchResults(result.data);
    } catch (error) {
      logger.error(`Bulbapedia search failed for "${query}":`, error.message);
      throw error;
    }
  }

  /**
   * Parse search results HTML
   * @param {string} html - HTML content
   * @returns {Array<Object>} Search results
   */
  parseSearchResults(html) {
    // This would parse the search results page
    return []; // Placeholder
  }

  /**
   * Get crawler statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      source: 'bulbapedia',
      baseUrl: this.baseUrl,
      rateLimit: this.config.rateLimit,
      cacheStats: this.getCacheStats(),
      circuitBreakerState: this.circuitBreaker.state
    };
  }
}