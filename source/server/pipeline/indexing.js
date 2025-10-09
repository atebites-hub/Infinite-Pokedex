import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_OUTPUT_DIR = join(__dirname, '..', 'data', 'output');
const DEFAULT_REGISTRY_FILE = join(__dirname, '..', 'data', 'registry.json');

function normalizeSpeciesId(rawId) {
  const numeric = Number(rawId);
  if (!Number.isNaN(numeric)) {
    return String(numeric);
  }
  return String(rawId);
}

function padSpeciesId(rawId) {
  const id = normalizeSpeciesId(rawId);
  return id.padStart(4, '0');
}

function nowIso() {
  return new Date().toISOString();
}

function sha256FromObject(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

export class SourceRegistry {
  constructor(config = {}) {
    this.config = config;
    this.registryPath = config.registryPath || DEFAULT_REGISTRY_FILE;
    this.state = {
      species: {},
      sourcePages: {},
    };
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    await this.ensureDirectory();

    try {
      const contents = await fs.readFile(this.registryPath, 'utf8');
      this.state = JSON.parse(contents);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      await this.save();
    }

    this.initialized = true;
  }

  async ensureDirectory() {
    const dir = dirname(this.registryPath);
    await fs.mkdir(dir, { recursive: true });
  }

  getSpeciesEntry(speciesId) {
    const id = normalizeSpeciesId(speciesId);
    return this.state.species[id] || null;
  }

  getSourcePage(pageId) {
    return this.state.sourcePages[pageId] || null;
  }

  applyUpdates(indexingResult) {
    const { registrySpecies, registrySourcePages } = indexingResult;

    for (const [speciesId, entry] of Object.entries(registrySpecies)) {
      this.state.species[speciesId] = {
        ...entry,
        lastUpdatedAt: entry.lastUpdatedAt || nowIso(),
      };
    }

    for (const [pageId, entry] of Object.entries(registrySourcePages)) {
      const existing = this.state.sourcePages[pageId];
      this.state.sourcePages[pageId] = {
        ...existing,
        ...entry,
        firstSeenAt: existing?.firstSeenAt || entry.firstSeenAt || nowIso(),
        lastCrawledAt: entry.lastCrawledAt || nowIso(),
      };
    }
  }

  async save() {
    await this.ensureDirectory();
    await fs.writeFile(
      this.registryPath,
      JSON.stringify(this.state, null, 2),
      'utf8'
    );
  }
}

export class SpeciesIndexer {
  constructor(config = {}, registry) {
    this.config = config;
    this.registry = registry;
  }

  indexEnrichedData(enrichedData = {}, crawlPlan = null) {
    const manifestSpecies = {};
    const registrySpecies = {};
    const registrySourcePages = {};
    const tidbitPayloads = {};
    const newTidbitIds = [];
    const removedTidbitIds = [];

    const speciesIds = Object.keys(enrichedData);
    let totalTidbits = 0;
    let newSourcePageCount = 0;

    for (const rawSpeciesId of speciesIds) {
      const normalizedId = normalizeSpeciesId(rawSpeciesId);
      const paddedId = padSpeciesId(rawSpeciesId);
      const enriched = enrichedData[rawSpeciesId] || {};
      const tidbits = this.prepareTidbits(normalizedId, enriched.tidbits || []);
      const existing = this.registry.getSpeciesEntry(normalizedId);

      const existingTidbits = new Set(existing?.tidbitIds || []);
      const currentTidbitIds = tidbits.map((t) => t.tidbitId);
      const addedIds = currentTidbitIds.filter(
        (id) => !existingTidbits.has(id)
      );
      const removedIds = (existing?.tidbitIds || []).filter(
        (id) => !currentTidbitIds.includes(id)
      );

      let tidbitRevision = existing?.tidbitRevision || 0;
      const hasExisting = Boolean(existing);
      const hasChanges =
        addedIds.length > 0 || removedIds.length > 0 || !hasExisting;
      if (!hasExisting) {
        tidbitRevision = 1;
      } else if (hasChanges) {
        tidbitRevision += 1;
      }

      const lastUpdated = hasChanges
        ? nowIso()
        : existing?.lastUpdatedAt || nowIso();

      const { manifestEntries, registryEntries } = this.buildSourcePageEntries(
        normalizedId,
        enriched.sources || {}
      );

      for (const entry of registryEntries) {
        const existingPage = this.registry.getSourcePage(entry.sourcePageId);
        if (!existingPage) {
          newSourcePageCount += 1;
        }
        registrySourcePages[entry.sourcePageId] = entry;
      }

      manifestSpecies[paddedId] = {
        tidbitRevision,
        lastUpdated,
        tidbitIds: currentTidbitIds,
        sourcePages: manifestEntries,
        tidbitFile: this.buildTidbitFilePath(paddedId, tidbitRevision),
      };

      registrySpecies[normalizedId] = {
        tidbitRevision,
        tidbitIds: currentTidbitIds,
        sourcePages: registryEntries.reduce((acc, entry) => {
          acc[entry.sourcePageId] = {
            hash: entry.hash,
            lastCrawledAt: entry.lastCrawledAt,
            firstSeenAt: entry.firstSeenAt,
          };
          return acc;
        }, {}),
        lastUpdatedAt: lastUpdated,
      };

      tidbitPayloads[paddedId] = {
        speciesId: normalizedId,
        tidbitRevision,
        tidbits,
      };

      totalTidbits += tidbits.length;

      newTidbitIds.push(...addedIds);
      removedTidbitIds.push(...removedIds);
    }

    return {
      manifestSpecies,
      registrySpecies,
      registrySourcePages,
      tidbitPayloads,
      newTidbitIds,
      removedTidbitIds,
      speciesCount: speciesIds.length,
      totalTidbits,
      newSourcePageCount,
      crawlPlan,
    };
  }

  prepareTidbits(rawSpeciesId, tidbits) {
    return tidbits.map((tidbit) => {
      const tidbitClone = { ...tidbit };
      if (!tidbitClone.tidbitId) {
        tidbitClone.tidbitId = this.generateTidbitId(rawSpeciesId, tidbitClone);
      }
      if (tidbitClone.quality && !tidbitClone.qualityScore) {
        tidbitClone.qualityScore = tidbitClone.quality;
      }
      return {
        tidbitId: tidbitClone.tidbitId,
        title: tidbitClone.title,
        body: tidbitClone.body,
        sourceRefs: tidbitClone.sourceRefs || [],
        generatedAt: tidbitClone.generatedAt || nowIso(),
        qualityScore: tidbitClone.qualityScore || {},
      };
    });
  }

  generateTidbitId(rawSpeciesId, tidbit) {
    const base = (tidbit.title || 'tidbit')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32);
    return `${padSpeciesId(rawSpeciesId)}-${nowIso()}-${base}`;
  }

  buildSourcePageEntries(speciesId, sources) {
    const manifestEntries = [];
    const registryEntries = [];

    for (const [sourceName, sourceData] of Object.entries(sources)) {
      const sourcePageId = `${speciesId}-${sourceName}`;
      const hash = sha256FromObject(sourceData);
      const timestamp = nowIso();

      manifestEntries.push({
        sourcePageId,
        hash,
        lastCrawledAt: timestamp,
        firstSeenAt: timestamp,
      });

      registryEntries.push({
        sourcePageId,
        hash,
        lastCrawledAt: timestamp,
        firstSeenAt: timestamp,
      });
    }

    return { manifestEntries, registryEntries };
  }

  buildTidbitFilePath(paddedSpeciesId, tidbitRevision) {
    return `species/${paddedSpeciesId}/tidbits.v${tidbitRevision}.json`;
  }
}

