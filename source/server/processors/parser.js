/**
 * Data Processor and Parser
 * 
 * Handles HTML parsing, data normalization, and schema validation for
 * crawled Pokémon data from multiple sources.
 * 
 * @fileoverview Data processing and HTML parsing
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { validateSchema } from '../utils/validation.js';

/**
 * Data processor for crawled content
 */
export class DataProcessor {
  constructor(config) {
    this.config = config;
    this.schema = this.loadSchema();
  }

  /**
   * Process raw crawled data from all sources
   * @param {Object} rawData - Raw data from crawlers
   * @returns {Promise<Object>} Processed and normalized data
   */
  async process(rawData) {
    try {
      logger.info('Processing crawled data...');
      
      const processedData = {};
      
      // Process each source
      for (const [source, data] of Object.entries(rawData)) {
        logger.info(`Processing ${source} data...`);
        processedData[source] = await this.processSource(source, data);
      }

      // Merge and normalize data
      const normalizedData = await this.normalizeData(processedData);
      
      logger.info(`Processing complete: ${Object.keys(normalizedData).length} species processed`);
      return normalizedData;

    } catch (error) {
      logger.error('Data processing failed:', error);
      throw error;
    }
  }

  /**
   * Process data from a specific source
   * @param {string} source - Source name
   * @param {Object} data - Source data
   * @returns {Promise<Object>} Processed source data
   */
  async processSource(source, data) {
    const processed = {};

    for (const [speciesId, speciesData] of Object.entries(data)) {
      try {
        const processedSpecies = await this.processSpecies(source, speciesData);
        processed[speciesId] = processedSpecies;
      } catch (error) {
        logger.error(`Failed to process ${source} species ${speciesId}:`, error.message);
        // Continue with other species
      }
    }

    return processed;
  }

  /**
   * Process a single species from a source
   * @param {string} source - Source name
   * @param {Object} speciesData - Species data
   * @returns {Promise<Object>} Processed species data
   */
  async processSpecies(source, speciesData) {
    const { data, url, timestamp } = speciesData;
    
    // Parse HTML content
    const $ = cheerio.load(data);
    
    // Extract data based on source
    let parsedData;
    switch (source) {
      case 'bulbapedia':
        parsedData = this.parseBulbapedia($);
        break;
      case 'serebii':
        parsedData = this.parseSerebii($);
        break;
      default:
        throw new Error(`Unknown source: ${source}`);
    }

    // Add metadata
    parsedData.source = source;
    parsedData.url = url;
    parsedData.timestamp = timestamp;
    parsedData.processedAt = new Date().toISOString();

    return parsedData;
  }

  /**
   * Parse Bulbapedia HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Object} Parsed data
   */
  parseBulbapedia($) {
    const data = {
      name: this.extractName($),
      types: this.extractTypes($),
      stats: this.extractStats($),
      abilities: this.extractAbilities($),
      moves: this.extractMoves($),
      description: this.extractDescription($),
      trivia: this.extractTrivia($),
      images: this.extractImages($)
    };

    return data;
  }

  /**
   * Parse Serebii HTML
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Object} Parsed data
   */
  parseSerebii($) {
    const data = {
      name: this.extractName($),
      types: this.extractTypes($),
      stats: this.extractStats($),
      abilities: this.extractAbilities($),
      moves: this.extractMoves($),
      description: this.extractDescription($),
      locations: this.extractLocations($),
      evolution: this.extractEvolution($),
      images: this.extractImages($)
    };

    return data;
  }

  /**
   * Extract Pokémon name
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {string} Pokémon name
   */
  extractName($) {
    // Try multiple selectors for name
    const selectors = [
      'h1#firstHeading',
      'h1',
      '.infobox .infobox-title',
      '.pokedex-title'
    ];

    for (const selector of selectors) {
      const name = $(selector).first().text().trim();
      if (name) {
        return this.cleanText(name);
      }
    }

    return 'Unknown';
  }

  /**
   * Extract Pokémon types
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<string>} Types array
   */
  extractTypes($) {
    const types = [];
    
    // Look for type information in various places
    $('.infobox tr').each((i, row) => {
      const $row = $(row);
      const label = $row.find('th').text().trim().toLowerCase();
      
      if (label.includes('type')) {
        $row.find('td a').each((j, link) => {
          const type = $(link).text().trim();
          if (type && !types.includes(type)) {
            types.push(type);
          }
        });
      }
    });

    return types.length > 0 ? types : ['Normal'];
  }

