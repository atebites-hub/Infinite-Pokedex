#!/usr/bin/env node

/**
 * Infinite Pokédex Server
 * 
 * Main entry point for the Node.js crawler and data processing pipeline.
 * Handles web scraping, data normalization, tidbit synthesis, and CDN publishing.
 * 
 * @fileoverview Server entry point for Infinite Pokédex crawler system
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { logger } from './utils/logger.js';
import { BaseCrawler } from './crawler/base-crawler.js';
import { BulbapediaCrawler } from './crawler/bulbapedia.js';
import { SerebiiCrawler } from './crawler/serebii.js';
import { DataProcessor } from './processors/parser.js';
import { TidbitSynthesizer } from './processors/tidbit-synthesizer.js';
import { DatasetBuilder } from './builders/dataset-builder.js';
import { CDNPublisher } from './builders/cdn-publisher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main server class that orchestrates the crawler pipeline
 */
class InfinitePokedexServer {
  constructor() {
    this.config = this.loadConfig();
    this.crawlers = new Map();
    this.processor = null;
    this.synthesizer = null;
    this.builder = null;
    this.publisher = null;
  }

  /**
   * Load configuration from environment and config files
   * @returns {Object} Configuration object
   */
  loadConfig() {
    return {
      rateLimit: parseInt(process.env.CRAWL_RATE_LIMIT) || 1000, // requests per minute
      openRouterApiKey: process.env.OPENROUTER_API_KEY,
      cdnBucketUrl: process.env.CDN_BUCKET_URL,
      userAgent: 'InfinitePokedexBot/1.0 (+https://github.com/infinite-pokedex)',
      maxRetries: 3,
      retryDelay: 1000, // milliseconds
      cacheDir: join(__dirname, 'data', 'cache'),
      outputDir: join(__dirname, 'data', 'output'),
      tempDir: join(__dirname, 'data', 'temp')
    };
  }

  /**
   * Initialize all server components
   */
  async initialize() {
    try {
      logger.info('Initializing Infinite Pokédex Server...');

      // Initialize crawlers
      this.crawlers.set('bulbapedia', new BulbapediaCrawler(this.config));
      this.crawlers.set('serebii', new SerebiiCrawler(this.config));

      // Initialize processors
      this.processor = new DataProcessor(this.config);
      this.synthesizer = new TidbitSynthesizer(this.config);

      // Initialize builders
      this.builder = new DatasetBuilder(this.config);
      this.publisher = new CDNPublisher(this.config);

      logger.info('Server initialization complete');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  /**
   * Run the complete crawler pipeline
   * @param {Object} options - Pipeline options
   */
  async runPipeline(options = {}) {
    try {
      logger.info('Starting crawler pipeline...');

      const {
        species = [], // Array of species IDs to crawl
        skipCache = false,
        dryRun = false
      } = options;

      // Step 1: Crawl data from sources
      const rawData = await this.crawlData(species, skipCache);

      // Step 2: Process and normalize data
      const processedData = await this.processor.process(rawData);

      // Step 3: Generate tidbits via LLM
      const enrichedData = await this.synthesizer.enrich(processedData);

      // Step 4: Build dataset
      const dataset = await this.builder.build(enrichedData);

      // Step 5: Publish to CDN (unless dry run)
      if (!dryRun) {
        await this.publisher.publish(dataset);
      }

      logger.info('Pipeline completed successfully');
      return dataset;

    } catch (error) {
      logger.error('Pipeline failed:', error);
      throw error;
    }
  }

  /**
   * Crawl data from all configured sources
   * @param {Array} species - Species IDs to crawl
   * @param {boolean} skipCache - Skip cached data
   * @returns {Object} Raw crawled data
   */
  async crawlData(species, skipCache = false) {
    const results = {};

    for (const [source, crawler] of this.crawlers) {
      try {
        logger.info(`Crawling ${source}...`);
        const data = await crawler.crawl(species, skipCache);
        results[source] = data;
        logger.info(`Crawled ${Object.keys(data).length} entries from ${source}`);
      } catch (error) {
        logger.error(`Failed to crawl ${source}:`, error);
        // Continue with other sources
      }
    }

    return results;
  }

  /**
   * Health check endpoint
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      components: {
        crawlers: Array.from(this.crawlers.keys()),
        processor: !!this.processor,
        synthesizer: !!this.synthesizer,
        builder: !!this.builder,
        publisher: !!this.publisher
      }
    };
  }
}

// CLI interface
const currentModulePath = fileURLToPath(import.meta.url);
const scriptPath = resolve(process.argv[1]);
const isMainModule = currentModulePath === scriptPath;

if (isMainModule) {
  const server = new InfinitePokedexServer();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--species':
        options.species = args[++i]?.split(',').map(id => parseInt(id)) || [];
        break;
      case '--skip-cache':
        options.skipCache = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Infinite Pokédex Server

Usage: node index.js [options]

Options:
  --species <ids>     Comma-separated species IDs to crawl (default: all)
  --skip-cache        Skip cached data and re-crawl everything
  --dry-run           Run pipeline without publishing to CDN
  --help              Show this help message

Environment Variables:
  OPENROUTER_API_KEY  API key for OpenRouter LLM service
  CDN_BUCKET_URL      CDN bucket URL for publishing datasets
  CRAWL_RATE_LIMIT    Rate limit in requests per minute (default: 1000)
        `);
        process.exit(0);
        break;
    }
  }

  // Run the server
  (async () => {
    try {
      await server.initialize();
      await server.runPipeline(options);
      logger.info('Server completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Server failed:', error);
      process.exit(1);
    }
  })();
}

export { InfinitePokedexServer };