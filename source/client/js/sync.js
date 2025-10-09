/**
 * CDN Sync System
 *
 * Handles downloading and synchronizing Pokémon data from CDN to IndexedDB.
 * Supports chunked downloads, resume capability, and progress tracking.
 *
 * Preconditions: IndexedDB initialized, network available for initial sync
 * Postconditions: Species data synced to IndexedDB with version tracking
 */

import { StorageManager } from './storage.js';
import { logger } from './logger.js';
import { versionManager } from './version.js';
import { offlineManager } from './offline.js';

const CDN_BASE_URL = import.meta.env.VITE_CDN_URL || 'http://localhost:8080';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;

function emitEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function padSpeciesId(id) {
  return String(id).padStart(4, '0');
}

export class CDNSync {
  constructor() {
    this.storage = new StorageManager();
    this.syncInProgress = false;
    this.progressCallbacks = [];
    this.manifestCache = null;
  }

  async initialize() {
    await this.storage.waitForReady();
    await versionManager.initialize();
    logger.info('CDN Sync: initialized');
  }

  onProgress(callback) {
    if (typeof callback === 'function') {
      this.progressCallbacks.push(callback);
    }
  }

  notifyProgress(current, total) {
    const percentage = total === 0 ? 100 : Math.round((current / total) * 100);
    this.progressCallbacks.forEach((cb) => {
      try {
        cb(current, total, percentage);
      } catch (error) {
        logger.error('CDN Sync: progress callback failed', error);
      }
    });
  }

  async syncAll({ force = false } = {}) {
    if (this.syncInProgress) {
      logger.info('CDN Sync: sync already in progress');
      return;
    }

    this.syncInProgress = true;

    try {
      if (!offlineManager.isOnline) {
        logger.warn('CDN Sync: skipping sync while offline');
        return;
      }

      const manifest = await this.fetchTidbitManifest();
      const manifestMeta = {
        manifestVersion: manifest.manifestVersion,
        datasetVersion: manifest.datasetVersion,
        fetchedAt: new Date().toISOString(),
      };

      await this.storage.setTidbitManifestMeta(manifestMeta);

      const syncPlan = await this.buildSyncPlan(manifest, { force });
      logger.info('CDN Sync: sync plan established', syncPlan.summary);

      if (syncPlan.totalSpecies === 0 && syncPlan.totalRemovals === 0) {
        logger.info('CDN Sync: no new tidbits to sync');
        return;
      }

      let processed = 0;
      for (const speciesId of syncPlan.speciesToUpdate) {
        await this.syncSpeciesTidbits(speciesId, manifest.species[speciesId]);
        processed += 1;
        this.notifyProgress(processed, syncPlan.totalSpecies);
      }

      for (const speciesId of syncPlan.speciesToRemove) {
        await this.storage.deleteTidbitRecord(speciesId);
      }

      await versionManager.updateVersion(manifest.datasetVersion);
      await versionManager.addToHistory(manifest.datasetVersion, {
        tidbitManifestVersion: manifest.manifestVersion,
        syncedSpecies: syncPlan.totalSpecies,
        removedSpecies: syncPlan.totalRemovals,
      });

      emitEvent('tidbits:sync-complete', {
        manifest,
        synced: syncPlan.speciesToUpdate,
        removed: syncPlan.speciesToRemove,
      });

      logger.info('CDN Sync: tidbit sync completed');
    } catch (error) {
      logger.error('CDN Sync: sync failed', error);
      emitEvent('tidbits:sync-error', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async fetchTidbitManifest() {
    const url = `${CDN_BASE_URL}/tidbit_manifest.json`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) {
          throw new Error(
            `Manifest fetch failed with status ${response.status}`
          );
        }

        const manifest = await response.json();
        this.validateTidbitManifest(manifest);
        this.manifestCache = manifest;
        logger.info('CDN Sync: fetched tidbit manifest', {
          manifestVersion: manifest.manifestVersion,
          datasetVersion: manifest.datasetVersion,
        });
        return manifest;
      } catch (error) {
        logger.warn('CDN Sync: manifest fetch attempt failed', {
          attempt,
          error: error.message,
        });
        if (attempt === MAX_RETRIES) {
          throw error;
        }
        await delay(RETRY_DELAY_MS * attempt);
      }
    }

    throw new Error('Manifest fetch failed after retries.');
  }

  validateTidbitManifest(manifest) {
    const requiredFields = ['manifestVersion', 'datasetVersion', 'species'];
    requiredFields.forEach((field) => {
      if (!manifest[field]) {
        throw new Error(`Manifest missing field: ${field}`);
      }
    });

    if (typeof manifest.species !== 'object') {
      throw new Error('Manifest species definition invalid.');
    }
  }

  async buildSyncPlan(manifest, { force = false } = {}) {
    const storedMeta = await this.storage.getTidbitManifestMeta();
    const storedSpecies = await this.storage.getTidbitSpeciesIds();

    const speciesToUpdate = [];
    const speciesToRemove = [];

    for (const [paddedId, entry] of Object.entries(manifest.species)) {
      const existing = await this.storage.getTidbitRecord(paddedId);

      if (force || !existing) {
        speciesToUpdate.push(paddedId);
        continue;
      }

      if (existing.tidbitRevision !== entry.tidbitRevision) {
        speciesToUpdate.push(paddedId);
      }
    }

    for (const storedId of storedSpecies) {
      if (!manifest.species[storedId]) {
        speciesToRemove.push(storedId);
      }
    }

    return {
      speciesToUpdate,
      speciesToRemove,
      totalSpecies: speciesToUpdate.length,
      totalRemovals: speciesToRemove.length,
      summary: {
        manifestVersion: manifest.manifestVersion,
        datasetVersion: manifest.datasetVersion,
        previousManifestVersion: storedMeta?.manifestVersion || null,
      },
    };
  }

  async syncSpeciesTidbits(speciesId, manifestEntry) {
    const paddedId = padSpeciesId(speciesId);
    const url = `${CDN_BASE_URL}/${manifestEntry.tidbitFile}`;

    const payload = await this.fetchWithRetries(url, `tidbits for ${paddedId}`);

    await this.storage.storeTidbitRecord({
      speciesId: paddedId,
      tidbitRevision: manifestEntry.tidbitRevision,
      tidbits: payload.tidbits || [],
      manifestVersion: this.manifestCache.manifestVersion,
      datasetVersion: this.manifestCache.datasetVersion,
    });

    emitEvent('tidbits:updated', {
      speciesId: paddedId,
      tidbitRevision: manifestEntry.tidbitRevision,
      tidbits: payload.tidbits || [],
    });
  }

  async fetchWithRetries(url, label) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        return payload;
      } catch (error) {
        logger.warn(`CDN Sync: fetch failed for ${label}`, {
          url,
          attempt,
          error: error.message,
        });
        if (attempt === MAX_RETRIES) {
          throw error;
        }
        await delay(RETRY_DELAY_MS * attempt);
      }
    }

    throw new Error(`Fetch failed for ${label}`);
  }
}

export const cdnSync = new CDNSync();