  /**
   * Extract base stats
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
      speed: 0
    };

    // Look for stats table
    $('table tr').each((i, row) => {
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
              stats.spAttack = value;
              break;
            case 'sp. defense':
            case 'special defense':
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
   * Extract abilities
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<string>} Abilities array
   */
  extractAbilities($) {
    const abilities = [];
    
    $('.infobox tr').each((i, row) => {
      const $row = $(row);
      const label = $row.find('th').text().trim().toLowerCase();
      
      if (label.includes('ability') || label.includes('abilities')) {
        $row.find('td a').each((j, link) => {
          const ability = $(link).text().trim();
          if (ability && !abilities.includes(ability)) {
            abilities.push(ability);
          }
        });
      }
    });

    return abilities;
  }

  /**
   * Extract moves
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Moves array
   */
  extractMoves($) {
    const moves = [];
    
    // Look for moves in various sections
    $('h2, h3').each((i, header) => {
      const $header = $(header);
      const text = $header.text().trim().toLowerCase();
      
      if (text.includes('move') || text.includes('attack')) {
        const $list = $header.nextUntil('h2, h3');
        $list.find('li, tr').each((j, item) => {
          const moveText = $(item).text().trim();
          if (moveText) {
            moves.push({
              name: this.cleanText(moveText),
              source: 'parsed'
            });
          }
        });
      }
    });

    return moves.slice(0, 50); // Limit to 50 moves
  }

  /**
   * Extract description
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {string} Description
   */
  extractDescription($) {
    // Look for description in various places
    const selectors = [
      '.mw-parser-output p',
      '.content p',
      '.description p'
    ];

    for (const selector of selectors) {
      const $p = $(selector).first();
      const text = $p.text().trim();
      if (text && text.length > 50) {
        return this.cleanText(text);
      }
    }

    return '';
  }

  /**
   * Extract trivia
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<string>} Trivia array
   */
  extractTrivia($) {
    const trivia = [];
    
    $('h2, h3').each((i, header) => {
      const $header = $(header);
      const text = $header.text().trim().toLowerCase();
      
      if (text.includes('trivia') || text.includes('origin') || text.includes('name')) {
        const $list = $header.nextUntil('h2, h3');
        $list.find('li').each((j, item) => {
          const triviaText = $(item).text().trim();
          if (triviaText && triviaText.length > 10) {
            trivia.push(this.cleanText(triviaText));
          }
        });
      }
    });

    return trivia.slice(0, 10); // Limit to 10 trivia items
  }

  /**
   * Extract locations
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<string>} Locations array
   */
  extractLocations($) {
    const locations = [];
    
    $('h2, h3').each((i, header) => {
      const $header = $(header);
      const text = $header.text().trim().toLowerCase();
      
      if (text.includes('location') || text.includes('where')) {
        const $list = $header.nextUntil('h2, h3');
        $list.find('li, a').each((j, item) => {
          const location = $(item).text().trim();
          if (location && !locations.includes(location)) {
            locations.push(this.cleanText(location));
          }
        });
      }
    });

    return locations.slice(0, 20); // Limit to 20 locations
  }

  /**
   * Extract evolution information
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Object} Evolution data
   */
  extractEvolution($) {
    const evolution = {
      chain: [],
      method: '',
      level: null
    };

    // Look for evolution information
    $('.infobox tr').each((i, row) => {
      const $row = $(row);
      const label = $row.find('th').text().trim().toLowerCase();
      
      if (label.includes('evolution') || label.includes('evolve')) {
        const text = $row.find('td').text().trim();
        evolution.method = this.cleanText(text);
      }
    });

    return evolution;
  }

  /**
   * Extract images
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Array<Object>} Images array
   */
  extractImages($) {
    const images = [];
    
    $('img').each((i, img) => {
      const $img = $(img);
      const src = $img.attr('src');
      const alt = $img.attr('alt') || '';
      
      if (src && (alt.toLowerCase().includes('pokemon') || alt.toLowerCase().includes('pokémon'))) {
        images.push({
          src: this.normalizeImageUrl(src),
          alt: this.cleanText(alt),
          width: $img.attr('width'),
          height: $img.attr('height')
        });
      }
    });

    return images.slice(0, 5); // Limit to 5 images
  }