export class ManifestBuilder {
  constructor(config = {}) {
    this.config = config;
    this.outputDir = config.outputDir || DEFAULT_OUTPUT_DIR;
    this.manifestPath = join(this.outputDir, 'tidbit_manifest.json');
  }

  async build(indexingResult, datasetVersion) {
    const manifestVersion = nowIso();
    const {
      manifestSpecies,
      newTidbitIds,
      removedTidbitIds,
      speciesCount,
      totalTidbits,
      newSourcePageCount,
    } = indexingResult;

    return {
      manifestVersion,
      datasetVersion,
      summary: {
        totalPokemon: speciesCount,
        totalTidbits,
        newPages: newSourcePageCount,
        generatedAt: manifestVersion,
      },
      species: manifestSpecies,
      newTidbits: newTidbitIds,
      removedTidbits: removedTidbitIds,
    };
  }

  async ensureOutputDir() {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async persistManifest(manifest) {
    await this.ensureOutputDir();
    await fs.writeFile(
      this.manifestPath,
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
  }

  async persistTidbitPayloads(tidbitPayloads) {
    await this.ensureOutputDir();

    for (const [paddedSpeciesId, payload] of Object.entries(tidbitPayloads)) {
      const dir = join(this.outputDir, 'species', paddedSpeciesId);
      await fs.mkdir(dir, { recursive: true });
      const filePath = join(dir, `tidbits.v${payload.tidbitRevision}.json`);
      await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
    }
  }
}

export class CrawlPlanner {
  constructor(config = {}, registry) {
    this.config = config;
    this.registry = registry;
  }

  buildPlan({ species = [], force = false } = {}) {
    const tasks =
      species.length > 0 ? species.map((id) => normalizeSpeciesId(id)) : [];

    const sources = {
      bulbapedia: { tasks, options: { force } },
      serebii: { tasks, options: { force } },
      smogon: { tasks, options: { force } },
    };

    return {
      sources,
      totalPages: tasks.length * Object.keys(sources).length,
      newPages: [],
      skippedPages: [],
    };
  }
}
