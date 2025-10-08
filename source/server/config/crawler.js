/**
 * Crawler Configuration
 * 
 * Defines rate limits, retry policies, and crawling behavior for different sources.
 * Ensures respectful crawling with robots.txt compliance and exponential backoff.
 * 
 * @fileoverview Crawler configuration and rate limiting
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

/**
 * Default crawler configuration
 */
export const defaultConfig = {
  // Rate limiting
  rateLimit: {
    requestsPerMinute: 1000,
    requestsPerSecond: 10,
    burstLimit: 50,
    backoffMultiplier: 2,
    maxBackoffDelay: 30000 // 30 seconds
  },

  // Retry policy
  retry: {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000,  // 30 seconds
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
  },

  // Request configuration
  request: {
    timeout: 30000, // 30 seconds
    userAgent: 'InfinitePokedexBot/1.0 (+https://github.com/infinite-pokedex)',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  },

  // Cache configuration
  cache: {
    enabled: true,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 100 * 1024 * 1024, // 100MB
    compression: true
  },

  // Circuit breaker
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 300000 // 5 minutes
  }
};

/**
 * Source-specific configurations
 */
export const sourceConfigs = {
  bulbapedia: {
    baseUrl: 'https://bulbapedia.bulbagarden.net',
    robotsUrl: 'https://bulbapedia.bulbagarden.net/robots.txt',
    rateLimit: {
      requestsPerMinute: 60, // More conservative for Bulbapedia
      requestsPerSecond: 1,
      burstLimit: 5
    },
    paths: {
      species: '/wiki/{name}_(Pokémon)',
      search: '/wiki/Special:Search'
    },
    selectors: {
      title: 'h1#firstHeading',
      content: '#mw-content-text',
      infobox: '.infobox',
      stats: '.infobox tr',
      moves: '.mw-parser-output ul li'
    }
  },

  serebii: {
    baseUrl: 'https://www.serebii.net',
    robotsUrl: 'https://www.serebii.net/robots.txt',
    rateLimit: {
      requestsPerMinute: 120,
      requestsPerSecond: 2,
      burstLimit: 10
    },
    paths: {
      species: '/pokedex/{id}.shtml',
      search: '/pokedex/'
    },
    selectors: {
      title: 'h1',
      content: '.content',
      stats: '.tab table tr',
      moves: '.tab table tr td'
    }
  },

  smogon: {
    baseUrl: 'https://www.smogon.com',
    robotsUrl: 'https://www.smogon.com/robots.txt',
    rateLimit: {
      requestsPerMinute: 60, // Conservative for Smogon
      requestsPerSecond: 1,
      burstLimit: 5
    },
    paths: {
      strategy: '/dex/sv/pokemon/{name}/',
      forums: '/forums/',
      search: '/dex/sv/pokemon/'
    },
    selectors: {
      title: 'h1',
      content: '.dex-pokemon-page',
      strategy: '.dex-pokemon-page .dex-pokemon-gen9dex',
      moves: '.dex-pokemon-page .dex-pokemon-moves',
      abilities: '.dex-pokemon-page .dex-pokemon-abilities',
      stats: '.dex-pokemon-page .dex-pokemon-stats',
      forumPosts: '.forum-post',
      forumContent: '.forum-post-content'
    }
  }
};

/**
 * Get configuration for a specific source
 * @param {string} source - Source name (bulbapedia, serebii)
 * @returns {Object} Merged configuration
 */
export function getSourceConfig(source) {
  const baseConfig = { ...defaultConfig };
  const sourceConfig = sourceConfigs[source];
  
  if (!sourceConfig) {
    throw new Error(`Unknown source: ${source}`);
  }

  // Merge configurations with source-specific overrides
  return {
    ...baseConfig,
    ...sourceConfig,
    rateLimit: {
      ...baseConfig.rateLimit,
      ...sourceConfig.rateLimit
    }
  };
}

/**
 * Validate configuration
 * @param {Object} config - Configuration to validate
 * @returns {boolean} True if valid
 */
export function validateConfig(config) {
  const required = ['rateLimit', 'retry', 'request', 'cache'];
  
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required configuration: ${key}`);
    }
  }

  // Validate rate limits
  if (config.rateLimit.requestsPerMinute <= 0) {
    throw new Error('requestsPerMinute must be positive');
  }

  if (config.rateLimit.requestsPerSecond <= 0) {
    throw new Error('requestsPerSecond must be positive');
  }

  // Validate retry configuration
  if (config.retry.maxRetries < 0) {
    throw new Error('maxRetries must be non-negative');
  }

  if (config.retry.baseDelay <= 0) {
    throw new Error('baseDelay must be positive');
  }

  return true;
}