  /**
   * Normalize data from multiple sources
   * @param {Object} processedData - Processed data from all sources
   * @returns {Promise<Object>} Normalized data
   */
  async normalizeData(processedData) {
    const normalized = {};

    // Group by species ID
    const speciesGroups = {};
    
    for (const [source, data] of Object.entries(processedData)) {
      for (const [speciesId, speciesData] of Object.entries(data)) {
        if (!speciesGroups[speciesId]) {
          speciesGroups[speciesId] = {};
        }
        speciesGroups[speciesId][source] = speciesData;
      }
    }

    // Normalize each species
    for (const [speciesId, sources] of Object.entries(speciesGroups)) {
      try {
        const normalizedSpecies = await this.normalizeSpecies(speciesId, sources);
        normalized[speciesId] = normalizedSpecies;
      } catch (error) {
        logger.error(`Failed to normalize species ${speciesId}:`, error.message);
        // Continue with other species
      }
    }

    return normalized;
  }

  /**
   * Normalize a single species from multiple sources
   * @param {string} speciesId - Species ID
   * @param {Object} sources - Data from all sources
   * @returns {Promise<Object>} Normalized species data
   */
  async normalizeSpecies(speciesId, sources) {
    const normalized = {
      id: speciesId,
      name: '',
      types: [],
      stats: {},
      abilities: [],
      moves: [],
      description: '',
      trivia: [],
      locations: [],
      evolution: {},
      images: [],
      sources: {}
    };

    // Merge data from all sources
    for (const [source, data] of Object.entries(sources)) {
      normalized.sources[source] = {
        url: data.url,
        timestamp: data.timestamp
      };

      // Merge fields, preferring non-empty values
      if (data.name && !normalized.name) {
        normalized.name = data.name;
      }
      
      if (data.types && data.types.length > 0) {
        normalized.types = [...new Set([...normalized.types, ...data.types])];
      }
      
      if (data.stats && Object.keys(data.stats).length > 0) {
        normalized.stats = { ...normalized.stats, ...data.stats };
      }
      
      if (data.abilities && data.abilities.length > 0) {
        normalized.abilities = [...new Set([...normalized.abilities, ...data.abilities])];
      }
      
      if (data.moves && data.moves.length > 0) {
        normalized.moves = [...normalized.moves, ...data.moves];
      }
      
      if (data.description && !normalized.description) {
        normalized.description = data.description;
      }
      
      if (data.trivia && data.trivia.length > 0) {
        normalized.trivia = [...normalized.trivia, ...data.trivia];
      }
      
      if (data.locations && data.locations.length > 0) {
        normalized.locations = [...new Set([...normalized.locations, ...data.locations])];
      }
      
      if (data.evolution && Object.keys(data.evolution).length > 0) {
        normalized.evolution = { ...normalized.evolution, ...data.evolution };
      }
      
      if (data.images && data.images.length > 0) {
        normalized.images = [...normalized.images, ...data.images];
      }
    }

    // Validate against schema
    const validation = validateSchema(normalized, this.schema);
    if (!validation.valid) {
      logger.warn(`Schema validation failed for species ${speciesId}:`, validation.errors);
    }

    return normalized;
  }

  /**
   * Clean and normalize text
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,!?]/g, '')
      .trim();
  }

  /**
   * Normalize image URL
   * @param {string} url - Image URL
   * @returns {string} Normalized URL
   */
  normalizeImageUrl(url) {
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('/')) {
      return `https://bulbapedia.bulbagarden.net${url}`;
    }
    return url;
  }

  /**
   * Load data schema
   * @returns {Object} Data schema
   */
  loadSchema() {
    return {
      id: { type: 'string', required: true },
      name: { type: 'string', required: true },
      types: { type: 'array', required: true },
      stats: { type: 'object', required: false },
      abilities: { type: 'array', required: false },
      moves: { type: 'array', required: false },
      description: { type: 'string', required: false },
      trivia: { type: 'array', required: false },
      locations: { type: 'array', required: false },
      evolution: { type: 'object', required: false },
      images: { type: 'array', required: false },
      sources: { type: 'object', required: true }
    };
  }
}