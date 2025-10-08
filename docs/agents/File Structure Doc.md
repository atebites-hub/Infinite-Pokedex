# Infinite Pokédex — File Structure Doc

This document defines the complete file organization for Infinite Pokédex, ensuring modularity, maintainability, and clear separation between client-side PWA, server-side crawler, and documentation.

## Standard Repo Layout (Mandatory)

All projects must follow this root structure to ensure cleanliness and agent cohesion. Deviations require explicit user approval.

```
/Users/jaskarn/github/Infinite Pokedex/
├── AGENTS.md                    # Project rules and agent guidelines
├── scratchpad.md               # Task tracking and progress
├── README.md                   # Project overview and quick start
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore patterns
├── package.json               # Node.js dependencies and scripts
├── vite.config.js             # Vite build configuration
├── docker-compose.yml         # Docker setup for crawler
├── Dockerfile                 # Container configuration
├── source/                    # Source code directory
│   ├── client/               # PWA frontend (vanilla HTML/CSS/JS)
│   └── server/                # Node.js crawler and API
├── scripts/                   # Build and utility scripts
├── tests/                     # Test suites
└── docs/                      # Documentation
    ├── agents/               # Agent reference documents
    ├── code/                 # Code documentation
    └── tests/                # Test documentation
```

**Assumptions**: Modular by layer (client/server/docs); clear separation of concerns.  
**Known Issues**: Cross-language dependencies between client JS and server Node.js.

## Client-Side (PWA Frontend)

**Root**: `/source/client/`  
**Purpose**: Progressive Web App with offline-first capabilities, Gen 9 Pokédex UI, and on-device AI generation.

```
/source/client/
├── index.html                 # Main entry point, PWA manifest
├── manifest.json             # Web App Manifest for PWA installation
├── sw.js                     # Service Worker for offline caching
├── css/                      # Stylesheets
│   ├── main.css             # Core styles and variables
│   ├── animations.css       # Gen 9 Pokédex animations
│   ├── components.css       # Component-specific styles
│   └── responsive.css       # Mobile-first responsive design
├── js/                       # JavaScript modules
│   ├── main.js              # App initialization and routing
│   ├── pokedex.js           # Core Pokédex logic and state
│   ├── animations.js        # Animation helpers and transitions
│   ├── storage.js           # IndexedDB wrapper and data management
│   ├── sync.js              # CDN sync and version management
│   └── workers/              # Web Workers for AI processing
│       ├── webllm-worker.js # WebLLM lore generation worker
│       └── websd-worker.js  # WebSD image generation worker
├── assets/                   # Static assets
│   ├── icons/               # PWA icons (various sizes)
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── apple-touch-icon.png
│   ├── sprites/             # Pokémon sprites and illustrations
│   └── fonts/               # Custom fonts (if any)
└── components/              # Reusable UI components
    ├── pokemon-card.js      # Species list card component
    ├── pokedex-entry.js     # Entry detail component
    ├── lore-panel.js        # Lore generation panel
    └── artwork-gallery.js   # Image gallery component
```

**Browser Storage**: IndexedDB stores species data, tidbits, and generated content with version management.  
**Assumptions**: Modern browsers with IndexedDB, Service Workers, and Web Workers support.  
**Known Issues**: Safari has different IndexedDB quota limits; we implement adaptive cache policies.

## Server-Side (Crawler & API)

**Root**: `/source/server/`  
**Purpose**: Web crawler, data processing, tidbit synthesis, and CDN dataset publishing.

```
/source/server/
├── index.js                  # Main server entry point
├── config/                   # Configuration files
│   ├── crawler.js           # Crawler settings and rate limits
│   ├── models.js            # LLM model configurations
│   └── cdn.js               # CDN upload settings
├── crawler/                 # Web scraping modules
│   ├── base-crawler.js      # Base crawler class with rate limiting
│   ├── bulbapedia.js        # Bulbapedia-specific parser
│   ├── serebii.js           # Serebii-specific parser
│   ├── forums.js            # Forum scraping utilities
│   └── robots.js            # robots.txt compliance checker
├── processors/               # Data processing modules
│   ├── parser.js            # HTML parsing and normalization
│   ├── normalizer.js        # Data schema validation and cleanup
│   ├── tidbit-synthesizer.js # OpenRouter LLM integration
│   └── image-processor.js   # Image optimization with Sharp
├── builders/                # Dataset building modules
│   ├── dataset-builder.js   # Assemble final dataset
│   ├── version-manager.js   # Version and hash management
│   └── cdn-publisher.js     # CDN upload and deployment
├── utils/                   # Utility functions
│   ├── logger.js            # Structured logging
│   ├── cache.js             # Local disk caching
│   └── validation.js        # Schema validation helpers
└── data/                    # Local data storage
    ├── cache/               # HTML cache (gitignored)
    ├── temp/                # Temporary processing files
    └── output/              # Generated dataset (gitignored)
```

