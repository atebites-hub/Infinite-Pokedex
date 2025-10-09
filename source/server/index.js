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

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { logger } from './utils/logger.js';
import { BulbapediaCrawler } from './crawler/bulbapedia.js';
import { SerebiiCrawler } from './crawler/serebii.js';
import { SmogonCrawler } from './crawler/smogon.js';
import { DataProcessor } from './processors/parser.js';
import { TidbitSynthesizer } from './processors/tidbit-synthesizer.js';
import { DatasetBuilder } from './builders/dataset-builder.js';
import { CDNPublisher } from './builders/cdn-publisher.js';
import {
  SourceRegistry,
  SpeciesIndexer,
  ManifestBuilder,
  CrawlPlanner,
} from './pipeline/indexing.js';

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
      userAgent:
        'InfinitePokedexBot/1.0 (+https://github.com/infinite-pokedex)',
      maxRetries: 3,
      retryDelay: 1000, // milliseconds
      cacheDir: join(__dirname, 'data', 'cache'),
      outputDir: join(__dirname, 'data', 'output'),
      tempDir: join(__dirname, 'data', 'temp'),
    };
  }

  /**
   * Initialize all server components
   */
  async initialize() {
    try {
      logger.info('Initializing Infinite Pokédex Server...');

      // Check environment variables
      logger.info('Environment check:', {
        hasApiKey: !!process.env.OPENROUTER_API_KEY,
        modelId: process.env.OPENROUTER_MODEL_ID,
        cdnUrl: process.env.CDN_BUCKET_URL,
      });

      // Initialize crawlers
      logger.info('Initializing crawlers...');
      this.crawlers.set('bulbapedia', new BulbapediaCrawler(this.config));
      this.crawlers.set('serebii', new SerebiiCrawler(this.config));
      this.crawlers.set('smogon', new SmogonCrawler(this.config));

      // Initialize processors
      logger.info('Initializing processors...');
      this.processor = new DataProcessor(this.config);

      // Configure tidbit synthesizer with OpenRouter API
      const synthesizerConfig = {
        ...this.config,
        openRouterApiKey: process.env.OPENROUTER_API_KEY,
        openRouterModelId: process.env.OPENROUTER_MODEL_ID,
        mockMode: false, // Use real API, not mock mode
      };
      logger.info('Initializing tidbit synthesizer...');
      this.synthesizer = new TidbitSynthesizer(synthesizerConfig);

      // Initialize builders
      logger.info('Initializing builders...');
      this.builder = new DatasetBuilder(this.config);
      this.publisher = new CDNPublisher(this.config);

      // Initialize indexing components
      logger.info('Initializing indexing components...');
      this.sourceRegistry = new SourceRegistry(this.config);
      this.speciesIndexer = new SpeciesIndexer(
        this.config,
        this.sourceRegistry
      );
      this.manifestBuilder = new ManifestBuilder(this.config);
      this.crawlPlanner = new CrawlPlanner(this.config, this.sourceRegistry);

      logger.info('Server initialization complete');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      logger.error('Error details:', error.message);
      logger.error('Stack trace:', error.stack);
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
        species = [],
        skipCache = false,
        dryRun = false,
        force = false,
      } = options;

      await this.sourceRegistry.initialize();

      const crawlPlan = this.crawlPlanner.buildPlan({ species, force });
      logger.info('Crawl plan ready', {
        totalPages: crawlPlan.totalPages,
        newPages: crawlPlan.newPages.length,
        skippedPages: crawlPlan.skippedPages.length,
      });

      if (crawlPlan.totalPages === 0 && !force) {
        logger.warn(
          'No pages to crawl based on current plan. Skipping pipeline.'
        );
        return {
          dataset: null,
          manifest: null,
          metadata: {
            message: 'No uncrawled pages found. Dataset unchanged.',
          },
        };
      }

      const rawData = await this.crawlData(crawlPlan, skipCache);
      const processedData = await this.processor.process(rawData);
      const enrichedData = await this.synthesizer.enrich(processedData);
      const dataset = await this.builder.build(enrichedData);

      if (!dryRun) {
        await this.publisher.publish(dataset);
      }

      const indexingResult = this.speciesIndexer.indexEnrichedData(
        enrichedData,
        crawlPlan
      );
      this.sourceRegistry.applyUpdates(indexingResult);
      await this.sourceRegistry.save();

      const manifest = await this.manifestBuilder.build(
        indexingResult,
        dataset.version
      );
      await this.manifestBuilder.persistManifest(manifest);
      await this.manifestBuilder.persistTidbitPayloads(
        indexingResult.tidbitPayloads
      );

      logger.info('Pipeline completed successfully');
      return { dataset, manifest };
    } catch (error) {
      logger.error('Pipeline failed:', error);
      throw error;
    }
  }

  /**
   * Crawl data from all configured sources
   * @param {Object} crawlPlan - Crawl plan with source tasks
   * @param {boolean} skipCache - Skip cached data
   * @returns {Object} Raw crawled data
   */
  async crawlData(crawlPlan, skipCache = false) {
    const results = {};

    for (const [source, crawler] of this.crawlers) {
      const planForSource = crawlPlan.sources[source];
      if (!planForSource) {
        logger.info(`No tasks scheduled for ${source}; skipping.`);
        continue;
      }

      try {
        logger.info(`Crawling ${source}...`, {
          totalTasks: planForSource.tasks.length,
        });

        const data = await this.executeCrawlTasks(
          source,
          crawler,
          planForSource,
          skipCache
        );

        results[source] = data;
        logger.info(
          `Completed crawling ${source}: ${planForSource.tasks.length} tasks`
        );
      } catch (error) {
        logger.error(`Failed to crawl ${source}:`, error);
      }
    }

    return results;
  }

  /**
   * Execute crawl tasks for a specific source based on plan
   * @param {string} source - Source key
   * @param {Object} crawler - Crawler instance
   * @param {Object} planForSource - Plan for the source
   * @param {boolean} skipCache - Skip cache flag
   * @returns {Promise<Object>} Crawl results with metadata
   */
  async executeCrawlTasks(source, crawler, planForSource, skipCache) {
    if (source === 'smogon') {
      const strategyData = await this.crawlSmogonStrategy(
        planForSource.tasks,
        skipCache
      );
      const forumData = await this.crawlSmogonForums(
        planForSource.tasks,
        skipCache
      );
      return {
        data: { strategy: strategyData, forums: forumData },
        sourcePlan: planForSource,
      };
    }

    const crawlResult = await crawler.crawlMultipleSpecies(
      planForSource.tasks,
      {
        skipCache,
      }
    );

    return {
      data: crawlResult,
      sourcePlan: planForSource,
    };
  }

  /**
   * Crawl Smogon strategy data
   * @param {Array} species - Species to crawl
   * @param {boolean} skipCache - Skip cached data
   * @returns {Object} Strategy data
   */
  async crawlSmogonStrategy(species, skipCache = false) {
    const smogonCrawler = this.crawlers.get('smogon');
    const results = [];
    const errors = [];

    for (const speciesId of species) {
      try {
        // Convert species ID to name for Smogon
        const speciesName = await this.getSpeciesName(speciesId);
        const result = await smogonCrawler.crawlStrategyPokemon(speciesName, {
          skipCache,
        });
        results.push(result);
      } catch (error) {
        errors.push({ speciesId, error: error.message });
        logger.warn(
          `Failed to crawl Smogon strategy for ${speciesId}:`,
          error.message
        );
      }
    }

    return { results, errors };
  }

  /**
   * Crawl Smogon forums for tidbits
   * @param {Array} species - Species to crawl
   * @param {boolean} skipCache - Skip cached data
   * @returns {Object} Forum data
   */
  async crawlSmogonForums(species, skipCache = false) {
    const smogonCrawler = this.crawlers.get('smogon');
    const results = [];
    const errors = [];

    for (const speciesId of species) {
      try {
        const speciesName = await this.getSpeciesName(speciesId);
        const result = await smogonCrawler.searchForumDiscussions(speciesName, {
          skipCache,
        });
        results.push(result);
      } catch (error) {
        errors.push({ speciesId, error: error.message });
        logger.warn(
          `Failed to crawl Smogon forums for ${speciesId}:`,
          error.message
        );
      }
    }

    return { results, errors };
  }

  /**
   * Get species name from ID
   * @param {string|number} speciesId - Species ID
   * @returns {string} Species name
   */
  async getSpeciesName(speciesId) {
    // This would typically query a species database or API
    // For now, we'll use a simple mapping
    if (typeof speciesId === 'string') {
      return speciesId;
    }

    // Convert ID to name (this would be more sophisticated in practice)
    const speciesNames = {
      1: 'bulbasaur',
      2: 'ivysaur',
      3: 'venusaur',
      4: 'charmander',
      5: 'charmeleon',
      6: 'charizard',
      // ... more mappings would be needed
    };

    return speciesNames[speciesId] || `pokemon-${speciesId}`;
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
        publisher: !!this.publisher,
      },
    };
  }
}

// CLI interface
// Use import.meta.url to detect if this module is being run directly
// This is more reliable than comparing process.argv paths
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] &&
    fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (isMainModule) {
  const server = new InfinitePokedexServer();

  // Handle command line arguments
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--species':
        options.species = args[++i]?.split(',').map((id) => parseInt(id)) || [];
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
