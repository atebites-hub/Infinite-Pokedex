/**
 * CDN Publisher
 *
 * Handles publishing datasets to CDN with atomic updates, versioning,
 * and rollback support.
 *
 * @fileoverview CDN publishing and deployment
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import {
  getCDNConfig,
  generateCDNUrl,
  generateLatestUrl,
} from '../config/cdn.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * CDN publisher for dataset deployment
 */
export class CDNPublisher {
  constructor(config) {
    this.config = config;
    this.cdnConfig = getCDNConfig(config.cdnProvider || 'aws');
    this.baseUrl = config.cdnBucketUrl;

    if (!this.baseUrl) {
      throw new Error('CDN bucket URL is required');
    }

    // Initialize HTTP client for CDN operations
    this.client = axios.create({
      timeout: this.cdnConfig.upload.timeout,
      headers: {
        'User-Agent': 'InfinitePokedexBot/1.0',
      },
    });
  }

  /**
   * Publish dataset to CDN
   * @param {Object} dataset - Dataset to publish
   * @returns {Promise<Object>} Publishing result
   */
  async publish(dataset) {
    try {
      logger.info(`Publishing dataset version ${dataset.version} to CDN...`);

      const version = dataset.version;
      const result = {
        version,
        timestamp: new Date().toISOString(),
        urls: {},
        errors: [],
      };

      // Create versioned directory structure
      const versionPath = `v${version}`;

      // Publish species index
      const indexUrl = await this.publishSpeciesIndex(dataset, versionPath);
      result.urls.index = indexUrl;

      // Publish individual species files
      const speciesUrls = await this.publishSpeciesFiles(
        dataset.species.data,
        versionPath
      );
      result.urls.species = speciesUrls;

      // Publish metadata
      const metadataUrl = await this.publishMetadata(dataset, versionPath);
      result.urls.metadata = metadataUrl;

      // Update latest alias
      await this.updateLatestAlias(versionPath);

      // Run health checks
      const healthCheck = await this.runHealthChecks(result.urls);
      result.healthCheck = healthCheck;

      logger.info(
        `Dataset published successfully: ${Object.keys(speciesUrls).length} species files`
      );
      return result;
    } catch (error) {
      logger.error('CDN publishing failed:', error);
      throw error;
    }
  }

  /**
   * Publish species index
   * @param {Object} dataset - Dataset object
   * @param {string} versionPath - Version path
   * @returns {Promise<string>} Published URL
   */
  async publishSpeciesIndex(dataset, versionPath) {
    try {
      const indexData = {
        version: dataset.version,
        timestamp: dataset.timestamp,
        metadata: dataset.metadata,
        species: dataset.species.index,
      };

      const content = JSON.stringify(indexData, null, 2);
      const url = `${versionPath}/species/index.json`;

      await this.uploadFile(url, content, 'application/json');

      const fullUrl = generateCDNUrl(
        this.baseUrl,
        versionPath,
        'species/index.json'
      );
      logger.info(`Published species index: ${fullUrl}`);

      return fullUrl;
    } catch (error) {
      logger.error('Failed to publish species index:', error.message);
      throw error;
    }
  }

  /**
   * Publish individual species files
   * @param {Object} speciesData - Species data
   * @param {string} versionPath - Version path
   * @returns {Promise<Object>} Published URLs
   */
  async publishSpeciesFiles(speciesData, versionPath) {
    const urls = {};
    const errors = [];

    // Process species in batches
    const speciesIds = Object.keys(speciesData);
    const batchSize = this.cdnConfig.upload.concurrency;

    for (let i = 0; i < speciesIds.length; i += batchSize) {
      const batch = speciesIds.slice(i, i + batchSize);

      const promises = batch.map(async (speciesId) => {
        try {
          const species = speciesData[speciesId];
          const content = JSON.stringify(species, null, 2);
          const url = `${versionPath}/species/${speciesId}.json`;

          await this.uploadFile(url, content, 'application/json');

          const fullUrl = generateCDNUrl(
            this.baseUrl,
            versionPath,
            `species/${speciesId}.json`
          );
          return { speciesId, url: fullUrl };
        } catch (error) {
          logger.error(
            `Failed to publish species ${speciesId}:`,
            error.message
          );
          return { speciesId, error: error.message };
        }
      });

      const batchResults = await Promise.all(promises);

      for (const result of batchResults) {
        if (result.error) {
          errors.push(result);
        } else {
          urls[result.speciesId] = result.url;
        }
      }

      // Log progress
      logger.info(
        `Published ${Math.min(i + batchSize, speciesIds.length)}/${speciesIds.length} species files`
      );
    }

    if (errors.length > 0) {
      logger.warn(`Publishing completed with ${errors.length} errors`);
    }

    return urls;
  }

