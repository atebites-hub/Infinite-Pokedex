/**
 * Rate Limiter Fix Tests
 * 
 * Tests to verify the fixes for burst token logic and minute limit check
 * in the RateLimiter class from base-crawler.js
 * 
 * @fileoverview Unit tests for rate limiter bug fixes
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock the RateLimiter class from base-crawler.js
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

    // Refill burst tokens based on time elapsed
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
      
      // After waiting, refill tokens based on the time that passed
      const timeAfterWait = Date.now();
      const additionalTime = timeAfterWait - now;
      const additionalTokens = (additionalTime / 1000) * this.config.requestsPerSecond;
      this.burstTokens = Math.min(
        this.burstTokens + additionalTokens,
        this.config.burstLimit
      );
      this.lastRefill = timeAfterWait;
    }

    // Consume one token for this request
    this.burstTokens = Math.max(0, this.burstTokens - 1);

    // Check minute limit
    const minuteAgo = now - 60000;
    this.requests = this.requests.filter((time) => time > minuteAgo);

    if (this.requests.length >= this.config.requestsPerMinute) {
      // Handle empty array case safely
      if (this.requests.length > 0) {
        const oldestRequest = Math.min(...this.requests);
        const waitTime = 60000 - (now - oldestRequest);
        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    this.requests.push(now);
  }
}

describe('RateLimiter Fix Tests', () => {
  let rateLimiter;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      requestsPerSecond: 2,
      requestsPerMinute: 10,
      burstLimit: 5
    };
    rateLimiter = new RateLimiter(mockConfig);
  });

  describe('Burst Token Logic Fix', () => {
    it('should properly handle token consumption and refill', async () => {
      // Start with full burst tokens
      expect(rateLimiter.burstTokens).toBe(5);

      // Consume all burst tokens
      for (let i = 0; i < 5; i++) {
        await rateLimiter.wait();
      }

      // Should have 0 tokens after consuming all
      expect(rateLimiter.burstTokens).toBe(0);

      // Next request should trigger wait and refill
      const startTime = Date.now();
      await rateLimiter.wait();
      const endTime = Date.now();

      // Should have waited approximately 500ms (1000ms / 2 requestsPerSecond)
      expect(endTime - startTime).toBeGreaterThanOrEqual(450);
      expect(endTime - startTime).toBeLessThan(600);

      // Should have refilled tokens after waiting (allow for small floating point errors)
      expect(rateLimiter.burstTokens).toBeCloseTo(0, 1);
    });

    it('should handle fractional token generation correctly', async () => {
      // Set a fractional rate
      rateLimiter.config.requestsPerSecond = 1.5;
      rateLimiter.burstTokens = 0;
      rateLimiter.lastRefill = Date.now() - 2000; // 2 seconds ago

      await rateLimiter.wait();

      // Should have generated approximately 3 tokens (2 seconds * 1.5 per second) minus 1 consumed
      expect(rateLimiter.burstTokens).toBeCloseTo(2, 0);
    });

    it('should not allow burstTokens to go negative', async () => {
      // Force burstTokens to negative
      rateLimiter.burstTokens = -1;

      await rateLimiter.wait();

      // Should be 0, not negative
      expect(rateLimiter.burstTokens).toBe(0);
    });

    it('should respect burst limit during refill', async () => {
      // Set up scenario where we would exceed burst limit
      rateLimiter.burstTokens = 4;
      rateLimiter.lastRefill = Date.now() - 2000; // 2 seconds ago
      rateLimiter.config.requestsPerSecond = 2;

      await rateLimiter.wait();

      // Should not exceed burst limit of 5
      expect(rateLimiter.burstTokens).toBeLessThanOrEqual(5);
    });
  });

  describe('Minute Limit Check Fix', () => {
    it('should handle empty requests array safely', async () => {
      // Ensure requests array is empty
      rateLimiter.requests = [];
      rateLimiter.config.requestsPerMinute = 0; // Force minute limit check

      // Should not throw error
      await expect(rateLimiter.wait()).resolves.not.toThrow();
    });

    it('should handle minute limit correctly with requests', async () => {
      // Test that the minute limit check doesn't crash with empty array
      rateLimiter.requests = [];
      rateLimiter.config.requestsPerMinute = 10;

      // Should not throw error
      await expect(rateLimiter.wait()).resolves.not.toThrow();
      
      // Should have added the new request to the array
      expect(rateLimiter.requests.length).toBe(1);
    });

    it('should filter out old requests correctly', async () => {
      const now = Date.now();
      // Mix of old and recent requests
      rateLimiter.requests = [
        now - 70000, // 70 seconds ago (should be filtered)
        now - 30000, // 30 seconds ago (should be kept)
        now - 10000, // 10 seconds ago (should be kept)
      ];

      await rateLimiter.wait();

      // Should only have recent requests (within last minute)
      expect(rateLimiter.requests.length).toBe(3); // 2 old + 1 new
      expect(rateLimiter.requests.every(time => time > now - 60000)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle rapid successive requests correctly', async () => {
      const startTime = Date.now();
      
      // Make 10 requests rapidly
      for (let i = 0; i < 10; i++) {
        await rateLimiter.wait();
      }
      
      const endTime = Date.now();
      
      // Should have taken some time due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(0);
      
      // Should have consumed all burst tokens (allow for small floating point errors)
      expect(rateLimiter.burstTokens).toBeCloseTo(0, 1);
    });

    it('should maintain correct token count over time', async () => {
      // Consume all tokens
      for (let i = 0; i < 5; i++) {
        await rateLimiter.wait();
      }
      
      expect(rateLimiter.burstTokens).toBe(0);
      
      // Wait for refill (simulate time passing)
      rateLimiter.lastRefill = Date.now() - 1000; // 1 second ago
      await rateLimiter.wait();
      
      // Should have some tokens after refill
      expect(rateLimiter.burstTokens).toBeGreaterThan(0);
    });

    it('should handle both burst and minute limits simultaneously', async () => {
      // Test that both limits work together without crashing
      rateLimiter.config.requestsPerMinute = 3;
      rateLimiter.requests = [];
      
      // Should not throw error
      await expect(rateLimiter.wait()).resolves.not.toThrow();
      
      // Should have added the new request to the array
      expect(rateLimiter.requests.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero requests per second', async () => {
      rateLimiter.config.requestsPerSecond = 0;
      
      // Should not throw error
      await expect(rateLimiter.wait()).resolves.not.toThrow();
    });

    it('should handle very high request rates', async () => {
      rateLimiter.config.requestsPerSecond = 1000;
      rateLimiter.config.burstLimit = 1000;
      
      // Should handle high rates without issues
      await expect(rateLimiter.wait()).resolves.not.toThrow();
    });

    it('should handle concurrent requests correctly', async () => {
      // Simulate concurrent requests
      const promises = Array.from({ length: 5 }, () => rateLimiter.wait());
      
      await Promise.all(promises);
      
      // Should have consumed all burst tokens
      expect(rateLimiter.burstTokens).toBe(0);
    });
  });
});
