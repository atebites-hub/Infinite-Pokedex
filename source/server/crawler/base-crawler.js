/**
 * Base Crawler Class
 *
 * Provides foundational crawling functionality with rate limiting, retry logic,
 * robots.txt compliance, and circuit breaker patterns. All specific crawlers
 * extend this base class.
 *
 * @fileoverview Base crawler implementation with rate limiting and safety
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import axios from 'axios';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { defaultConfig } from '../config/crawler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Base crawler class with common functionality
 */
export class BaseCrawler {
  constructor(config) {
    this.config = { ...defaultConfig, ...config };
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.circuitBreaker = new CircuitBreaker(this.config.circuitBreaker);
    this.cache = new CacheManager(this.config.cache);
    this.robotsCache = new Map();

    // Initialize HTTP client
    this.client = axios.create({
      timeout: this.config.request.timeout,
      headers: this.config.request.headers,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Don't throw on 4xx
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(
      async (config) => {
        await this.rateLimiter.wait();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (this.shouldRetry(error)) {
          return this.retryRequest(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if robots.txt allows crawling a URL
   * @param {string} url - URL to check
   * @returns {Promise<boolean>} True if allowed
   */
  async checkRobotsTxt(url) {
    try {
      const domain = new URL(url).origin;

      // Check cache first
      if (this.robotsCache.has(domain)) {
        const robots = this.robotsCache.get(domain);
        return robots.isAllowed(url);
      }

      // Fetch robots.txt
      const robotsUrl = `${domain}/robots.txt`;
      const response = await this.client.get(robotsUrl);

      if (response.status === 200) {
        const robots = new RobotsParser(response.data);
        this.robotsCache.set(domain, robots);
        return robots.isAllowed(url);
      }

      // If robots.txt not found, assume allowed
      return true;
    } catch (error) {
      logger.warn(`Failed to check robots.txt for ${url}:`, error.message);
      return true; // Assume allowed on error
    }
  }

  /**
   * Crawl a single URL with caching and error handling
   * @param {string} url - URL to crawl
   * @param {Object} options - Crawl options
   * @returns {Promise<Object>} Crawl result
   */
  async crawlUrl(url, options = {}) {
    const {
      skipCache = false,
      usePuppeteer = false,
      waitForSelector = null,
    } = options;

    try {
      // Check robots.txt compliance
      const allowed = await this.checkRobotsTxt(url);
      if (!allowed) {
        throw new Error(`Robots.txt disallows crawling: ${url}`);
      }

      // Check cache first
      if (!skipCache && this.cache.has(url)) {
        const cached = await this.cache.get(url);
        logger.debug(`Cache hit for ${url}`);
        return cached;
      }

      // Check circuit breaker
      if (this.circuitBreaker.isOpen()) {
        throw new Error('Circuit breaker is open');
      }

      let response;
      if (usePuppeteer) {
        response = await this.crawlWithPuppeteer(url, { waitForSelector });
      } else {
        response = await this.client.get(url);
      }

      // Validate response
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = {
        url,
        status: response.status,
        headers: response.headers,
        data: response.data,
        timestamp: new Date().toISOString(),
        size: response.data.length,
      };

      // Cache successful response
      if (this.config.cache.enabled) {
        await this.cache.set(url, result);
      }

      // Update circuit breaker
      this.circuitBreaker.recordSuccess();

      return result;
    } catch (error) {
      // Update circuit breaker
      this.circuitBreaker.recordFailure();

      logger.error(`Failed to crawl ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Crawl multiple URLs with concurrency control
   * @param {Array<string>} urls - URLs to crawl
   * @param {Object} options - Crawl options
   * @returns {Promise<Array>} Crawl results
   */
  async crawlUrls(urls, options = {}) {
    const { concurrency = 3, ...crawlOptions } = options;
    const results = [];
    const errors = [];

    // Process URLs in batches
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);

      const promises = batch.map(async (url) => {
        try {
          const result = await this.crawlUrl(url, crawlOptions);
          return { success: true, result };
        } catch (error) {
          return { success: false, url, error: error.message };
        }
      });

      const batchResults = await Promise.all(promises);

      for (const batchResult of batchResults) {
        if (batchResult.success) {
          results.push(batchResult.result);
        } else {
          errors.push(batchResult);
        }
      }

      // Log progress
      logger.info(
        `Crawled ${Math.min(i + concurrency, urls.length)}/${urls.length} URLs`
      );
    }

    if (errors.length > 0) {
      logger.warn(`Crawling completed with ${errors.length} errors`);
    }

    return { results, errors };
  }

  /**
   * Determine if a request should be retried
   * @param {Error} error - Request error
   * @returns {boolean} True if should retry
   */
  shouldRetry(error) {
    if (!error.response) return false;

    const status = error.response.status;
    return this.config.retry.retryableStatusCodes.includes(status);
  }

  /**
   * Retry a failed request with exponential backoff
   * @param {Object} config - Request configuration
   * @returns {Promise} Retry result
   */
  async retryRequest(config) {
    const maxRetries = this.config.retry.maxRetries;
    const baseDelay = this.config.retry.baseDelay;
    const maxDelay = this.config.retry.maxDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      logger.debug(
        `Retrying request in ${delay}ms (attempt ${attempt}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        return await this.client(config);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        logger.debug(`Retry ${attempt} failed:`, error.message);
      }
    }
  }

  /**
   * Crawl with Puppeteer for JavaScript-heavy pages
   * @param {string} url - URL to crawl
   * @param {Object} options - Puppeteer options
   * @returns {Promise<Object>} Crawl result
   */
  async crawlWithPuppeteer(url, options = {}) {
    // This would be implemented by specific crawlers that need Puppeteer
    throw new Error('Puppeteer crawling not implemented in base class');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  async clearCache() {
    await this.cache.clear();
  }
}

/**
 * Rate limiter implementation
 */
class RateLimiter {
  constructor(config) {
    this.config = config;
    this.requests = [];
    this.burstTokens = config.burstLimit;
    this.lastRefill = Date.now();
  }

  /**
   * Wait if necessary to respect rate limits
   * @returns {Promise<void>}
   */
  async wait() {
    const now = Date.now();

    // Refill burst tokens
    const timeSinceRefill = now - this.lastRefill;
    const tokensToAdd =
      (timeSinceRefill / 1000) * this.config.requestsPerSecond;
    this.burstTokens = Math.min(
      this.burstTokens + tokensToAdd,
      this.config.burstLimit
    );
    this.lastRefill = now;

    // Check burst limit
    if (this.burstTokens <= 0) {
      const waitTime = 1000 / this.config.requestsPerSecond;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      // Don't decrement burstTokens when it's already zero or negative
      // Just refill after waiting
      this.burstTokens = Math.min(
        this.config.requestsPerSecond,
        this.config.burstLimit
      );
    } else {
      this.burstTokens--;
    }

    // Check minute limit
    const minuteAgo = now - 60000;
    this.requests = this.requests.filter((time) => time > minuteAgo);

    if (this.requests.length >= this.config.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(now);
  }
}

/**
 * Circuit breaker implementation
 */
class CircuitBreaker {
  constructor(config) {
    this.config = config;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  /**
   * Check if circuit breaker is open
   * @returns {boolean} True if open
   */
  isOpen() {
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      }
    }
    return this.state === 'OPEN';
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) {
        // Require 3 successes to close
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Record a failed request
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

/**
 * Cache manager implementation
 */
class CacheManager {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Check if URL is cached
   * @param {string} url - URL to check
   * @returns {boolean} True if cached
   */
  has(url) {
    const key = this.getCacheKey(url);
    return this.cache.has(key);
  }

  /**
   * Get cached data
   * @param {string} url - URL to get
   * @returns {Promise<Object>} Cached data
   */
  async get(url) {
    const key = this.getCacheKey(url);
    const cached = this.cache.get(key);

    if (cached) {
      // Check TTL
      const age = Date.now() - cached.timestamp;
      if (age < this.config.ttl) {
        this.stats.hits++;
        return cached.data;
      } else {
        this.cache.delete(key);
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set cached data
   * @param {string} url - URL to cache
   * @param {Object} data - Data to cache
   */
  async set(url, data) {
    const key = this.getCacheKey(url);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    this.stats.sets++;
  }

  /**
   * Generate cache key for URL
   * @param {string} url - URL
   * @returns {string} Cache key
   */
  getCacheKey(url) {
    return Buffer.from(url).toString('base64');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  /**
   * Clear cache
   */
  async clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }
}

/**
 * Simple robots.txt parser
 */
class RobotsParser {
  constructor(robotsText) {
    this.rules = this.parseRobotsTxt(robotsText);
  }

  /**
   * Parse robots.txt content
   * @param {string} robotsText - robots.txt content
   * @returns {Array} Parsed rules
   */
  parseRobotsTxt(robotsText) {
    const rules = [];
    const lines = robotsText.split('\n');
    let currentUserAgent = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Skip lines that don't contain a colon
      if (!trimmed.includes(':')) continue;

      const [directive, value] = trimmed.split(':').map((s) => s.trim());

      if (directive.toLowerCase() === 'user-agent') {
        currentUserAgent = value.toLowerCase();
      } else if (directive.toLowerCase() === 'disallow' && currentUserAgent) {
        rules.push({
          userAgent: currentUserAgent,
          path: value,
          allow: false,
        });
      } else if (directive.toLowerCase() === 'allow' && currentUserAgent) {
        rules.push({
          userAgent: currentUserAgent,
          path: value,
          allow: true,
        });
      }
    }

    return rules;
  }

  /**
   * Check if URL is allowed
   * @param {string} url - URL to check
   * @returns {boolean} True if allowed
   */
  isAllowed(url) {
    const urlPath = new URL(url).pathname;

    // Check for specific rules (more specific first)
    const applicableRules = this.rules
      .filter(
        (rule) =>
          rule.userAgent === '*' || rule.userAgent === 'infinitepokedexbot'
      )
      .sort((a, b) => b.path.length - a.path.length);

    for (const rule of applicableRules) {
      if (urlPath.startsWith(rule.path)) {
        return rule.allow;
      }
    }

    // Default to allowed if no specific rule
    return true;
  }
}
