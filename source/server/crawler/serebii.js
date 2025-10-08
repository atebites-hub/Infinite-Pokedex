/**
 * Serebii Crawler
 * 
 * Specialized crawler for Serebii with domain-specific parsing and
 * rate limiting optimized for their server capacity.
 * 
 * @fileoverview Serebii-specific crawler implementation
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import { BaseCrawler } from './base-crawler.js';
import { getSourceConfig } from '../config/crawler.js';
import { logger } from '../utils/logger.js';

/**
 * Serebii-specific crawler
 */
export class SerebiiCrawler extends BaseCrawler {
  constructor(config) {
    const serebiiConfig = getSourceConfig('serebii');
    super({ ...serebiiConfig, ...config });
    
    this.baseUrl = this.config.baseUrl;
    this.selectors = this.config.selectors;
  }

  /**
   * Crawl a specific Pokémon species
   * @param {string|number} speciesId - Species ID
   * @param {Object} options - Crawl options
   * @returns {Promise<Object>} Species data
   */
  async crawlSpecies(speciesId, options = {}) {
    try {
      const url = this.buildSpeciesUrl(speciesId);
      
      logger.info(`Crawling Serebii for species ${speciesId}`);
      
      const result = await this.crawlUrl(url, options);
      const parsedData = this.parseSpeciesPage(result.data, speciesId);
      
      return {
        source: 'serebii',
        speciesId,
        url,
        data: parsedData,
        timestamp: result.timestamp
      };
    } catch (error) {
      logger.error(`Failed to crawl Serebii species ${speciesId}:`, error.message);
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
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        errors.push({ speciesId, error: error.message });
        logger.warn(`Failed to crawl species ${speciesId}:`, error.message);
      }
    }

    logger.info(`Serebii crawl completed: ${results.length} success, ${errors.length} errors`);
    return { results, errors };
  }

  /**
   * Build species URL
   * @param {string|number} speciesId - Species ID
   * @returns {string} Full URL
   */
  buildSpeciesUrl(speciesId) {
    const path = this.config.paths.species.replace('{id}', speciesId);
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
      const data = {
        id: speciesId,
        name: this.extractName(html),
        types: this.extractTypes(html),
        stats: this.extractStats(html),
        abilities: this.extractAbilities(html),
        moves: this.extractMoves(html),
        description: this.extractDescription(html),
        locations: this.extractLocations(html),
        evolution: this.extractEvolution(html)
      };

      return data;
    } catch (error) {
      logger.error(`Failed to parse Serebii page for ${speciesId}:`, error.message);
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
    // This would parse the type information
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
   * Extract locations from HTML
   * @param {string} html - HTML content
   * @returns {Array<string>} Locations array
   */
  extractLocations(html) {
    // This would extract location information
    return []; // Placeholder
  }

  /**
   * Extract evolution information from HTML
   * @param {string} html - HTML content
   * @returns {Object} Evolution data
   */
  extractEvolution(html) {
    // This would extract evolution chain
    return {}; // Placeholder
  }

  /**
   * Get crawler statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      source: 'serebii',
      baseUrl: this.baseUrl,
      rateLimit: this.config.rateLimit,
      cacheStats: this.getCacheStats(),
      circuitBreakerState: this.circuitBreaker.state
    };
  }
}