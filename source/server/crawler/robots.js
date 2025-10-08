/**
 * Robots.txt Compliance Checker
 * 
 * Handles robots.txt fetching, parsing, and compliance checking for all crawlers.
 * Implements caching and respects crawl delays specified in robots.txt.
 * 
 * @fileoverview Robots.txt compliance and caching
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * Robots.txt compliance checker
 */
export class RobotsChecker {
  constructor() {
    this.cache = new Map();
    this.crawlDelays = new Map();
  }

  /**
   * Check if a URL is allowed by robots.txt
   * @param {string} url - URL to check
   * @param {string} userAgent - User agent string
   * @returns {Promise<boolean>} True if allowed
   */
  async isAllowed(url, userAgent = 'InfinitePokedexBot/1.0') {
    try {
      const domain = new URL(url).origin;
      const robots = await this.getRobotsTxt(domain);
      
      if (!robots) {
        return true; // Assume allowed if no robots.txt
      }

      return robots.isAllowed(url, userAgent);
    } catch (error) {
      logger.warn(`Failed to check robots.txt for ${url}:`, error.message);
      return true; // Assume allowed on error
    }
  }

  /**
   * Get crawl delay for a domain
   * @param {string} domain - Domain to check
   * @param {string} userAgent - User agent string
   * @returns {Promise<number>} Crawl delay in seconds
   */
  async getCrawlDelay(domain, userAgent = 'InfinitePokedexBot/1.0') {
    try {
      const robots = await this.getRobotsTxt(domain);
      
      if (!robots) {
        return 0; // No delay if no robots.txt
      }

      return robots.getCrawlDelay(userAgent);
    } catch (error) {
      logger.warn(`Failed to get crawl delay for ${domain}:`, error.message);
      return 0; // No delay on error
    }
  }

  /**
   * Get robots.txt for a domain
   * @param {string} domain - Domain to fetch robots.txt for
   * @returns {Promise<RobotsParser|null>} Parsed robots.txt or null
   */
  async getRobotsTxt(domain) {
    // Check cache first
    if (this.cache.has(domain)) {
      const cached = this.cache.get(domain);
      
      // Check if cache is still valid (24 hours)
      const age = Date.now() - cached.timestamp;
      if (age < 24 * 60 * 60 * 1000) {
        return cached.robots;
      }
    }

    try {
      const robotsUrl = `${domain}/robots.txt`;
      const response = await axios.get(robotsUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'InfinitePokedexBot/1.0'
        }
      });

      if (response.status === 200) {
        const robots = new RobotsParser(response.data);
        
        // Cache the result
        this.cache.set(domain, {
          robots,
          timestamp: Date.now()
        });

        return robots;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // No robots.txt found - cache this result too
        this.cache.set(domain, {
          robots: null,
          timestamp: Date.now()
        });
      }
      logger.debug(`No robots.txt found for ${domain}`);
    }

    return null;
  }

  /**
   * Clear robots.txt cache
   */
  clearCache() {
    this.cache.clear();
    this.crawlDelays.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      domains: Array.from(this.cache.keys())
    };
  }
}

/**
 * Robots.txt parser
 */
class RobotsParser {
  constructor(robotsText) {
    this.rules = this.parseRobotsTxt(robotsText);
    this.crawlDelays = this.extractCrawlDelays(robotsText);
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

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const directive = trimmed.substring(0, colonIndex).trim().toLowerCase();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      if (directive === 'user-agent') {
        currentUserAgent = value.toLowerCase();
      } else if (directive === 'disallow' && currentUserAgent) {
        rules.push({
          userAgent: currentUserAgent,
          path: value,
          allow: false
        });
      } else if (directive === 'allow' && currentUserAgent) {
        rules.push({
          userAgent: currentUserAgent,
          path: value,
          allow: true
        });
      }
    }

    return rules;
  }

  /**
   * Extract crawl delays from robots.txt
   * @param {string} robotsText - robots.txt content
   * @returns {Map} Crawl delays by user agent
   */
  extractCrawlDelays(robotsText) {
    const delays = new Map();
    const lines = robotsText.split('\n');
    let currentUserAgent = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const directive = trimmed.substring(0, colonIndex).trim().toLowerCase();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      if (directive === 'user-agent') {
        currentUserAgent = value.toLowerCase();
      } else if (directive === 'crawl-delay' && currentUserAgent) {
        const delay = parseInt(value);
        if (!isNaN(delay) && delay > 0) {
          delays.set(currentUserAgent, delay);
        }
      }
    }

    return delays;
  }

  /**
   * Check if URL is allowed for user agent
   * @param {string} url - URL to check
   * @param {string} userAgent - User agent string
   * @returns {boolean} True if allowed
   */
  isAllowed(url, userAgent) {
    const urlPath = new URL(url).pathname;
    const normalizedUserAgent = userAgent.toLowerCase();
    
    // Find applicable rules
    const applicableRules = this.rules.filter(rule => 
      rule.userAgent === '*' || 
      rule.userAgent === normalizedUserAgent ||
      normalizedUserAgent.includes(rule.userAgent)
    );

    // Sort by specificity (longer paths first)
    applicableRules.sort((a, b) => b.path.length - a.path.length);

    // Check rules in order of specificity
    for (const rule of applicableRules) {
      if (this.pathMatches(urlPath, rule.path)) {
        return rule.allow;
      }
    }

    // Default to allowed if no specific rule
    return true;
  }

  /**
   * Check if path matches rule pattern
   * @param {string} path - URL path
   * @param {string} pattern - Rule pattern
   * @returns {boolean} True if matches
   */
  pathMatches(path, pattern) {
    if (pattern === '/') {
      return true; // Disallow all
    }
    
    if (pattern === '') {
      return false; // Allow all
    }

    // Simple prefix matching
    return path.startsWith(pattern);
  }

  /**
   * Get crawl delay for user agent
   * @param {string} userAgent - User agent string
   * @returns {number} Crawl delay in seconds
   */
  getCrawlDelay(userAgent) {
    const normalizedUserAgent = userAgent.toLowerCase();
    
    // Check for exact match first
    if (this.crawlDelays.has(normalizedUserAgent)) {
      return this.crawlDelays.get(normalizedUserAgent);
    }

    // Check for wildcard
    if (this.crawlDelays.has('*')) {
      return this.crawlDelays.get('*');
    }

    // Check for partial matches
    for (const [agent, delay] of this.crawlDelays) {
      if (normalizedUserAgent.includes(agent)) {
        return delay;
      }
    }

    return 0; // No delay
  }
}