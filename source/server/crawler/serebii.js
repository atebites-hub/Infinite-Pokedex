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
import * as cheerio from 'cheerio';

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
        timestamp: result.timestamp,
      };
    } catch (error) {
      logger.error(
        `Failed to crawl Serebii species ${speciesId}:`,
        error.message
      );
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
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        errors.push({ speciesId, error: error.message });
        logger.warn(`Failed to crawl species ${speciesId}:`, error.message);
      }
    }

    logger.info(
      `Serebii crawl completed: ${results.length} success, ${errors.length} errors`
    );
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
      const $ = cheerio.load(html);

      const data = {
        id: speciesId,
        name: this.extractName($),
        types: this.extractTypes($),
        stats: this.extractStats($),
        abilities: this.extractAbilities($),
        moves: this.extractMoves($),
        description: this.extractDescription($),
        locations: this.extractLocations($),
        evolution: this.extractEvolution($),
      };

      return data;
    } catch (error) {
      logger.error(
        `Failed to parse Serebii page for ${speciesId}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Extract Pokémon name from HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {string} Pokémon name
   */
  extractName($) {
    // Try multiple selectors for name based on Serebii structure
    const selectors = ['h1', '.content h1', '.pokedex-title', 'title'];

    for (const selector of selectors) {
      const name = $(selector).first().text().trim();
      if (name && name !== 'Serebii.net') {
        // Clean up the name (remove extra text, numbers, etc.)
        return this.cleanText(name);
      }
    }

    return 'Unknown';
  }

  /**
   * Extract Pokémon types from HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<string>} Type array
   */
  extractTypes($) {
    const types = [];

    // Look for type information in various locations
    $('.tab table tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length >= 2) {
        const label = cells.first().text().trim().toLowerCase();
        const value = cells.eq(1).text().trim();

        if (label.includes('type') && value) {
          // Split by common separators and clean up
          const typeList = value
            .split(/[,/&]/)
            .map((t) => t.trim())
            .filter((t) => t);
          types.push(...typeList);
        }
      }
    });

    // Also look for type images or links
    $('img[src*="type"], a[href*="type"]').each((i, element) => {
      const $el = $(element);
      const alt = $el.attr('alt') || $el.text().trim();
      if (alt && !types.includes(alt)) {
        types.push(alt);
      }
    });

    return types.length > 0 ? types : ['Normal'];
  }

  /**
   * Extract base stats from HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Object} Base stats
   */
  extractStats($) {
    const stats = {
      hp: 0,
      attack: 0,
      defense: 0,
      spAttack: 0,
      spDefense: 0,
      speed: 0,
    };

    // Look for stats in table format
    $('.tab table tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length >= 2) {
        const label = cells.first().text().trim().toLowerCase();
        const value = parseInt(cells.eq(1).text().trim());

        if (!isNaN(value)) {
          switch (label) {
            case 'hp':
            case 'hit points':
              stats.hp = value;
              break;
            case 'attack':
              stats.attack = value;
              break;
            case 'defense':
              stats.defense = value;
              break;
            case 'sp. attack':
            case 'special attack':
            case 'sp attack':
              stats.spAttack = value;
              break;
            case 'sp. defense':
            case 'special defense':
            case 'sp defense':
              stats.spDefense = value;
              break;
            case 'speed':
              stats.speed = value;
              break;
          }
        }
      }
    });

    return stats;
  }

  /**
   * Extract abilities from HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<string>} Abilities array
   */
  extractAbilities($) {
    const abilities = [];

    // Look for abilities in table format
    $('.tab table tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length >= 2) {
        const label = cells.first().text().trim().toLowerCase();
        const value = cells.eq(1).text().trim();

        if (label.includes('ability') && value) {
          // Split by common separators and clean up
          const abilityList = value
            .split(/[,/&]/)
            .map((a) => a.trim())
            .filter((a) => a);
          abilities.push(...abilityList);
        }
      }
    });

    // Also look for ability links
    $('a[href*="ability"]').each((i, link) => {
      const ability = $(link).text().trim();
      if (ability && !abilities.includes(ability)) {
        abilities.push(ability);
      }
    });

    return abilities;
  }

  /**
   * Extract moves from HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Moves array
   */
  extractMoves($) {
    const moves = [];

    // Look for moves in various sections
    $('h2, h3').each((i, header) => {
      const $header = $(header);
      const text = $header.text().trim().toLowerCase();

      if (
        text.includes('move') ||
        text.includes('attack') ||
        text.includes('learnset')
      ) {
        const $list = $header.nextUntil('h2, h3');

        $list.find('tr, li').each((j, item) => {
          const $item = $(item);
          const moveText = $item.text().trim();

          if (moveText && moveText.length > 0) {
            // Parse move information
            const moveData = this.parseMoveData(moveText);
            if (moveData) {
              moves.push(moveData);
            }
          }
        });
      }
    });

    return moves;
  }

  /**
   * Extract description from HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {string} Description
   */
  extractDescription($) {
    // Look for description in various locations
    const selectors = [
      '.content p',
      '.pokedex-description',
      '.pokemon-description',
      'p',
    ];

    for (const selector of selectors) {
      const $desc = $(selector).first();
      const text = $desc.text().trim();

      if (text && text.length > 10) {
        // Ensure it's a meaningful description
        return this.cleanText(text);
      }
    }

    return '';
  }

  /**
   * Extract locations from HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<string>} Locations array
   */
  extractLocations($) {
    const locations = [];

    // Look for location information in various sections
    $('h2, h3').each((i, header) => {
      const $header = $(header);
      const text = $header.text().trim().toLowerCase();

      if (
        text.includes('location') ||
        text.includes('where') ||
        text.includes('found')
      ) {
        const $list = $header.nextUntil('h2, h3');

        $list.find('tr, li, p').each((j, item) => {
          const $item = $(item);
          const locationText = $item.text().trim();

          if (locationText && locationText.length > 0) {
            locations.push(this.cleanText(locationText));
          }
        });
      }
    });

    return locations;
  }

  /**
   * Extract evolution information from HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Object} Evolution data
   */
  extractEvolution($) {
    const evolution = {
      chain: [],
      method: '',
      level: null,
      item: null,
      condition: null,
    };

    // Look for evolution information
    $('h2, h3').each((i, header) => {
      const $header = $(header);
      const text = $header.text().trim().toLowerCase();

      if (text.includes('evolution') || text.includes('evolve')) {
        const $list = $header.nextUntil('h2, h3');

        $list.find('tr, li, p').each((j, item) => {
          const $item = $(item);
          const evolutionText = $item.text().trim();

          if (evolutionText && evolutionText.length > 0) {
            evolution.chain.push(this.cleanText(evolutionText));
          }
        });
      }
    });

    return evolution;
  }

  /**
   * Clean text content
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,]/g, '')
      .trim();
  }

  /**
   * Parse move data from text
   * @param {string} moveText - Move text to parse
   * @returns {Object|null} Parsed move data
   */
  parseMoveData(moveText) {
    // Basic move parsing - can be enhanced based on Serebii's format
    const parts = moveText.split(/\s+/);
    if (parts.length >= 1) {
      return {
        name: parts[0],
        type: parts[1] || 'Normal',
        power: parts[2] || '--',
        accuracy: parts[3] || '--',
        pp: parts[4] || '--',
      };
    }
    return null;
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
      circuitBreakerState: this.circuitBreaker.state,
    };
  }
}
