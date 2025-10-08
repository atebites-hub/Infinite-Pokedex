#!/usr/bin/env node

/**
 * Server Test Script
 * 
 * Simple test script to verify server functionality and demonstrate usage.
 * 
 * @fileoverview Server testing and demonstration
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import { InfinitePokedexServer } from './index.js';
import { logger } from './utils/logger.js';

/**
 * Test server functionality
 */
async function testServer() {
  try {
    logger.info('Starting server test...');

    // Initialize server
    const server = new InfinitePokedexServer();
    await server.initialize();

    // Test health check
    const health = server.getHealthStatus();
    logger.info('Server health check:', health);

    // Test with a small dataset (dry run)
    const testSpecies = [1, 2, 3]; // Bulbasaur, Ivysaur, Venusaur
    
    logger.info(`Testing with species: ${testSpecies.join(', ')}`);
    
    const result = await server.runPipeline({
      species: testSpecies,
      dryRun: true, // Don't actually publish to CDN
      skipCache: false
    });

    logger.info('Test completed successfully!');
    logger.info(`Processed ${Object.keys(result.species || {}).length} species`);
    
    return result;

  } catch (error) {
    logger.error('Server test failed:', error);
    throw error;
  }
}

/**
 * Test individual components
 */
async function testComponents() {
  try {
    logger.info('Testing individual components...');

    // Test crawler configuration
    const { getSourceConfig } = await import('./config/crawler.js');
    const bulbapediaConfig = getSourceConfig('bulbapedia');
    logger.info('Bulbapedia config loaded:', {
      baseUrl: bulbapediaConfig.baseUrl,
      rateLimit: bulbapediaConfig.rateLimit.requestsPerMinute
    });

    // Test model configuration
    const { getModelConfig } = await import('./config/models.js');
    const modelConfig = getModelConfig('tidbitSynthesis');
    logger.info('Model config loaded:', {
      model: modelConfig.model,
      maxTokens: modelConfig.maxTokens
    });

    // Test CDN configuration
    const { getCDNConfig } = await import('./config/cdn.js');
    const cdnConfig = getCDNConfig('aws');
    logger.info('CDN config loaded:', {
      uploadConcurrency: cdnConfig.upload.concurrency,
      cacheControl: cdnConfig.cache.static['Cache-Control']
    });

    logger.info('Component tests completed successfully!');

  } catch (error) {
    logger.error('Component test failed:', error);
    throw error;
  }
}

/**
 * Main test function
 */
async function main() {
  try {
    logger.info('=== Infinite Pokédex Server Test ===');
    
    // Test components first
    await testComponents();
    
    // Test full server if environment variables are set
    if (process.env.OPENROUTER_API_KEY && process.env.CDN_BUCKET_URL) {
      await testServer();
    } else {
      logger.warn('Skipping full server test - missing environment variables:');
      logger.warn('- OPENROUTER_API_KEY');
      logger.warn('- CDN_BUCKET_URL');
      logger.info('Set these environment variables to run the full test');
    }

    logger.info('=== All tests completed successfully! ===');

  } catch (error) {
    logger.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}