/**
 * Unit tests for Offline Manager and Error Handler
 * Tests offline detection, retry queue, and error management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { OfflineManager, ErrorHandler } from '../../source/client/js/offline.js';

describe('OfflineManager', () => {
  let offlineManager;

  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    offlineManager = new OfflineManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with online status', () => {
      expect(offlineManager.isOnline).toBe(true);
    });

    it('should initialize with empty listeners array', () => {
      expect(offlineManager.listeners).toEqual([]);
    });

    it('should initialize with empty retry queue', () => {
      expect(offlineManager.retryQueue).toEqual([]);
    });
  });

  describe('getOnlineStatus', () => {
    it('should return current online status', () => {
      offlineManager.isOnline = true;
      expect(offlineManager.getOnlineStatus()).toBe(true);

      offlineManager.isOnline = false;
      expect(offlineManager.getOnlineStatus()).toBe(false);
    });
  });

  describe('listeners', () => {
    it('should add listener', () => {
      const callback = vi.fn();
      offlineManager.addListener(callback);

      expect(offlineManager.listeners).toContain(callback);
    });

    it('should remove listener', () => {
      const callback = vi.fn();
      offlineManager.addListener(callback);
      offlineManager.removeListener(callback);

      expect(offlineManager.listeners).not.toContain(callback);
    });

    it('should notify listeners on status change', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      offlineManager.addListener(callback1);
      offlineManager.addListener(callback2);

      offlineManager.notifyListeners(false);

      expect(callback1).toHaveBeenCalledWith(false);
      expect(callback2).toHaveBeenCalledWith(false);
    });

    it('should handle listener errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const goodCallback = vi.fn();

      offlineManager.addListener(errorCallback);
      offlineManager.addListener(goodCallback);

      offlineManager.notifyListeners(true);

      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('retry queue', () => {
    it('should add request to retry queue', () => {
      const request = new Request('https://example.com');
      offlineManager.addToRetryQueue(request);

      expect(offlineManager.retryQueue).toHaveLength(1);
      expect(offlineManager.retryQueue[0].request).toBe(request);
    });

    it('should process retry queue when online', async () => {
      const mockFn = vi.fn().mockResolvedValue();
      offlineManager.isOnline = true;
      offlineManager.addToRetryQueue(mockFn);

      await offlineManager.processRetryQueue();

      expect(mockFn).toHaveBeenCalled();
      expect(offlineManager.retryQueue).toHaveLength(0);
    });

    it('should not process retry queue when offline', async () => {
      const mockFn = vi.fn();
      offlineManager.isOnline = false;
      offlineManager.addToRetryQueue(mockFn);

      await offlineManager.processRetryQueue();

      expect(mockFn).not.toHaveBeenCalled();
      expect(offlineManager.retryQueue).toHaveLength(1);
    });

    it('should retry failed requests up to max attempts', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Failed'));
      offlineManager.isOnline = true;
      offlineManager.addToRetryQueue(mockFn, { maxAttempts: 2 });

      await offlineManager.processRetryQueue();

      expect(offlineManager.retryQueue).toHaveLength(1);
      expect(offlineManager.retryQueue[0].attempts).toBe(1);
    });

    it('should clear retry queue', () => {
      offlineManager.addToRetryQueue(vi.fn());
      offlineManager.addToRetryQueue(vi.fn());

      offlineManager.clearRetryQueue();

      expect(offlineManager.retryQueue).toHaveLength(0);
    });

    it('should get retry queue size', () => {
      offlineManager.addToRetryQueue(vi.fn());
      offlineManager.addToRetryQueue(vi.fn());

      expect(offlineManager.getRetryQueueSize()).toBe(2);
    });
  });

  describe('isImageRequest', () => {
    it('should detect image requests', () => {
      expect(offlineManager.isImageRequest(new URL('https://example.com/image.png'))).toBe(true);
      expect(offlineManager.isImageRequest(new URL('https://example.com/image.jpg'))).toBe(true);
      expect(offlineManager.isImageRequest(new URL('https://example.com/image.webp'))).toBe(true);
    });

    it('should reject non-image requests', () => {
      expect(offlineManager.isImageRequest(new URL('https://example.com/data.json'))).toBe(false);
      expect(offlineManager.isImageRequest(new URL('https://example.com/page.html'))).toBe(false);
    });
  });

  describe('getPlaceholderImage', () => {
    it('should return SVG placeholder', () => {
      const response = offlineManager.getPlaceholderImage();

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
    });
  });
});

describe('ErrorHandler', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty error log', () => {
      expect(errorHandler.errorLog).toEqual([]);
    });

    it('should set max log size', () => {
      expect(errorHandler.maxLogSize).toBe(100);
    });
  });

  describe('handleError', () => {
    it('should add error to log', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error);

      expect(errorHandler.errorLog).toHaveLength(1);
      expect(errorHandler.errorLog[0].message).toBe('Test error');
    });

    it('should handle string errors', () => {
      errorHandler.handleError('String error');

      expect(errorHandler.errorLog).toHaveLength(1);
      expect(errorHandler.errorLog[0].message).toBe('String error');
    });

    it('should include context in error entry', () => {
      const error = new Error('Test error');
      const context = { type: 'test', filename: 'test.js' };

      errorHandler.handleError(error, context);

      expect(errorHandler.errorLog[0].context).toEqual(context);
    });

    it('should trim log when exceeding max size', () => {
      errorHandler.maxLogSize = 3;

      for (let i = 0; i < 5; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }

      expect(errorHandler.errorLog).toHaveLength(3);
      expect(errorHandler.errorLog[0].message).toBe('Error 2');
    });
  });

  describe('getErrorLog', () => {
    it('should return copy of error log', () => {
      errorHandler.handleError(new Error('Test'));

      const log = errorHandler.getErrorLog();

      expect(log).toEqual(errorHandler.errorLog);
      expect(log).not.toBe(errorHandler.errorLog); // Different reference
    });
  });

  describe('clearErrorLog', () => {
    it('should clear error log', () => {
      errorHandler.handleError(new Error('Test 1'));
      errorHandler.handleError(new Error('Test 2'));

      errorHandler.clearErrorLog();

      expect(errorHandler.errorLog).toHaveLength(0);
    });
  });
});
