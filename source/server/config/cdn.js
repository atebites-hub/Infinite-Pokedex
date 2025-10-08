/**
 * CDN Configuration
 *
 * Defines CDN upload settings, bucket configurations, and publishing policies.
 * Supports multiple CDN providers with consistent interface.
 *
 * @fileoverview CDN configuration and publishing settings
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

/**
 * CDN provider configurations
 */
export const cdnProviders = {
  aws: {
    name: 'AWS S3 + CloudFront',
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    cloudFrontDistributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID,
    endpoint: null, // Use default AWS endpoints
  },

  cloudflare: {
    name: 'Cloudflare R2',
    bucket: process.env.CF_R2_BUCKET,
    region: 'auto',
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
    endpoint: process.env.CF_R2_ENDPOINT,
  },

  vercel: {
    name: 'Vercel Blob',
    bucket: process.env.VERCEL_BLOB_BUCKET,
    token: process.env.VERCEL_BLOB_TOKEN,
    endpoint: 'https://api.vercel.com',
  },
};

/**
 * Default CDN configuration
 */
export const defaultConfig = {
  // Upload settings
  upload: {
    concurrency: 5,
    retries: 3,
    timeout: 30000, // 30 seconds
    chunkSize: 5 * 1024 * 1024, // 5MB
    compression: true,
  },

  // Cache settings
  cache: {
    // Static assets (images, JSON)
    static: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': 'application/json',
    },

    // Dynamic content (index files)
    dynamic: {
      'Cache-Control': 'public, max-age=60, must-revalidate',
      'Content-Type': 'application/json',
    },

    // Version files
    version: {
      'Cache-Control': 'public, max-age=300, must-revalidate',
      'Content-Type': 'application/json',
    },
  },

  // Security headers
  security: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },

  // CORS settings
  cors: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
    'Access-Control-Max-Age': '86400',
  },
};

/**
 * File type configurations
 */
export const fileTypes = {
  json: {
    contentType: 'application/json',
    compression: true,
    cacheControl: 'public, max-age=31536000, immutable',
  },

  png: {
    contentType: 'image/png',
    compression: false,
    cacheControl: 'public, max-age=31536000, immutable',
  },

  jpg: {
    contentType: 'image/jpeg',
    compression: false,
    cacheControl: 'public, max-age=31536000, immutable',
  },

  webp: {
    contentType: 'image/webp',
    compression: false,
    cacheControl: 'public, max-age=31536000, immutable',
  },

  svg: {
    contentType: 'image/svg+xml',
    compression: true,
    cacheControl: 'public, max-age=31536000, immutable',
  },
};

/**
 * Publishing strategy configuration
 */
export const publishingStrategy = {
  // Atomic publishing
  atomic: {
    enabled: true,
    tempPrefix: 'temp/',
    finalPrefix: 'v',
    aliasName: 'latest',
  },

  // Version management
  versioning: {
    format: 'YYYYMMDD-HHMM',
    maxVersions: 10,
    cleanupOldVersions: true,
  },

  // Rollback support
  rollback: {
    enabled: true,
    maxRollbackVersions: 5,
    rollbackDelay: 5000, // 5 seconds
  },

  // Health checks
  healthCheck: {
    enabled: true,
    endpoints: ['/species/index.json', '/species/1.json', '/images/base/1.png'],
    timeout: 10000,
    retries: 3,
  },
};

/**
 * Get CDN configuration for a specific provider
 * @param {string} provider - Provider name
 * @returns {Object} CDN configuration
 */
export function getCDNConfig(provider = 'aws') {
  const providerConfig = cdnProviders[provider];
  if (!providerConfig) {
    throw new Error(`Unknown CDN provider: ${provider}`);
  }

  return {
    ...defaultConfig,
    provider: providerConfig,
    // Override with provider-specific settings
    ...(provider === 'aws' && {
      upload: {
        ...defaultConfig.upload,
        region: providerConfig.region,
      },
    }),
  };
}

/**
 * Get file configuration for a specific file type
 * @param {string} filename - File name or path
 * @returns {Object} File configuration
 */
export function getFileConfig(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  const config = fileTypes[extension];

  if (!config) {
    // Default configuration for unknown file types
    return {
      contentType: 'application/octet-stream',
      compression: false,
      cacheControl: 'public, max-age=3600',
    };
  }

  return config;
}

/**
 * Generate CDN URL for a file
 * @param {string} baseUrl - CDN base URL
 * @param {string} version - Version identifier
 * @param {string} path - File path
 * @returns {string} Full CDN URL
 */
export function generateCDNUrl(baseUrl, version, path) {
  // Remove leading slash from path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Construct URL with version
  return `${baseUrl}/${version}/${cleanPath}`;
}

/**
 * Generate latest alias URL
 * @param {string} baseUrl - CDN base URL
 * @param {string} path - File path
 * @returns {string} Latest alias URL
 */
export function generateLatestUrl(baseUrl, path) {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/latest/${cleanPath}`;
}

/**
 * Validate CDN configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateCDNConfig(config) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check required fields
  const required = ['provider', 'upload', 'cache', 'security'];
  for (const field of required) {
    if (!config[field]) {
      result.valid = false;
      result.errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate provider configuration
  if (config.provider) {
    const providerRequired = ['name', 'bucket'];
    for (const field of providerRequired) {
      if (!config.provider[field]) {
        result.valid = false;
        result.errors.push(`Missing provider field: ${field}`);
      }
    }
  }

  // Validate upload settings
  if (config.upload) {
    if (config.upload.concurrency <= 0) {
      result.valid = false;
      result.errors.push('Upload concurrency must be positive');
    }
    if (config.upload.retries < 0) {
      result.valid = false;
      result.errors.push('Upload retries must be non-negative');
    }
  }

  return result;
}
