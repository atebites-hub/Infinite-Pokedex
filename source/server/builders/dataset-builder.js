/**
 * Dataset Builder
 *
 * Assembles processed species data into a canonical dataset with versioning,
 * content hashing, and integrity validation.
 *
 * @fileoverview Dataset building and versioning
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Dataset builder for assembling final datasets
 */
export class DatasetBuilder {
  constructor(config) {
    this.config = config;
    this.outputDir =
      config.outputDir || join(__dirname, '..', 'data', 'output');
    this.tempDir = config.tempDir || join(__dirname, '..', 'data', 'temp');
  }

  /**
   * Build complete dataset from enriched data
   * @param {Object} enrichedData - Enriched species data
   * @returns {Promise<Object>} Built dataset with metadata
   */
  async build(enrichedData) {
    try {
      logger.info('Building dataset...');

      const version = this.generateVersion();
      const dataset = {
        version,
        timestamp: new Date().toISOString(),
        species: {},
        metadata: {
          totalSpecies: 0,
          totalTidbits: 0,
          sources: new Set(),
          contentHash: '',
        },
      };

      // Process each species
      for (const [speciesId, speciesData] of Object.entries(enrichedData)) {
        try {
          const canonicalSpecies = await this.buildSpecies(
            speciesId,
            speciesData
          );
          dataset.species[speciesId] = canonicalSpecies;

          // Update metadata
          dataset.metadata.totalSpecies++;
          dataset.metadata.totalTidbits += (speciesData.tidbits || []).length;

          if (speciesData.sources) {
            Object.keys(speciesData.sources).forEach((source) => {
              dataset.metadata.sources.add(source);
            });
          }
        } catch (error) {
          logger.error(`Failed to build species ${speciesId}:`, error.message);
          // Continue with other species
        }
      }

      // Convert Set to Array for JSON serialization
      dataset.metadata.sources = Array.from(dataset.metadata.sources);

      // Generate content hash
      dataset.metadata.contentHash = this.generateContentHash(dataset);

      // Create species index
      const speciesIndex = this.createSpeciesIndex(dataset.species);

      // Build final dataset structure
      const finalDataset = {
        version: dataset.version,
        timestamp: dataset.timestamp,
        metadata: dataset.metadata,
        species: {
          index: speciesIndex,
          data: dataset.species,
        },
      };

      logger.info(
        `Dataset built successfully: ${dataset.metadata.totalSpecies} species, ${dataset.metadata.totalTidbits} tidbits`
      );
      return finalDataset;
    } catch (error) {
      logger.error('Dataset building failed:', error);
      throw error;
    }
  }

  /**
   * Build canonical species data
   * @param {string} speciesId - Species ID
   * @param {Object} speciesData - Enriched species data
   * @returns {Promise<Object>} Canonical species data
   */
  async buildSpecies(speciesId, speciesData) {
    const canonical = {
      id: parseInt(speciesId),
      name: speciesData.name || 'Unknown',
      region: this.determineRegion(speciesId),
      types: speciesData.types || ['Normal'],
      height_m: this.extractHeight(speciesData),
      weight_kg: this.extractWeight(speciesData),
      gender_ratio: this.extractGenderRatio(speciesData),
      catch_rate: this.extractCatchRate(speciesData),
      abilities: speciesData.abilities || [],
      locations: speciesData.locations || [],
      moves: this.formatMoves(speciesData.moves || []),
      entries: this.formatEntries(speciesData.description),
      sources: this.formatSources(speciesData.sources || {}),
      tidbits: this.formatTidbits(speciesData.tidbits || []),
      image: this.formatImage(speciesData.images || []),
      hash: '',
    };

    // Generate content hash
    canonical.hash = this.generateSpeciesHash(canonical);

    return canonical;
  }

  /**
   * Determine Pokémon region based on ID
   * @param {string} speciesId - Species ID
   * @returns {string} Region name
   */
  determineRegion(speciesId) {
    const id = parseInt(speciesId);

    if (id <= 151) return 'Kanto';
    if (id <= 251) return 'Johto';
    if (id <= 386) return 'Hoenn';
    if (id <= 493) return 'Sinnoh';
    if (id <= 649) return 'Unova';
    if (id <= 721) return 'Kalos';
    if (id <= 809) return 'Alola';
    if (id <= 905) return 'Galar';
    return 'Paldea';
  }

  /**
   * Extract height from species data
   * @param {Object} speciesData - Species data
   * @returns {number} Height in meters
   */
  extractHeight(speciesData) {
    // This would parse height from various sources
    // For now, return a default value
    return 1.0;
  }

  /**
   * Extract weight from species data
   * @param {Object} speciesData - Species data
   * @returns {number} Weight in kilograms
   */
  extractWeight(speciesData) {
    // This would parse weight from various sources
    // For now, return a default value
    return 10.0;
  }

