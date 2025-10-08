/**
 * Offline Fallback and Error Handling Module
 * Handles offline detection, fallback content, and error recovery
 * 
 * @module offline
 */

import { logger } from './logger.js';
import { openDB } from './storage.js';

/**
 * Offline manager class for handling offline state and fallbacks
 */
export class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.retryQueue = [];
    this.setupEventListeners();
  }

  /**
   * Set up online/offline event listeners
   * 
   * Pre: None
   * Post: Event listeners are registered
   * @return {void}
   */
  setupEventListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Handle online event
   * 
   * Pre: Browser detected online connection
   * Post: Online state updated, retry queue processed
   * @return {void}
   */
  handleOnline() {
    logger.info('Offline Manager: Connection restored');
    this.isOnline = true;
    this.notifyListeners(true);
    this.processRetryQueue();
  }

  /**
   * Handle offline event
   * 
   * Pre: Browser detected offline connection
   * Post: Offline state updated, listeners notified
   * @return {void}
   */
  handleOffline() {
    logger.warn('Offline Manager: Connection lost');
    this.isOnline = false;
    this.notifyListeners(false);
  }

  /**
   * Check if currently online
   * 
   * Pre: None
   * Post: Returns current online status
   * @return {boolean} True if online
   */
  getOnlineStatus() {
    return this.isOnline;
  }

  /**
   * Register a listener for online/offline changes
   * 
   * Pre: callback is a function
   * Post: Callback added to listeners
   * @param {Function} callback - Callback function (isOnline) => void
   * @return {void}
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  /**
   * Remove a listener
   * 
   * Pre: callback is a registered function
   * Post: Callback removed from listeners
   * @param {Function} callback - Callback function to remove
   * @return {void}
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * Notify all listeners of status change
   * 
   * Pre: None
   * Post: All listeners invoked with new status
   * @param {boolean} isOnline - Current online status
   * @return {void}
   */
  notifyListeners(isOnline) {
    this.listeners.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        logger.error('Offline Manager: Listener error', error);
      }
    });
  }

  /**
   * Add a failed request to retry queue
   * 
   * Pre: request is a valid Request or function
   * Post: Request added to retry queue
   * @param {Request|Function} request - Request to retry
   * @param {Object} options - Retry options
   * @return {void}
   */
  addToRetryQueue(request, options = {}) {
    this.retryQueue.push({
      request,
      options,
      timestamp: Date.now(),
      attempts: 0,
    });
    
    logger.info('Offline Manager: Added to retry queue', {
      queueSize: this.retryQueue.length,
    });
  }

  /**
   * Process retry queue when back online
   * 
   * Pre: Connection is online
   * Post: All queued requests are retried
   * @return {Promise<void>}
   */
  async processRetryQueue() {
    if (!this.isOnline || this.retryQueue.length === 0) {
      return;
    }

    logger.info('Offline Manager: Processing retry queue', {
      queueSize: this.retryQueue.length,
    });

    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const item of queue) {
      try {
        if (typeof item.request === 'function') {
          await item.request();
        } else {
          await fetch(item.request);
        }
        
        logger.info('Offline Manager: Retry successful');
      } catch (error) {
        logger.error('Offline Manager: Retry failed', error);
        
        // Re-add to queue if max attempts not reached
        const maxAttempts = item.options.maxAttempts || 3;
        if (item.attempts < maxAttempts) {
          item.attempts++;
          this.retryQueue.push(item);
        }
      }
    }
  }

  /**
   * Handle fetch with offline fallback
   * 
   * Pre: request is a valid Request object
   * Post: Returns Response from network or cache
   * @param {Request} request - The request to handle
   * @return {Promise<Response>} The response
   */
  async handleFetch(request) {
    try {
      const response = await fetch(request);
      return response;
    } catch (error) {
      logger.warn('Offline Manager: Fetch failed, trying cache', error);
      
      // Try cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Return offline fallback
      return this.getOfflineFallback(request);
    }
  }

  /**
   * Get offline fallback response
   * 
   * Pre: request is a valid Request object
   * Post: Returns fallback Response
   * @param {Request} request - The failed request
   * @return {Promise<Response>} Fallback response
   */
  async getOfflineFallback(request) {
    const url = new URL(request.url);

    // For navigation requests, return offline page
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    // For API requests, return cached data or error
    if (url.pathname.includes('/api/') || url.pathname.endsWith('.json')) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'This content is not available offline',
          cached: false,
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // For images, return placeholder
    if (this.isImageRequest(url)) {
      return this.getPlaceholderImage();
    }

    // Default fallback
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }

  /**
   * Check if request is for an image
   * 
   * Pre: url is a valid URL object
   * Post: Returns boolean indicating if image request
   * @param {URL} url - The URL to check
   * @return {boolean} True if image request
   */
  isImageRequest(url) {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => url.pathname.endsWith(ext));
  }

  /**
   * Get placeholder image response
   * 
   * Pre: None
   * Post: Returns Response with placeholder SVG
   * @return {Response} Placeholder image response
   */
  getPlaceholderImage() {
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#f0f0f0"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" 
              font-family="Arial" font-size="20" fill="#999">
          Image not available offline
        </text>
      </svg>
    `;

    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }

  /**
   * Clear retry queue
   * 
   * Pre: None
   * Post: Retry queue is empty
   * @return {void}
   */
  clearRetryQueue() {
    this.retryQueue = [];
    logger.info('Offline Manager: Retry queue cleared');
  }

  /**
   * Get retry queue size
   * 
   * Pre: None
   * Post: Returns number of items in retry queue
   * @return {number} Queue size
   */
  getRetryQueueSize() {
    return this.retryQueue.length;
  }
}

/**
 * Error handler class for centralized error management
 */
export class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.setupGlobalHandlers();
  }

  /**
   * Set up global error handlers
   * 
   * Pre: None
   * Post: Global error handlers registered
   * @return {void}
   */
  setupGlobalHandlers() {
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        type: 'uncaught',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandled-promise',
        promise: event.promise,
      });
    });
  }

  /**
   * Handle an error
   * 
   * Pre: error is an Error object or string
   * Post: Error is logged and stored
   * @param {Error|string} error - The error to handle
   * @param {Object} context - Additional context
   * @return {void}
   */
  handleError(error, context = {}) {
    const errorEntry = {
      message: error?.message || String(error),
      stack: error?.stack,
      context,
      timestamp: Date.now(),
    };

    this.errorLog.push(errorEntry);

    // Trim log if too large
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    logger.error('Error Handler: Error occurred', errorEntry);

    // Store in IndexedDB for debugging
    this.storeError(errorEntry);
  }

  /**
   * Store error in IndexedDB
   * 
   * Pre: errorEntry is a valid error object
   * Post: Error stored in database
   * @param {Object} errorEntry - Error entry to store
   * @return {Promise<void>}
   */
  async storeError(errorEntry) {
    try {
      const db = await openDB();
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');

      // Get existing errors
      const errorsData = await new Promise((resolve, reject) => {
        const request = store.get('error_log');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const errors = errorsData?.value || [];

      // Add new error
      errors.push(errorEntry);

      // Keep only last 100 errors
      if (errors.length > 100) {
        errors.shift();
      }

      // Save back
      await new Promise((resolve, reject) => {
        const request = store.put({
          key: 'error_log',
          value: errors,
          updatedAt: Date.now(),
        });
        request.onsuccess = () => {
          // Wait for transaction to complete before resolving
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      logger.error('Error Handler: Failed to store error', error);
    }
  }

  /**
   * Get error log
   * 
   * Pre: None
   * Post: Returns array of error entries
   * @return {Array} Error log
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   * 
   * Pre: None
   * Post: Error log is empty
   * @return {void}
   */
  clearErrorLog() {
    this.errorLog = [];
    logger.info('Error Handler: Error log cleared');
  }

  /**
   * Get errors from IndexedDB
   * 
   * Pre: IndexedDB is available
   * Post: Returns array of stored errors
   * @return {Promise<Array>} Stored errors
   */
  async getStoredErrors() {
    try {
      const db = await openDB();
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');

      const errorsData = await new Promise((resolve, reject) => {
        const request = store.get('error_log');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        
        // Wait for transaction to complete
        tx.oncomplete = () => {};
        tx.onerror = () => reject(tx.error);
      });

      return errorsData?.value || [];
    } catch (error) {
      logger.error('Error Handler: Failed to get stored errors', error);
      return [];
    }
  }

  /**
   * Clear stored errors from IndexedDB
   * 
   * Pre: IndexedDB is available
   * Post: Stored errors are cleared
   * @return {Promise<void>}
   */
  async clearStoredErrors() {
    try {
      const db = await openDB();
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');

      await new Promise((resolve, reject) => {
        const request = store.delete('error_log');
        request.onsuccess = () => {
          // Wait for transaction to complete before resolving
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      });

      logger.info('Error Handler: Stored errors cleared');
    } catch (error) {
      logger.error('Error Handler: Failed to clear stored errors', error);
    }
  }
}

// Export singleton instances
export const offlineManager = new OfflineManager();
export const errorHandler = new ErrorHandler();