  /**
   * Publish metadata file
   * @param {Object} dataset - Dataset object
   * @param {string} versionPath - Version path
   * @returns {Promise<string>} Published URL
   */
  async publishMetadata(dataset, versionPath) {
    try {
      const metadata = {
        version: dataset.version,
        timestamp: dataset.timestamp,
        metadata: dataset.metadata,
        urls: {
          speciesIndex: generateCDNUrl(
            this.baseUrl,
            versionPath,
            'species/index.json'
          ),
          latest: generateLatestUrl(this.baseUrl, 'species/index.json'),
        },
      };

      const content = JSON.stringify(metadata, null, 2);
      const url = `${versionPath}/metadata.json`;

      await this.uploadFile(url, content, 'application/json');

      const fullUrl = generateCDNUrl(
        this.baseUrl,
        versionPath,
        'metadata.json'
      );
      logger.info(`Published metadata: ${fullUrl}`);

      return fullUrl;
    } catch (error) {
      logger.error('Failed to publish metadata:', error.message);
      throw error;
    }
  }

  /**
   * Upload file to CDN
   * @param {string} path - File path
   * @param {string} content - File content
   * @param {string} contentType - Content type
   * @returns {Promise<void>}
   */
  async uploadFile(path, content, contentType) {
    const url = `${this.baseUrl}/${path}`;

    try {
      const response = await this.client.put(url, content, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': this.cdnConfig.cache.static['Cache-Control'],
          ...this.cdnConfig.security,
          ...this.cdnConfig.cors,
        },
      });

      if (response.status >= 400) {
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      logger.error(`Failed to upload ${path}:`, error.message);
      throw error;
    }
  }

  /**
   * Update latest alias
   * @param {string} versionPath - Version path to alias
   * @returns {Promise<void>}
   */
  async updateLatestAlias(versionPath) {
    try {
      // This would depend on the CDN provider
      // For now, we'll create a latest.json file
      const latestData = {
        version: versionPath.replace('v', ''),
        timestamp: new Date().toISOString(),
        url: generateCDNUrl(this.baseUrl, versionPath, 'species/index.json'),
      };

      const content = JSON.stringify(latestData, null, 2);
      await this.uploadFile('latest.json', content, 'application/json');

      logger.info(`Updated latest alias to version ${versionPath}`);
    } catch (error) {
      logger.error('Failed to update latest alias:', error.message);
      throw error;
    }
  }

  /**
   * Run health checks on published content
   * @param {Object} urls - Published URLs
   * @returns {Promise<Object>} Health check results
   */
  async runHealthChecks(urls) {
    const results = {
      passed: 0,
      failed: 0,
      errors: [],
    };

    const checkUrls = [urls.index, urls.metadata];

    // Add a few species URLs for testing
    const speciesUrls = Object.values(urls.species || {}).slice(0, 3);
    checkUrls.push(...speciesUrls);

    for (const url of checkUrls) {
      try {
        const response = await this.client.head(url, { timeout: 10000 });

        if (response.status === 200) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(
            `Health check failed for ${url}: ${response.status}`
          );
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Health check error for ${url}: ${error.message}`);
      }
    }

    logger.info(
      `Health checks completed: ${results.passed} passed, ${results.failed} failed`
    );
    return results;
  }

  /**
   * Rollback to previous version
   * @param {string} version - Version to rollback to
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(version) {
    try {
      logger.info(`Rolling back to version ${version}...`);

      const versionPath = `v${version}`;

      // Update latest alias
      await this.updateLatestAlias(versionPath);

      // Run health checks
      const healthCheck = await this.runHealthChecks({
        index: generateCDNUrl(this.baseUrl, versionPath, 'species/index.json'),
        metadata: generateCDNUrl(this.baseUrl, versionPath, 'metadata.json'),
      });

      logger.info(`Rollback completed to version ${version}`);
      return {
        version,
        timestamp: new Date().toISOString(),
        healthCheck,
      };
    } catch (error) {
      logger.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Get publishing statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      baseUrl: this.baseUrl,
      cdnConfig: this.cdnConfig,
      uploadConcurrency: this.cdnConfig.upload.concurrency,
      uploadTimeout: this.cdnConfig.upload.timeout,
    };
  }
}
