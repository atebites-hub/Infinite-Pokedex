# Infinite Pokédex — Backend Structure Doc

This document defines the server‑side architecture, data models, pipelines, and security policies that produce and publish the canonical dataset consumed by the PWA. It aligns with the PRD and App Flow.

## High‑Level Architecture
The backend is a Node.js service that runs a controlled crawler + synthesis pipeline on startup (or via a scheduled job) and publishes a static, versioned dataset to a CDN. Clients never send PII nor require authentication; all heavy lifting (tidbit synthesis) is performed server‑side once, while entry‑specific lore is generated client‑side by WebLLM.

Components
- Crawler: respectful scraping of Bulbapedia, Serebii, Marilland, and selected forums
- Parser/Normalizer: transforms raw HTML into canonical Pokémon metadata schema
- Tidbit Synthesizer: distills forum/theory content into concise “iceberg” items via OpenRouter LLM
- Build & Publisher: emits versioned JSON bundles + media to CDN
- Cache Store: local disk cache to avoid re‑fetching; fingerprinted by URL + content hash

Mermaid Diagram
```mermaid
graph TD
  A[Seed URLs/Species Index] --> B[Crawler]
  B --> C[HTML Cache]
  C --> D[Parser/Normalizer]
  D --> E[Canonical JSON per Species]
  E --> F[Tidbit Synth (OpenRouter LLM)]
  F --> G[Iceberg Items]
  E --> H[Dataset Builder]
  G --> H
  H --> I[Versioned Dataset / CDN]
```

## Data Distribution & Stores
No online database is required for clients. The server produces immutable dataset versions (e.g., `vYYYYMMDD-HHMM`) stored as:
- `species/index.json` — list of species ids, names, hashes, and version
- `species/{id}.json` — canonical metadata and tidbits for a species
- `images/base/{id}.png` — base 2D illustration (licensed/attributed)
- `license/attribution.json` — sources and credits

Clients fetch via HTTPS/CDN and persist to IndexedDB. A manifest contains content hashes for integrity checks. The server retains the crawl cache on disk to accelerate rebuilds.

## Canonical Data Schema (JSON)
```json
{
  "id": 6,
  "name": "Charizard",
  "region": "Kanto",
  "types": ["Fire", "Flying"],
  "height_m": 1.7,
  "weight_kg": 90.5,
  "gender_ratio": { "male": 87.5, "female": 12.5 },
  "catch_rate": 45,
  "abilities": ["Blaze", "Solar Power"],
  "locations": ["Area Zero"],
  "moves": [{ "name": "Flamethrower", "method": "TM" }],
  "entries": ["Spits fire that is hot enough to melt boulders..."],
  "sources": {
    "bulbapedia": "https://bulbapedia.bulbagarden.net/..."
  },
  "tidbits": [
    { "title": "The Mew Theory", "body": "...", "sourceRefs": ["serebii-forum-123"] }
  ],
  "image": {
    "base": "images/base/6.png",
    "license": "attribution-id"
  },
  "hash": "<content-hash>"
}
```

Validation Rules
- Required: `id`, `name`, `types[]`, `entries[]`, `hash`
- Numeric bounds: `height_m` 0–20, `weight_kg` 0–10000, `catch_rate` 1–255
- Arrays capped: `moves` ≤ 512, `tidbits` 0–10; server rejects excess
- `hash` = SHA‑256 of canonicalized JSON sans `hash`

## Crawler Design
- Robots Compliance: Respect `robots.txt`; maintain allowlists per domain; rate‑limit requests; use caching and ETags
- Fetch Strategy: Deterministic URL schedule by species; retries with exponential backoff; circuit‑breakers per domain
- Parsers: Domain‑specific extractors convert HTML → structured fields; sanitized and normalized
- Logging: Structured logs with species id, URL, duration, bytes; error classification

Edge Handling
- Missing pages: Mark fields partial; include `sources.missing` notes
- Duplicates: De‑dupe by canonical URL
- Internationalization: Prefer English pages for MVP; schema supports `locale` extension later

## Tidbit Synthesis (Server‑Side)
Input: tokenized/cleaned forum posts, wiki trivia sections, theory pages. The synthesizer composes a prompt instructing an LLM (via OpenRouter) to output 3–7 concise iceberg items, each with a title and 1–3 sentences, citing source refs (ids to scraped docs). We apply profanity and safety filters; items failing safety are dropped.

Output Example
```json
{
  "tidbits": [
    { "title": "Lab Remnants", "body": "Dittos appear near old labs...", "sourceRefs": ["forum-42", "wiki-17"] }
  ]
}
```

Caching & Idempotency
- For each species, store the prompt, model id, and response hash. Reuse unless inputs change.

## Build & Publish Pipeline
Steps
1. Assemble species JSON with validated schema
2. Compute content hashes and write to `species/{id}.json`
3. Generate `species/index.json` with version + hash map
4. Copy/optimize base illustrations; write attributions
5. Upload to CDN atomically under a new version path
6. Update `latest` alias after integrity check passes

Rollback: Re‑point `latest` to previous version; clients cut over on next sync.

## Security & Compliance
- No user data; no authentication required
- Respect site terms; throttle aggressively; backoff on 4xx/5xx
- Sanitization: strip scripts, style tags, and tracking pixels; HTML to text
- Licensing: store attribution for images and quotes; provide `license/attribution.json`
- Secrets: store OpenRouter keys in server environment, never shipped to client

## API Surface (for internal tools/ops only)
If we expose ops endpoints (optional):
- `GET /health` — returns service status and recent crawl stats
- `POST /rebuild` — triggers crawl/build with auth (restricted)

## Deployment & Operations
- Run as a one‑shot job at boot or scheduled; containerized Node.js v18+
- Observability: logs shipped to stdout; optional metrics endpoint
- Storage: persistent volume for HTML cache; CDN credentials injected via env

## Delivery & Hosting
Delivery has two layers: (1) server build/publish to CDN, and (2) static client hosting.

1) Server Build/Publish
- CI/CD: On `main` tag `dataset-v*`, a pipeline builds the dataset inside a container, runs schema validation, and uploads artifacts to `cdn://pokedex/{version}` then updates `cdn://pokedex/latest` after integrity checks.
- Cache policy: `species/*.json` `Cache-Control: public, max-age=31536000, immutable`; `species/index.json` `max-age=60` with ETag for quick version checks.
- Atomicity: Upload to a new version path; only flip the `latest` alias after all files land and hash map verifies.

2) Client Static Hosting
- The PWA (static `index.html`, JS, CSS, icons) is hosted as a standard static site behind the same CDN or an app host (e.g., static bucket + CDN). No dynamic server required at runtime.
- Service Worker handles runtime caching of app shell and species JSON. First run streams chunks; subsequent runs are offline‑first.

Environments
- `dev`: uses a small subset dataset and a `latest-dev` alias
- `staging`: full dataset dry‑run, manual approval gate
- `prod`: public `latest` alias; rollbacks re‑point alias within seconds

CI/CD Steps (high level)
1. Lint + unit tests for parsers
2. Crawl dry‑run with rate‑limited seeds
3. Build dataset, validate schema, compute hashes
4. Publish to versioned CDN path, write `index.json`
5. Smoke test client against the new `latest-canary` alias
6. Promote to `latest`

## Edge Cases & Recovery
- Network failures mid‑crawl: checkpoint species; resume from last successful id
- Schema migration: maintain versioned writers; provide converter for N‑1 → N
- Content removal at source: keep last known good data and mark as `deprecatedSource`


