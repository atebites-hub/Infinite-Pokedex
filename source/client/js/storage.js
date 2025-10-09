// Infinite Pokédex - Storage Manager
// IndexedDB wrapper for data persistence and management

export class StorageManager {
  constructor() {
    this.dbName = 'InfinitePokedexDB';
    this.dbVersion = 3; // Incremented for tidbit manifest support
    this.db = null;
    this.isInitialized = false;

    this.init();
  }

  /**
   * Initialize IndexedDB connection
   * Sets up database schema and opens connection
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createObjectStores(db);
      };
    });
  }

  /**
   * Create object stores for different data types
   * @param {IDBDatabase} db - Database instance
   */
  createObjectStores(db) {
    // Species data store
    if (!db.objectStoreNames.contains('species')) {
      const speciesStore = db.createObjectStore('species', { keyPath: 'id' });
      speciesStore.createIndex('name', 'name', { unique: false });
      speciesStore.createIndex('number', 'number', { unique: false });
      speciesStore.createIndex('types', 'types', {
        unique: false,
        multiEntry: true,
      });
    }

    // Tidbits store (per-species lore source material)
    if (!db.objectStoreNames.contains('tidbits')) {
      const tidbitsStore = db.createObjectStore('tidbits', {
        keyPath: 'speciesId',
      });
      tidbitsStore.createIndex('tidbitRevision', 'tidbitRevision', {
        unique: false,
      });
      tidbitsStore.createIndex('updatedAt', 'updatedAt', {
        unique: false,
      });
    }

    // Favorites store
    if (!db.objectStoreNames.contains('favorites')) {
      const favoritesStore = db.createObjectStore('favorites', {
        keyPath: 'speciesId',
      });
      favoritesStore.createIndex('addedAt', 'addedAt', { unique: false });
    }

    // Generated content store (lore, artwork)
    if (!db.objectStoreNames.contains('generatedContent')) {
      const contentStore = db.createObjectStore('generatedContent', {
        keyPath: 'id',
      });
      contentStore.createIndex('speciesId', 'speciesId', { unique: false });
      contentStore.createIndex('type', 'type', { unique: false });
      contentStore.createIndex('generatedAt', 'generatedAt', { unique: false });
    }

    // App settings store
    if (!db.objectStoreNames.contains('settings')) {
      const settingsStore = db.createObjectStore('settings', {
        keyPath: 'key',
      });
    }

    // Cache metadata store
    if (!db.objectStoreNames.contains('cacheMetadata')) {
      const cacheStore = db.createObjectStore('cacheMetadata', {
        keyPath: 'key',
      });
    }

    // Metadata store for sync checkpoints and versions
    if (!db.objectStoreNames.contains('metadata')) {
      const metadataStore = db.createObjectStore('metadata', {
        keyPath: 'key',
      });
    }
  }

