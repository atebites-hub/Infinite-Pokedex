// Test script for client tidbit sync functionality
// Mock browser APIs for Node.js testing
global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

global.CustomEvent = class CustomEvent {
  constructor(name, options = {}) {
    this.type = name;
    this.detail = options.detail;
  }
};

// Import storage manager
import { StorageManager } from './source/client/js/storage.js';

// Simple sync test class
class TestSync {
  constructor(storage) {
    this.storage = storage;
    this.manifestCache = null;
  }

  async initialize() {
    await this.storage.waitForReady();
    console.log('✅ Sync system initialized');
  }

  async syncAll({ force = false } = {}) {
    try {
      console.log('📡 Fetching tidbit manifest...');
      const manifest = await this.fetchTidbitManifest();

      const manifestMeta = {
        manifestVersion: manifest.manifestVersion,
        datasetVersion: manifest.datasetVersion,
        fetchedAt: new Date().toISOString(),
      };

      await this.storage.setTidbitManifestMeta(manifestMeta);
      console.log('📄 Stored manifest metadata');

      const syncPlan = await this.buildSyncPlan(manifest, { force });
      console.log('📋 Sync plan:', syncPlan.summary);

      if (syncPlan.totalSpecies === 0 && syncPlan.totalRemovals === 0) {
        console.log('📭 No new tidbits to sync');
        return;
      }

      console.log(`📥 Syncing ${syncPlan.totalSpecies} species...`);
      let processed = 0;
      for (const speciesId of syncPlan.speciesToUpdate) {
        await this.syncSpeciesTidbits(speciesId, manifest.species[speciesId]);
        processed += 1;
        console.log(
          `✅ Synced species ${speciesId} (${processed}/${syncPlan.totalSpecies})`
        );
      }

      for (const speciesId of syncPlan.speciesToRemove) {
        await this.storage.deleteTidbitRecord(speciesId);
        console.log(`🗑️ Removed species ${speciesId}`);
      }

      console.log('✅ Tidbit sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }

  async fetchTidbitManifest() {
    const url = 'http://localhost:8080/tidbit_manifest.json';
    console.log('🌐 Fetching:', url);

    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Manifest fetch failed with status ${response.status}`);
    }

    const manifest = await response.json();
    this.validateTidbitManifest(manifest);
    this.manifestCache = manifest;
    return manifest;
  }

  validateTidbitManifest(manifest) {
    const requiredFields = ['manifestVersion', 'datasetVersion', 'species'];
    requiredFields.forEach((field) => {
      if (!manifest[field]) {
        throw new Error(`Manifest missing field: ${field}`);
      }
    });
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
      } else if (existing.tidbitRevision !== entry.tidbitRevision) {
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
    const url = `http://localhost:8080/${manifestEntry.tidbitFile}`;

    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();

    await this.storage.storeTidbitRecord({
      speciesId,
      tidbitRevision: manifestEntry.tidbitRevision,
      tidbits: payload.tidbits || [],
      manifestVersion: this.manifestCache.manifestVersion,
      datasetVersion: this.manifestCache.datasetVersion,
    });
  }
}

async function testClientSync() {
  console.log('🧪 Testing client tidbit sync...');

  try {
    // Create storage manager
    const storage = new StorageManager();

    // Create sync instance
    const sync = new TestSync(storage);

    // Initialize and run sync
    await sync.initialize();
    await sync.syncAll({ force: true });

    // Check what was stored
    const manifestMeta = await storage.getTidbitManifestMeta();
    console.log('📄 Final manifest metadata:', manifestMeta);

    const speciesIds = await storage.getTidbitSpeciesIds();
    console.log('🔢 Species with stored tidbits:', speciesIds);

    for (const speciesId of speciesIds) {
      const tidbitRecord = await storage.getTidbitRecord(speciesId);
      console.log(
        `📚 Species ${speciesId}: ${tidbitRecord?.tidbits?.length || 0} tidbits`
      );
    }

    console.log('🎉 Client sync test completed successfully!');
  } catch (error) {
    console.error('❌ Client sync test failed:', error);
    throw error;
  }
}

// Run the test
testClientSync().catch(console.error);