  /**
   * Extract gender ratio from species data
   * @param {Object} speciesData - Species data
   * @returns {Object} Gender ratio
   */
  extractGenderRatio(speciesData) {
    // This would parse gender ratio from various sources
    // For now, return a default value
    return { male: 50, female: 50 };
  }

  /**
   * Extract catch rate from species data
   * @param {Object} speciesData - Species data
   * @returns {number} Catch rate
   */
  extractCatchRate(speciesData) {
    // This would parse catch rate from various sources
    // For now, return a default value
    return 45;
  }

  /**
   * Format moves data
   * @param {Array} moves - Raw moves data
   * @returns {Array} Formatted moves
   */
  formatMoves(moves) {
    return moves.slice(0, 50).map((move) => ({
      name: move.name || 'Unknown Move',
      method: move.method || 'Level Up',
      level: move.level || 1,
      type: move.type || 'Normal',
      power: move.power || 0,
      accuracy: move.accuracy || 100,
    }));
  }

  /**
   * Format description entries
   * @param {string} description - Raw description
   * @returns {Array} Formatted entries
   */
  formatEntries(description) {
    if (!description) return [];

    // Split into sentences and clean
    const sentences = description
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, 3); // Limit to 3 entries

    return sentences;
  }

  /**
   * Format source references
   * @param {Object} sources - Source data
   * @returns {Object} Formatted sources
   */
  formatSources(sources) {
    const formatted = {};

    for (const [source, data] of Object.entries(sources)) {
      formatted[source] = {
        url: data.url || '',
        timestamp: data.timestamp || new Date().toISOString(),
      };
    }

    return formatted;
  }

  /**
   * Format tidbits data
   * @param {Array} tidbits - Raw tidbits
   * @returns {Array} Formatted tidbits
   */
  formatTidbits(tidbits) {
    return tidbits.slice(0, 7).map((tidbit) => ({
      title: tidbit.title || 'Unknown Title',
      body: tidbit.body || 'No description available',
      sourceRefs: tidbit.sourceRefs || [],
      quality: tidbit.quality || {},
    }));
  }

  /**
   * Format image data
   * @param {Array} images - Raw images
   * @returns {Object} Formatted image data
   */
  formatImage(images) {
    if (images.length === 0) {
      return {
        base: '',
        license: 'unknown',
      };
    }

    const primaryImage = images[0];
    return {
      base: primaryImage.src || '',
      license: 'attribution-required',
    };
  }

  /**
   * Create species index
   * @param {Object} species - Species data
   * @returns {Object} Species index
   */
  createSpeciesIndex(species) {
    const index = {};

    for (const [speciesId, speciesData] of Object.entries(species)) {
      index[speciesId] = {
        id: speciesData.id,
        name: speciesData.name,
        types: speciesData.types,
        hash: speciesData.hash,
        lastUpdated: new Date().toISOString(),
      };
    }

    return index;
  }

  /**
   * Generate version identifier
   * @returns {string} Version string
   */
  generateVersion() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}-${hour}${minute}`;
  }

  /**
   * Generate content hash for dataset
   * @param {Object} dataset - Dataset object
   * @returns {string} Content hash
   */
  generateContentHash(dataset) {
    const content = JSON.stringify(dataset, null, 0);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate content hash for species
   * @param {Object} species - Species data
   * @returns {string} Content hash
   */
  generateSpeciesHash(species) {
    // Create a copy without the hash field
    const { hash, ...speciesWithoutHash } = species;
    const content = JSON.stringify(speciesWithoutHash, null, 0);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Validate dataset integrity
   * @param {Object} dataset - Dataset to validate
   * @returns {Object} Validation result
   */
  validateDataset(dataset) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Check required fields
    if (!dataset.version) {
      result.valid = false;
      result.errors.push('Missing version');
    }

    if (!dataset.metadata) {
      result.valid = false;
      result.errors.push('Missing metadata');
    }

    if (!dataset.species) {
      result.valid = false;
      result.errors.push('Missing species data');
    }

    // Check species data
    if (dataset.species && dataset.species.data) {
      for (const [speciesId, speciesData] of Object.entries(
        dataset.species.data
      )) {
        if (!speciesData.id) {
          result.warnings.push(`Species ${speciesId} missing ID`);
        }
        if (!speciesData.name) {
          result.warnings.push(`Species ${speciesId} missing name`);
        }
        if (!speciesData.types || speciesData.types.length === 0) {
          result.warnings.push(`Species ${speciesId} missing types`);
        }
      }
    }

    return result;
  }

  /**
   * Get builder statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      outputDir: this.outputDir,
      tempDir: this.tempDir,
    };
  }
}
