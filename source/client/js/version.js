/**
 * Version Management and Data Integrity Module
 * Handles dataset versioning, integrity checks, and migration
 * 
 * @module version
 */

import { openDB } from './storage.js';
import { logger } from './logger.js';

/**
 * Version manager class for handling dataset versions and integrity
 */
export class VersionManager {
  constructor() {
    this.currentVersion = null;
    this.manifestCache = null;
    this.integrityChecks = new Map();
  }

  /**
   * Initialize version manager and load current version
   * 
   * Pre: IndexedDB is available
   * Post: Current version is loaded from storage
   * @return {Promise<void>}
   */
  async initialize() {
    try {
      const db = await openDB();
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      
      const versionData = await new Promise((resolve, reject) => {
        const request = store.get('current_version');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (versionData) {
        this.currentVersion = versionData.value;
        logger.info('Version Manager: Loaded version', this.currentVersion);
      } else {
        logger.info('Version Manager: No version found, starting fresh');
      }
    } catch (error) {
      logger.error('Version Manager: Failed to initialize', error);
      throw error;
    }
  }

  /**
   * Get the current dataset version
   * 
   * Pre: Version manager is initialized
   * Post: Returns current version string or null
   * @return {string|null} Current version
   */
  getCurrentVersion() {
    return this.currentVersion;
  }

  /**
   * Check if a new version is available
   * 
   * Pre: manifestUrl is a valid CDN manifest URL
   * Post: Returns boolean indicating if update is available
   * @param {string} manifestUrl - URL to the manifest file
   * @return {Promise<boolean>} True if new version available
   */
  async checkForUpdates(manifestUrl) {
    try {
      logger.info('Version Manager: Checking for updates');

      const response = await fetch(manifestUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status}`);
      }

      const manifest = await response.json();
      this.manifestCache = manifest;

      if (!manifest.version) {
        throw new Error('Manifest missing version field');
      }

      const hasUpdate = !this.currentVersion || 
                       this.compareVersions(manifest.version, this.currentVersion) > 0;

      logger.info('Version Manager: Update check complete', {
        current: this.currentVersion,
        latest: manifest.version,
        hasUpdate,
      });

      return hasUpdate;
    } catch (error) {
      logger.error('Version Manager: Failed to check for updates', error);
      throw error;
    }
  }

  /**
   * Compare two semantic version strings
   * 
   * Pre: v1 and v2 are valid semantic version strings (e.g., "1.2.3")
   * Post: Returns -1, 0, or 1 for comparison result
   * @param {string} v1 - First version
   * @param {string} v2 - Second version
   * @return {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Verify data integrity using checksums
   * 
   * Pre: data is a valid object, expectedHash is a SHA-256 hash string
   * Post: Returns boolean indicating if data matches hash
   * @param {Object} data - Data to verify
   * @param {string} expectedHash - Expected SHA-256 hash
   * @return {Promise<boolean>} True if data is valid
   */
  async verifyIntegrity(data, expectedHash) {
    try {
      const dataString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataString);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const isValid = computedHash === expectedHash;

      if (!isValid) {
        logger.warn('Version Manager: Integrity check failed', {
          expected: expectedHash,
          computed: computedHash,
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Version Manager: Failed to verify integrity', error);
      return false;
    }
  }

  /**
   * Update to a new version
   * 
   * Pre: newVersion is a valid version string
   * Post: Current version is updated in storage
   * @param {string} newVersion - New version to set
   * @return {Promise<void>}
   */
  async updateVersion(newVersion) {
    try {
      const db = await openDB();
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');

      await new Promise((resolve, reject) => {
        const request = store.put({
          key: 'current_version',
          value: newVersion,
          updatedAt: Date.now(),
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this.currentVersion = newVersion;
      logger.info('Version Manager: Updated to version', newVersion);
    } catch (error) {
      logger.error('Version Manager: Failed to update version', error);
      throw error;
    }
  }

  /**
   * Get cached manifest data
   * 
   * Pre: checkForUpdates has been called
   * Post: Returns cached manifest or null
   * @return {Object|null} Cached manifest
   */
  getManifest() {
    return this.manifestCache;
  }

  /**
   * Validate manifest structure
   * 
   * Pre: manifest is an object
   * Post: Returns boolean indicating if manifest is valid
   * @param {Object} manifest - Manifest to validate
   * @return {boolean} True if manifest is valid
   */
  validateManifest(manifest) {
    const requiredFields = ['version', 'timestamp', 'files', 'totalSize'];
    
    for (const field of requiredFields) {
      if (!(field in manifest)) {
        logger.error(`Version Manager: Manifest missing required field: ${field}`);
        return false;
      }
    }

    if (!Array.isArray(manifest.files)) {
      logger.error('Version Manager: Manifest files must be an array');
      return false;
    }

    for (const file of manifest.files) {
      if (!file.path || !file.size || !file.hash) {
        logger.error('Version Manager: Invalid file entry in manifest', file);
        return false;
      }
    }

    return true;
  }

  /**
   * Perform data migration if needed
   * 
   * Pre: fromVersion and toVersion are valid version strings
   * Post: Data is migrated to new version format
   * @param {string} fromVersion - Version to migrate from
   * @param {string} toVersion - Version to migrate to
   * @return {Promise<void>}
   */
  async migrateData(fromVersion, toVersion) {
    try {
      logger.info('Version Manager: Starting migration', {
        from: fromVersion,
        to: toVersion,
      });

      // Define migration paths
      const migrations = {
        '1.0.0_to_1.1.0': this.migrate_1_0_0_to_1_1_0.bind(this),
        '1.1.0_to_2.0.0': this.migrate_1_1_0_to_2_0_0.bind(this),
      };

      const migrationKey = `${fromVersion}_to_${toVersion}`;
      const migrationFn = migrations[migrationKey];

      if (migrationFn) {
        await migrationFn();
        logger.info('Version Manager: Migration completed successfully');
      } else {
        logger.info('Version Manager: No migration needed');
      }
    } catch (error) {
      logger.error('Version Manager: Migration failed', error);
      throw error;
    }
  }

  /**
   * Example migration function (1.0.0 to 1.1.0)
   * 
   * Pre: Database is at version 1.0.0
   * Post: Database is migrated to version 1.1.0 format
   * @return {Promise<void>}
   */
  async migrate_1_0_0_to_1_1_0() {
    logger.info('Version Manager: Running migration 1.0.0 -> 1.1.0');
    // Add migration logic here
    // Example: Add new fields, transform data structures, etc.
  }

  /**
   * Example migration function (1.1.0 to 2.0.0)
   * 
   * Pre: Database is at version 1.1.0
   * Post: Database is migrated to version 2.0.0 format
   * @return {Promise<void>}
   */
  async migrate_1_1_0_to_2_0_0() {
    logger.info('Version Manager: Running migration 1.1.0 -> 2.0.0');
    // Add migration logic here
    // Example: Major schema changes, data restructuring, etc.
  }

  /**
   * Clear all version data and reset
   * 
   * Pre: None
   * Post: All version data is cleared from storage
   * @return {Promise<void>}
   */
  async reset() {
    try {
      const db = await openDB();
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');

      await new Promise((resolve, reject) => {
        const request = store.delete('current_version');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this.currentVersion = null;
      this.manifestCache = null;
      this.integrityChecks.clear();

      logger.info('Version Manager: Reset complete');
    } catch (error) {
      logger.error('Version Manager: Failed to reset', error);
      throw error;
    }
  }

  /**
   * Get version history from storage
   * 
   * Pre: IndexedDB is available
   * Post: Returns array of version history entries
   * @return {Promise<Array>} Version history
   */
  async getVersionHistory() {
    try {
      const db = await openDB();
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');

      const history = await new Promise((resolve, reject) => {
        const request = store.get('version_history');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return history ? history.value : [];
    } catch (error) {
      logger.error('Version Manager: Failed to get version history', error);
      return [];
    }
  }

  /**
   * Add entry to version history
   * 
   * Pre: version is a valid version string
   * Post: Version is added to history in storage
   * @param {string} version - Version to add to history
   * @param {Object} metadata - Additional metadata
   * @return {Promise<void>}
   */
  async addToHistory(version, metadata = {}) {
    try {
      const history = await this.getVersionHistory();
      
      history.push({
        version,
        timestamp: Date.now(),
        ...metadata,
      });

      const db = await openDB();
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');

      await new Promise((resolve, reject) => {
        const request = store.put({
          key: 'version_history',
          value: history,
          updatedAt: Date.now(),
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      logger.info('Version Manager: Added to history', version);
    } catch (error) {
      logger.error('Version Manager: Failed to add to history', error);
      throw error;
    }
  }
}

// Export singleton instance
export const versionManager = new VersionManager();
