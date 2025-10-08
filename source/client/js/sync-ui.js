/**
 * Sync Progress UI Components
 * Handles displaying sync progress, status, and notifications
 * 
 * @module sync-ui
 */

import { logger } from './logger.js';
import { cdnSync } from './sync.js';
import { offlineManager } from './offline.js';

/**
 * Sync UI manager class for displaying sync progress
 */
export class SyncUI {
  constructor() {
    this.container = null;
    this.progressBar = null;
    this.statusText = null;
    this.isVisible = false;
  }

  /**
   * Initialize the sync UI
   * 
   * Pre: DOM is loaded
   * Post: UI elements are created and event listeners registered
   * @return {void}
   */
  initialize() {
    this.createUI();
    this.setupEventListeners();
    logger.info('Sync UI: Initialized');
  }

  /**
   * Create UI elements
   * 
   * Pre: None
   * Post: UI elements are created and added to DOM
   * @return {void}
   */
  createUI() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'sync-ui-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 20px;
      min-width: 300px;
      max-width: 90%;
      z-index: 9999;
      transition: transform 0.3s ease-in-out;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Syncing Data';
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.onclick = () => this.hide();
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      color: #999;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      line-height: 24px;
    `;

    header.appendChild(title);
    header.appendChild(closeButton);

    // Create status text
    this.statusText = document.createElement('p');
    this.statusText.textContent = 'Preparing to sync...';
    this.statusText.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
    `;

    // Create progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      width: 100%;
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 10px;
    `;

    // Create progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    `;

    progressContainer.appendChild(this.progressBar);

    // Create percentage text
    this.percentageText = document.createElement('div');
    this.percentageText.textContent = '0%';
    this.percentageText.style.cssText = `
      text-align: center;
      font-size: 12px;
      color: #999;
      font-weight: 600;
    `;

    // Assemble UI
    this.container.appendChild(header);
    this.container.appendChild(this.statusText);
    this.container.appendChild(progressContainer);
    this.container.appendChild(this.percentageText);

    document.body.appendChild(this.container);
  }

  /**
   * Set up event listeners
   * 
   * Pre: UI elements are created
   * Post: Event listeners are registered
   * @return {void}
   */
  setupEventListeners() {
    // Listen to sync progress
    cdnSync.onProgress((current, total, percentage) => {
      this.updateProgress(current, total, percentage);
    });

    // Listen to online/offline status
    offlineManager.addListener((isOnline) => {
      if (!isOnline) {
        this.showOfflineMessage();
      }
    });
  }

  /**
   * Show the sync UI
   * 
   * Pre: UI is initialized
   * Post: UI is visible
   * @return {void}
   */
  show() {
    if (!this.container) {
      this.initialize();
    }

    this.isVisible = true;
    this.container.style.transform = 'translateX(-50%) translateY(0)';
    logger.info('Sync UI: Shown');
  }

  /**
   * Hide the sync UI
   * 
   * Pre: UI is initialized
   * Post: UI is hidden
   * @return {void}
   */
  hide() {
    if (!this.container) return;

    this.isVisible = false;
    this.container.style.transform = 'translateX(-50%) translateY(100px)';
    logger.info('Sync UI: Hidden');
  }

  /**
   * Update progress display
   * 
   * Pre: UI is initialized
   * Post: Progress bar and text are updated
   * @param {number} current - Current progress
   * @param {number} total - Total items
   * @param {number} percentage - Percentage complete
   * @return {void}
   */
  updateProgress(current, total, percentage) {
    if (!this.progressBar || !this.statusText) return;

    this.progressBar.style.width = `${percentage}%`;
    this.percentageText.textContent = `${percentage}%`;
    this.statusText.textContent = `Syncing ${current} of ${total} chunks...`;

    if (percentage === 100) {
      this.showComplete();
    }
  }

  /**
   * Show completion message
   * 
   * Pre: Sync is complete
   * Post: UI shows completion message and auto-hides
   * @return {void}
   */
  showComplete() {
    if (!this.statusText) return;

    this.statusText.textContent = 'Sync complete!';
    this.statusText.style.color = '#28a745';

    setTimeout(() => {
      this.hide();
    }, 2000);
  }

  /**
   * Show error message
   * 
   * Pre: Sync encountered an error
   * Post: UI shows error message
   * @param {string} message - Error message
   * @return {void}
   */
  showError(message) {
    if (!this.statusText) return;

    this.show();
    this.statusText.textContent = message || 'Sync failed. Please try again.';
    this.statusText.style.color = '#dc3545';
  }

  /**
   * Show offline message
   * 
   * Pre: Device went offline
   * Post: UI shows offline message
   * @return {void}
   */
  showOfflineMessage() {
    if (!this.statusText) return;

    this.show();
    this.statusText.textContent = 'You are offline. Sync will resume when online.';
    this.statusText.style.color = '#ffc107';
  }

  /**
   * Reset UI to initial state
   * 
   * Pre: UI is initialized
   * Post: UI is reset to initial state
   * @return {void}
   */
  reset() {
    if (!this.progressBar || !this.statusText) return;

    this.progressBar.style.width = '0%';
    this.percentageText.textContent = '0%';
    this.statusText.textContent = 'Preparing to sync...';
    this.statusText.style.color = '#666';
  }
}

/**
 * Notification manager for sync events
 */
export class SyncNotifications {
  constructor() {
    this.permission = 'default';
    this.checkPermission();
  }

  /**
   * Check notification permission
   * 
   * Pre: None
   * Post: Permission status is updated
   * @return {void}
   */
  checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Request notification permission
   * 
   * Pre: Notifications API is available
   * Post: Permission is requested from user
   * @return {Promise<string>} Permission status
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      logger.warn('Sync Notifications: Not supported');
      return 'denied';
    }

    try {
      this.permission = await Notification.requestPermission();
      logger.info('Sync Notifications: Permission', this.permission);
      return this.permission;
    } catch (error) {
      logger.error('Sync Notifications: Permission request failed', error);
      return 'denied';
    }
  }

  /**
   * Show a notification
   * 
   * Pre: Permission is granted
   * Post: Notification is displayed
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   * @return {Notification|null} Notification instance
   */
  show(title, options = {}) {
    if (this.permission !== 'granted') {
      logger.warn('Sync Notifications: Permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-192.png',
        ...options,
      });

      return notification;
    } catch (error) {
      logger.error('Sync Notifications: Failed to show', error);
      return null;
    }
  }

  /**
   * Show sync complete notification
   * 
   * Pre: Sync completed successfully
   * Post: Notification is displayed
   * @param {number} count - Number of items synced
   * @return {Notification|null} Notification instance
   */
  showSyncComplete(count) {
    return this.show('Sync Complete', {
      body: `Successfully synced ${count} Pokémon!`,
      tag: 'sync-complete',
    });
  }

  /**
   * Show sync error notification
   * 
   * Pre: Sync encountered an error
   * Post: Notification is displayed
   * @param {string} error - Error message
   * @return {Notification|null} Notification instance
   */
  showSyncError(error) {
    return this.show('Sync Failed', {
      body: error || 'Failed to sync data. Please try again.',
      tag: 'sync-error',
    });
  }

  /**
   * Show update available notification
   * 
   * Pre: New version is available
   * Post: Notification is displayed
   * @return {Notification|null} Notification instance
   */
  showUpdateAvailable() {
    return this.show('Update Available', {
      body: 'New Pokémon data is available. Tap to update.',
      tag: 'update-available',
      requireInteraction: true,
    });
  }
}

// Export singleton instances
export const syncUI = new SyncUI();
export const syncNotifications = new SyncNotifications();