  /**
   * Wait for database to be ready
   * @returns {Promise} Resolves when database is ready
   */
  async waitForReady() {
    if (this.isInitialized) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.isInitialized) {
          resolve();
        } else {
          setTimeout(checkReady, 10);
        }
      };
      checkReady();
    });
  }

  /**
   * Store species data
   * @param {Array} speciesData - Array of species objects
   * @returns {Promise} Resolves when data is stored
   */
  async storeSpeciesData(speciesData) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['species'], 'readwrite');
      const store = transaction.objectStore('species');

      // Clear existing data
      store.clear();

      // Add new data
      let completed = 0;
      const total = speciesData.length;

      if (total === 0) {
        resolve();
        return;
      }

      speciesData.forEach((species) => {
        const request = store.add(species);

        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = () => {
          console.error(
            'Failed to store species:',
            species.name,
            request.error
          );
          reject(request.error);
        };
      });
    });
  }

  /**
   * Get all species data
   * @returns {Promise<Array>} Array of species objects
   */
  async getSpeciesData() {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['species'], 'readonly');
      const store = transaction.objectStore('species');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get species data:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get species by ID
   * @param {number} id - Species ID
   * @returns {Promise<Object>} Species object
   */
  async getSpeciesById(id) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['species'], 'readonly');
      const store = transaction.objectStore('species');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get species by ID:', id, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Search species by name
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching species
   */
  async searchSpecies(query) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['species'], 'readonly');
      const store = transaction.objectStore('species');
      const request = store.getAll();

      request.onsuccess = () => {
        const allSpecies = request.result;
        const filtered = allSpecies.filter((species) =>
          species.name.toLowerCase().includes(query.toLowerCase())
        );
        resolve(filtered);
      };

      request.onerror = () => {
        console.error('Failed to search species:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Add species to favorites
   * @param {number} speciesId - Species ID to add
   * @returns {Promise} Resolves when added
   */
  async addToFavorites(speciesId) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['favorites'], 'readwrite');
      const store = transaction.objectStore('favorites');

      const favorite = {
        speciesId: speciesId,
        addedAt: new Date().toISOString(),
      };

      const request = store.add(favorite);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to add to favorites:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove species from favorites
   * @param {number} speciesId - Species ID to remove
   * @returns {Promise} Resolves when removed
   */
  async removeFromFavorites(speciesId) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['favorites'], 'readwrite');
      const store = transaction.objectStore('favorites');
      const request = store.delete(speciesId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to remove from favorites:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all favorites
   * @returns {Promise<Array>} Array of favorite species IDs
   */
  async getFavorites() {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['favorites'], 'readonly');
      const store = transaction.objectStore('favorites');
      const request = store.getAll();

      request.onsuccess = () => {
        const favorites = request.result.map((fav) => fav.speciesId);
        resolve(favorites);
      };

      request.onerror = () => {
        console.error('Failed to get favorites:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if species is favorited
   * @param {number} speciesId - Species ID to check
   * @returns {Promise<boolean>} True if favorited
   */
  async isFavorited(speciesId) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['favorites'], 'readonly');
      const store = transaction.objectStore('favorites');
      const request = store.get(speciesId);

      request.onsuccess = () => {
        resolve(!!request.result);
      };

      request.onerror = () => {
        console.error('Failed to check favorite status:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Store generated content (lore, artwork)
   * @param {Object} content - Generated content object
   * @returns {Promise} Resolves when stored
   */
  async storeGeneratedContent(content) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        ['generatedContent'],
        'readwrite'
      );
      const store = transaction.objectStore('generatedContent');

      const contentWithId = {
        ...content,
        id: `${content.speciesId}-${content.type}-${Date.now()}`,
        generatedAt: new Date().toISOString(),
      };

      const request = store.add(contentWithId);

      request.onsuccess = () => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => {
        console.error('Failed to store generated content:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Store tidbit payload for species
   * @param {Object} record - Tidbit record
   * @returns {Promise<void>}
   */
  async storeTidbitRecord(record) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tidbits'], 'readwrite');
      const store = transaction.objectStore('tidbits');

      const tidbitRecord = {
        ...record,
        updatedAt: record.updatedAt || new Date().toISOString(),
      };

      const request = store.put(tidbitRecord);

      request.onsuccess = () => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get tidbit record for species
   * @param {string} speciesId - Species ID (padded string)
   * @returns {Promise<Object|null>}
   */
  async getTidbitRecord(speciesId) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tidbits'], 'readonly');
      const store = transaction.objectStore('tidbits');
      const request = store.get(speciesId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete tidbit record for species
   * @param {string} speciesId - Species ID (padded string)
   * @returns {Promise<void>}
   */
  async deleteTidbitRecord(speciesId) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tidbits'], 'readwrite');
      const store = transaction.objectStore('tidbits');
      const request = store.delete(speciesId);

      request.onsuccess = () => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all species IDs for stored tidbits
   * @returns {Promise<Array<string>>}
   */
  async getTidbitSpeciesIds() {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tidbits'], 'readonly');
      const store = transaction.objectStore('tidbits');
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Persist tidbit manifest metadata
   * @param {Object} manifestMeta - Manifest metadata
   * @returns {Promise<void>}
   */
  async setTidbitManifestMeta(manifestMeta) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({
        key: 'tidbit-manifest',
        value: manifestMeta,
        updatedAt: new Date().toISOString(),
      });

      request.onsuccess = () => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve tidbit manifest metadata
   * @returns {Promise<Object|null>}
   */
  async getTidbitManifestMeta() {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get('tidbit-manifest');

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get generated content for species
   * @param {number} speciesId - Species ID
   * @param {string} type - Content type (lore, artwork)
   * @returns {Promise<Array>} Array of generated content
   */
  async getGeneratedContent(speciesId, type = null) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['generatedContent'], 'readonly');
      const store = transaction.objectStore('generatedContent');
      const index = store.index('speciesId');
      const request = index.getAll(speciesId);

      request.onsuccess = () => {
        let content = request.result;

        if (type) {
          content = content.filter((item) => item.type === type);
        }

        // Sort by generation date (newest first)
        content.sort(
          (a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)
        );

        resolve(content);
      };

      request.onerror = () => {
        console.error('Failed to get generated content:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Store app settings
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {Promise} Resolves when stored
   */
  async setSetting(key, value) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');

      const setting = {
        key: key,
        value: value,
        updatedAt: new Date().toISOString(),
      };

      const request = store.put(setting);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to store setting:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get app setting
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if not found
   * @returns {Promise<*>} Setting value
   */
  async getSetting(key, defaultValue = null) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };

      request.onerror = () => {
        console.error('Failed to get setting:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Store cache metadata
   * @param {string} key - Cache key
   * @param {Object} metadata - Cache metadata
   * @returns {Promise} Resolves when stored
   */
  async setCacheMetadata(key, metadata) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cacheMetadata'], 'readwrite');
      const store = transaction.objectStore('cacheMetadata');

      const cacheData = {
        key: key,
        ...metadata,
        updatedAt: new Date().toISOString(),
      };

      const request = store.put(cacheData);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to store cache metadata:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cache metadata
   * @param {string} key - Cache key
   * @returns {Promise<Object>} Cache metadata
   */
  async getCacheMetadata(key) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cacheMetadata'], 'readonly');
      const store = transaction.objectStore('cacheMetadata');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get cache metadata:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cached data (species data)
   * @returns {Promise<Array>} Cached species data
   */
  async getCachedData() {
    return this.getSpeciesData();
  }

  /**
   * Cache data (species data)
   * @param {Array} data - Data to cache
   * @returns {Promise} Resolves when cached
   */
  async cacheData(data) {
    await this.storeSpeciesData(data);
    await this.setCacheMetadata('speciesData', {
      count: data.length,
      cachedAt: new Date().toISOString(),
    });
  }

  /**
   * Clear all data
   * @returns {Promise} Resolves when cleared
   */
  async clearAllData() {
    await this.waitForReady();

    const objectStores = [
      'species',
      'favorites',
      'generatedContent',
      'settings',
      'cacheMetadata',
      'metadata',
    ];

    return Promise.all(
      objectStores.map((storeName) => {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => {
            console.error(`Failed to clear ${storeName}:`, request.error);
            reject(request.error);
          };
        });
      })
    );
  }

  /**
   * Get storage usage information
   * @returns {Promise<Object>} Storage usage info
   */
  async getStorageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { available: false };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        available: true,
        quota: estimate.quota,
        usage: estimate.usage,
        percentage: (estimate.usage / estimate.quota) * 100,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { available: false, error: error.message };
    }
  }
}

/**
 * Export a helper function to open the database
 * Used by sync.js and other modules
 * @returns {Promise<IDBDatabase>} Database instance
 */
export async function openDB() {
  const manager = new StorageManager();
  await manager.waitForReady();
  return manager.db;
}
