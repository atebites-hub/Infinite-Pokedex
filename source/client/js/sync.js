/**
 * CDN Sync System
 * 
 * Handles downloading and synchronizing Pokémon data from CDN to IndexedDB.
 * Supports chunked downloads, resume capability, and progress tracking.
 * 
 * Preconditions: IndexedDB initialized, network available for initial sync
 * Postconditions: Species data synced to IndexedDB with version tracking
 */

import { openDB } from './storage.js';
import { error as logError, info as logInfo } from './logger.js';

const CDN_BASE_URL = import.meta.env.VITE_CDN_URL || 'https://cdn.infinite-pokedex.com';
const CHUNK_SIZE = 100; // Species per chunk
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class CDNSync {
  constructor() {
    this.db = null;
    this.currentVersion = null;
    this.syncInProgress = false;
    this.progressCallbacks = [];
  }

  /**
   * Initialize the sync system
   * Preconditions: None
   * Postconditions: Database opened, current version loaded
   */
  async initialize() {
    this.db = await openDB();
    this.currentVersion = await this.getCurrentVersion();
    logInfo('CDN Sync initialized', { currentVersion: this.currentVersion });
  }

  /**
   * Get the current dataset version from IndexedDB
   * Preconditions: Database initialized
   * Postconditions: Returns version string or null
   * @returns {Promise<string|null>} Current version
   */
  async getCurrentVersion() {
    try {
      const tx = this.db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const versionData = await store.get('dataset-version');
      return versionData?.value || null;
    } catch (err) {
      logError('Failed to get current version', { error: err.message });
      return null;
    }
  }

  /**
   * Fetch the manifest from CDN
   * Preconditions: Network available
   * Postconditions: Returns manifest object with version and species list
   * @returns {Promise<Object>} Manifest data
   * @throws {Error} If fetch fails after retries
   */
  async fetchManifest() {
    const url = `${CDN_BASE_URL}/species/index.json`;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const manifest = await response.json();
        logInfo('Manifest fetched', { version: manifest.version, count: manifest.species.length });
        return manifest;
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) {
          throw new Error(`Failed to fetch manifest after ${MAX_RETRIES} attempts: ${err.message}`);
        }
        await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  /**
   * Check if sync is needed by comparing versions
   * Preconditions: Manifest fetched
   * Postconditions: Returns true if sync needed
   * @param {Object} manifest - CDN manifest
   * @returns {Promise<boolean>} True if sync needed
   */
  async needsSync(manifest) {
    if (!this.currentVersion) {
      logInfo('No current version, sync needed');
      return true;
    }
    
    const needsUpdate = this.currentVersion !== manifest.version;
    logInfo('Version check', { 
      current: this.currentVersion, 
      latest: manifest.version, 
      needsSync: needsUpdate 
    });
    return needsUpdate;
  }

  /**
   * Calculate chunks from manifest
   * Preconditions: Manifest is valid
   * Postconditions: Returns array of chunk objects
   * @param {Object} manifest - CDN manifest
   * @returns {Array<Object>} Array of chunks
   */
  calculateChunks(manifest) {
    const chunks = [];
    const species = manifest.species || [];
    
    for (let i = 0; i < species.length; i += CHUNK_SIZE) {
      chunks.push({
        id: Math.floor(i / CHUNK_SIZE),
        start: i,
        end: Math.min(i + CHUNK_SIZE, species.length),
        species: species.slice(i, Math.min(i + CHUNK_SIZE, species.length)),
      });
    }
    
    logInfo('Chunks calculated', { totalChunks: chunks.length, totalSpecies: species.length });
    return chunks;
  }

  /**
   * Download a single chunk of species data
   * Preconditions: Network available, chunk is valid
   * Postconditions: Species data stored in IndexedDB
   * @param {Object} chunk - Chunk object with species list
   * @returns {Promise<void>}
   * @throws {Error} If download fails after retries
   */
  async downloadChunk(chunk) {
    logInfo('Downloading chunk', { chunkId: chunk.id, count: chunk.species.length });
    
    for (const speciesRef of chunk.species) {
      await this.downloadSpecies(speciesRef);
    }
    
    await this.saveCheckpoint(chunk.id);
  }

  /**
   * Download a single species data file
   * Preconditions: Network available
   * Postconditions: Species data stored in IndexedDB
   * @param {Object} speciesRef - Species reference from manifest
   * @returns {Promise<void>}
   */
  async downloadSpecies(speciesRef) {
    const url = `${CDN_BASE_URL}/species/${speciesRef.id}.json`;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const speciesData = await response.json();
        await this.storeSpecies(speciesData);
        return;
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) {
          logError('Failed to download species', { 
            id: speciesRef.id, 
            error: err.message 
          });
          throw err;
        }
        await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  /**
   * Store species data in IndexedDB
   * Preconditions: Database initialized, species data valid
   * Postconditions: Species stored in database
   * @param {Object} speciesData - Species data object
   * @returns {Promise<void>}
   */
  async storeSpecies(speciesData) {
    const tx = this.db.transaction('species', 'readwrite');
    const store = tx.objectStore('species');
    await store.put(speciesData);
    await tx.done;
  }

  /**
   * Save sync checkpoint to enable resume
   * Preconditions: Database initialized
   * Postconditions: Checkpoint saved with chunk ID and timestamp
   * @param {number} chunkId - Chunk ID that was completed
   * @returns {Promise<void>}
   */
  async saveCheckpoint(chunkId) {
    const tx = this.db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    await store.put({
      key: 'sync-checkpoint',
      value: {
        chunkId,
        timestamp: Date.now(),
      },
    });
    await tx.done;
    logInfo('Checkpoint saved', { chunkId });
  }

  /**
   * Get the last sync checkpoint
   * Preconditions: Database initialized
   * Postconditions: Returns checkpoint object or null
   * @returns {Promise<Object|null>} Checkpoint data
   */
  async getCheckpoint() {
    try {
      const tx = this.db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const checkpoint = await store.get('sync-checkpoint');
      return checkpoint?.value || null;
    } catch (err) {
      logError('Failed to get checkpoint', { error: err.message });
      return null;
    }
  }

  /**
   * Clear sync checkpoint after successful sync
   * Preconditions: Database initialized
   * Postconditions: Checkpoint removed
   * @returns {Promise<void>}
   */
  async clearCheckpoint() {
    const tx = this.db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    await store.delete('sync-checkpoint');
    await tx.done;
    logInfo('Checkpoint cleared');
  }

  /**
   * Save the new dataset version
   * Preconditions: Database initialized, sync completed
   * Postconditions: Version saved to metadata
   * @param {string} version - Version string
   * @returns {Promise<void>}
   */
  async saveVersion(version) {
    const tx = this.db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    await store.put({
      key: 'dataset-version',
      value: version,
    });
    await tx.done;
    this.currentVersion = version;
    logInfo('Version saved', { version });
  }

  /**
   * Register a progress callback
   * Preconditions: Callback is a function
   * Postconditions: Callback added to list
   * @param {Function} callback - Progress callback (progress, total) => void
   */
  onProgress(callback) {
    this.progressCallbacks.push(callback);
  }

  /**
   * Notify all progress callbacks
   * Preconditions: None
   * Postconditions: All callbacks invoked with progress
   * @param {number} current - Current progress
   * @param {number} total - Total items
   */
  notifyProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    this.progressCallbacks.forEach((cb) => {
      try {
        cb(current, total, percentage);
      } catch (err) {
        logError('Progress callback error', { error: err.message });
      }
    });
  }

  /**
   * Perform full dataset sync
   * Preconditions: Network available, database initialized
   * Postconditions: Dataset synced to latest version
   * @returns {Promise<void>}
   * @throws {Error} If sync fails
   */
  async syncDataset() {
    if (this.syncInProgress) {
      logInfo('Sync already in progress');
      return;
    }

    this.syncInProgress = true;

    try {
      // Fetch manifest
      const manifest = await this.fetchManifest();

      // Check if sync needed
      if (!(await this.needsSync(manifest))) {
        logInfo('Already up to date');
        this.syncInProgress = false;
        return;
      }

      // Calculate chunks
      const chunks = this.calculateChunks(manifest);

      // Check for resume
      const checkpoint = await this.getCheckpoint();
      const startChunk = checkpoint ? checkpoint.chunkId + 1 : 0;

      if (checkpoint) {
        logInfo('Resuming sync', { fromChunk: startChunk });
      }

      // Download chunks
      for (let i = startChunk; i < chunks.length; i++) {
        await this.downloadChunk(chunks[i]);
        this.notifyProgress(i + 1, chunks.length);
      }

      // Save version and clear checkpoint
      await this.saveVersion(manifest.version);
      await this.clearCheckpoint();

      logInfo('Sync completed', { version: manifest.version });
    } catch (err) {
      logError('Sync failed', { error: err.message });
      throw err;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Delay helper for exponential backoff
   * Preconditions: ms is a positive number
   * Postconditions: Promise resolves after delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const cdnSync = new CDNSync();
