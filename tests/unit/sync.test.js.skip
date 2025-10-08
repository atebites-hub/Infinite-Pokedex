/**
 * Unit tests for CDN Sync System
 * Tests sync functionality, chunking, resume, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { CDNSync } from '../../source/client/js/sync.js';

describe('CDNSync', () => {
  let cdnSync;
  let mockDB;

  beforeEach(() => {
    cdnSync = new CDNSync();
    
    // Mock IndexedDB
    mockDB = {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
        })),
        done: Promise.resolve(),
        complete: Promise.resolve(),
      })),
    };

    cdnSync.db = mockDB;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with database and version', async () => {
      const mockVersion = '1.0.0';
      mockDB.transaction().objectStore().get.mockResolvedValue({ value: mockVersion });

      await cdnSync.initialize();

      expect(cdnSync.db).toBeDefined();
      expect(mockDB.transaction).toHaveBeenCalledWith('metadata', 'readonly');
    });

    it('should handle missing version gracefully', async () => {
      mockDB.transaction().objectStore().get.mockResolvedValue(null);

      await cdnSync.initialize();

      expect(cdnSync.currentVersion).toBeNull();
    });
  });

  describe('fetchManifest', () => {
    it('should fetch and return manifest', async () => {
      const mockManifest = {
        version: '1.0.0',
        timestamp: Date.now(),
        files: [],
        totalSize: 0,
        species: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockManifest,
      });

      const result = await cdnSync.fetchManifest();

      expect(result).toEqual(mockManifest);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ version: '1.0.0', files: [], species: [], timestamp: Date.now(), totalSize: 0 }),
        });

      const result = await cdnSync.fetchManifest();

      expect(result.version).toBe('1.0.0');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(cdnSync.fetchManifest()).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(3); // MAX_RETRIES
    });
  });

  describe('calculateChunks', () => {
    it('should calculate chunks correctly', () => {
      const manifest = {
        species: Array.from({ length: 250 }, (_, i) => ({ id: i + 1 })),
      };

      const chunks = cdnSync.calculateChunks(manifest);

      expect(chunks).toHaveLength(3); // 250 / 100 = 3 chunks
      expect(chunks[0].species).toHaveLength(100);
      expect(chunks[1].species).toHaveLength(100);
      expect(chunks[2].species).toHaveLength(50);
    });

    it('should handle empty species list', () => {
      const manifest = { species: [] };

      const chunks = cdnSync.calculateChunks(manifest);

      expect(chunks).toHaveLength(0);
    });

    it('should handle single chunk', () => {
      const manifest = {
        species: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })),
      };

      const chunks = cdnSync.calculateChunks(manifest);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].species).toHaveLength(50);
    });
  });

  describe('downloadSpecies', () => {
    it('should download and store species data', async () => {
      const speciesRef = { id: 1, hash: 'abc123' };
      const speciesData = { id: 1, name: 'Bulbasaur' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => speciesData,
      });

      cdnSync.storeSpecies = vi.fn().mockResolvedValue();

      await cdnSync.downloadSpecies(speciesRef);

      expect(global.fetch).toHaveBeenCalled();
      expect(cdnSync.storeSpecies).toHaveBeenCalledWith(speciesData);
    });

    it('should retry on download failure', async () => {
      const speciesRef = { id: 1 };

      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, name: 'Bulbasaur' }),
        });

      cdnSync.storeSpecies = vi.fn().mockResolvedValue();

      await cdnSync.downloadSpecies(speciesRef);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveCheckpoint', () => {
    it('should save checkpoint to database', async () => {
      const chunkId = 5;

      await cdnSync.saveCheckpoint(chunkId);

      expect(mockDB.transaction).toHaveBeenCalledWith('metadata', 'readwrite');
      expect(mockDB.transaction().objectStore().put).toHaveBeenCalled();
    });
  });

  describe('getCheckpoint', () => {
    it('should retrieve checkpoint from database', async () => {
      const mockCheckpoint = { chunkId: 5, timestamp: Date.now() };
      mockDB.transaction().objectStore().get.mockResolvedValue({ value: mockCheckpoint });

      const result = await cdnSync.getCheckpoint();

      expect(result).toEqual(mockCheckpoint);
    });

    it('should return null if no checkpoint exists', async () => {
      mockDB.transaction().objectStore().get.mockResolvedValue(null);

      const result = await cdnSync.getCheckpoint();

      expect(result).toBeNull();
    });
  });

  describe('progressCallbacks', () => {
    it('should register and notify progress callbacks', () => {
      const callback = vi.fn();
      cdnSync.onProgress(callback);

      cdnSync.notifyProgress(50, 100);

      expect(callback).toHaveBeenCalledWith(50, 100, 50);
    });

    it('should handle multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      cdnSync.onProgress(callback1);
      cdnSync.onProgress(callback2);

      cdnSync.notifyProgress(75, 100);

      expect(callback1).toHaveBeenCalledWith(75, 100, 75);
      expect(callback2).toHaveBeenCalledWith(75, 100, 75);
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const goodCallback = vi.fn();

      cdnSync.onProgress(errorCallback);
      cdnSync.onProgress(goodCallback);

      cdnSync.notifyProgress(50, 100);

      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('delay', () => {
    it('should delay for specified time', async () => {
      const start = Date.now();
      await cdnSync.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });
});
