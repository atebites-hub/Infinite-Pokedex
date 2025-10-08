/**
 * Unit tests for Version Manager
 * Tests version comparison, integrity checks, and migration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { VersionManager } from '../../source/client/js/version.js';

describe('VersionManager', () => {
  let versionManager;
  let mockDB;

  beforeEach(() => {
    versionManager = new VersionManager();
    
    // Mock IndexedDB
    mockDB = {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
        })),
        complete: Promise.resolve(),
      })),
    };

    // Mock openDB
    vi.mock('../../source/client/js/storage.js', () => ({
      openDB: vi.fn().mockResolvedValue(mockDB),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(versionManager.compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(versionManager.compareVersions('2.5.3', '2.5.3')).toBe(0);
    });

    it('should return 1 when first version is greater', () => {
      expect(versionManager.compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(versionManager.compareVersions('1.1.0', '1.0.0')).toBe(1);
      expect(versionManager.compareVersions('1.0.1', '1.0.0')).toBe(1);
    });

    it('should return -1 when first version is less', () => {
      expect(versionManager.compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(versionManager.compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(versionManager.compareVersions('1.0.0', '1.0.1')).toBe(-1);
    });

    it('should handle versions with different lengths', () => {
      expect(versionManager.compareVersions('1.0', '1.0.0')).toBe(0);
      expect(versionManager.compareVersions('1.0.1', '1.0')).toBe(1);
      expect(versionManager.compareVersions('1.0', '1.0.1')).toBe(-1);
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify data integrity with correct hash', async () => {
      const data = { test: 'data' };
      const dataString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataString);
      
      // Mock crypto.subtle.digest
      const mockHash = new Uint8Array([1, 2, 3, 4]);
      global.crypto = {
        subtle: {
          digest: vi.fn().mockResolvedValue(mockHash.buffer),
        },
      };

      const expectedHash = Array.from(mockHash)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const result = await versionManager.verifyIntegrity(data, expectedHash);

      expect(result).toBe(true);
    });

    it('should fail verification with incorrect hash', async () => {
      const data = { test: 'data' };
      
      global.crypto = {
        subtle: {
          digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
        },
      };

      const result = await versionManager.verifyIntegrity(data, 'wronghash');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const data = { test: 'data' };
      
      global.crypto = {
        subtle: {
          digest: vi.fn().mockRejectedValue(new Error('Crypto error')),
        },
      };

      const result = await versionManager.verifyIntegrity(data, 'anyhash');

      expect(result).toBe(false);
    });
  });

  describe('validateManifest', () => {
    it('should validate correct manifest', () => {
      const manifest = {
        version: '1.0.0',
        timestamp: Date.now(),
        files: [
          { path: '/data/1.json', size: 1024, hash: 'abc123' },
        ],
        totalSize: 1024,
      };

      const result = versionManager.validateManifest(manifest);

      expect(result).toBe(true);
    });

    it('should reject manifest missing required fields', () => {
      const manifest = {
        version: '1.0.0',
        // missing timestamp, files, totalSize
      };

      const result = versionManager.validateManifest(manifest);

      expect(result).toBe(false);
    });

    it('should reject manifest with invalid files array', () => {
      const manifest = {
        version: '1.0.0',
        timestamp: Date.now(),
        files: 'not-an-array',
        totalSize: 1024,
      };

      const result = versionManager.validateManifest(manifest);

      expect(result).toBe(false);
    });

    it('should reject manifest with invalid file entries', () => {
      const manifest = {
        version: '1.0.0',
        timestamp: Date.now(),
        files: [
          { path: '/data/1.json' }, // missing size and hash
        ],
        totalSize: 1024,
      };

      const result = versionManager.validateManifest(manifest);

      expect(result).toBe(false);
    });
  });

  describe('checkForUpdates', () => {
    it('should detect new version available', async () => {
      versionManager.currentVersion = '1.0.0';

      const mockManifest = {
        version: '1.1.0',
        timestamp: Date.now(),
        files: [],
        totalSize: 0,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockManifest,
      });

      const hasUpdate = await versionManager.checkForUpdates('https://cdn.example.com/manifest.json');

      expect(hasUpdate).toBe(true);
      expect(versionManager.manifestCache).toEqual(mockManifest);
    });

    it('should detect no update when versions match', async () => {
      versionManager.currentVersion = '1.0.0';

      const mockManifest = {
        version: '1.0.0',
        timestamp: Date.now(),
        files: [],
        totalSize: 0,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockManifest,
      });

      const hasUpdate = await versionManager.checkForUpdates('https://cdn.example.com/manifest.json');

      expect(hasUpdate).toBe(false);
    });

    it('should detect update when no current version', async () => {
      versionManager.currentVersion = null;

      const mockManifest = {
        version: '1.0.0',
        timestamp: Date.now(),
        files: [],
        totalSize: 0,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockManifest,
      });

      const hasUpdate = await versionManager.checkForUpdates('https://cdn.example.com/manifest.json');

      expect(hasUpdate).toBe(true);
    });

    it('should throw on fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(
        versionManager.checkForUpdates('https://cdn.example.com/manifest.json')
      ).rejects.toThrow();
    });
  });

  describe('getCurrentVersion', () => {
    it('should return current version', () => {
      versionManager.currentVersion = '1.0.0';

      expect(versionManager.getCurrentVersion()).toBe('1.0.0');
    });

    it('should return null when no version set', () => {
      versionManager.currentVersion = null;

      expect(versionManager.getCurrentVersion()).toBeNull();
    });
  });

  describe('getManifest', () => {
    it('should return cached manifest', () => {
      const manifest = { version: '1.0.0' };
      versionManager.manifestCache = manifest;

      expect(versionManager.getManifest()).toEqual(manifest);
    });

    it('should return null when no manifest cached', () => {
      versionManager.manifestCache = null;

      expect(versionManager.getManifest()).toBeNull();
    });
  });
});