**Storage**: Local disk cache for HTML content; CDN for published datasets.  
**Assumptions**: Node.js v18+ with sufficient disk space for caching.  
**Known Issues**: Puppeteer requires Chrome/Chromium; we provide Docker container.

## Scripts Directory

**Root**: `/scripts/`  
**Purpose**: Build automation, development tools, and deployment scripts.

```
/scripts/
├── setup.sh                 # Initial project setup
├── build.sh                 # Build client and server
├── test-suite.sh            # Run all tests (unit, security, integration)
├── dev.sh                   # Start development environment
├── crawl.sh                 # Run crawler with specific parameters
├── deploy.sh                # Deploy to CDN and update latest
└── cleanup.sh              # Clean temporary files and caches
```

## Tests Directory

**Root**: `/tests/`  
**Purpose**: Comprehensive testing across unit, security, and integration levels.

```
/tests/
├── unit/                    # Unit tests
│   ├── client/             # Frontend unit tests
│   │   ├── pokedex.test.js
│   │   ├── storage.test.js
│   │   └── animations.test.js
│   └── server/             # Backend unit tests
│       ├── crawler.test.js
│       ├── parser.test.js
│       └── tidbit-synthesizer.test.js
├── integration/            # End-to-end tests
│   ├── pwa.test.js         # PWA installation and offline functionality
│   ├── sync.test.js        # CDN sync and data integrity
│   └── ai-generation.test.js # WebLLM/WebSD integration tests
└── security/               # Security tests
    ├── xss.test.js         # Cross-site scripting tests
    ├── injection.test.js   # Injection attack tests
    └── privacy.test.js      # Privacy and data handling tests
```

## Documentation Structure

**Root**: `/docs/`  
**Purpose**: Comprehensive documentation for agents, developers, and users.

```
/docs/
├── agents/                  # Agent reference documents
│   ├── Project Requirements Doc.md
│   ├── App Flow Doc.md
│   ├── Tech Stack Doc.md
│   ├── Frontend Guidelines.md
│   ├── Backend Structure Doc.md
│   ├── Implementation Plan.md
│   ├── File Structure Doc.md
│   ├── Testing Guidelines.md
│   └── Documentation Guidelines.md
├── code/                    # Code documentation
│   ├── client/             # Frontend code docs
│   │   ├── pokedex.md      # Core Pokédex logic
│   │   ├── storage.md      # IndexedDB wrapper
│   │   └── workers.md      # Web Workers implementation
│   └── server/             # Backend code docs
│       ├── crawler.md      # Web scraping implementation
│       ├── parser.md       # HTML parsing logic
│       └── tidbit-synthesizer.md # LLM integration
└── tests/                  # Test documentation
    ├── unit.md             # Unit testing guide
    ├── integration.md       # E2E testing guide
    └── security.md         # Security testing guide
```

## Configuration Files

**Root**: Project root  
**Purpose**: Build tools, environment, and deployment configuration.

```
# Build and Development
package.json                 # Node.js dependencies and scripts
vite.config.js              # Vite build configuration
tsconfig.json               # TypeScript configuration (optional)
.eslintrc.js                # ESLint configuration
.prettierrc                 # Prettier configuration
jest.config.js              # Jest testing configuration
playwright.config.js        # Playwright E2E configuration

# Environment and Secrets
.env.example                # Environment variables template
.env                        # Local environment (gitignored)
.env.production             # Production environment
.env.development            # Development environment

# Docker and Deployment
Dockerfile                  # Container configuration
docker-compose.yml          # Multi-service Docker setup
.github/                    # GitHub Actions workflows
│   └── workflows/
│       ├── build.yml       # Build and test pipeline
│       ├── deploy.yml      # Deployment pipeline
│       └── security.yml    # Security scanning
```

## Data Flow and Interoperability

**Client ↔ Server**: Client fetches dataset from CDN via HTTPS; server publishes versioned datasets.  
**Storage**: IndexedDB (client) ↔ CDN (server) with version management and integrity checks.  
**AI Processing**: WebLLM/WebSD run in Web Workers; server uses OpenRouter for tidbit synthesis.  
**Update Policy**: Atomic version updates; graceful fallbacks for failed generations.

## File Naming Conventions

- **Components**: `kebab-case.js` (e.g., `pokemon-card.js`)
- **Utilities**: `camelCase.js` (e.g., `dataManager.js`)
- **Constants**: `UPPER_SNAKE_CASE.js` (e.g., `API_ENDPOINTS.js`)
- **Tests**: `*.test.js` or `*.spec.js`
- **Documentation**: `Title Case.md`

## Git and Version Control

- **`.env`**: For secrets (gitignored)
- **`scratchpad.md`**: For task tracking and agent communication
- **`README.md`**: Overview with AGENTS.md link
- **`/source/server/data/`**: Local cache and temp files (gitignored)
- **`/source/client/assets/sprites/`**: Generated/cached assets (gitignored)

**Assumptions**: Git repository with proper .gitignore; environment variables never committed.  
**Known Issues**: Large binary assets may require Git LFS; we optimize for CDN delivery instead.
