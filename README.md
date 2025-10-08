# Infinite Pokédex

Infinite Pokédex is a Progressive Web App (PWA) that generates immersive, ever-changing lore for each Pokémon using on-device AI. Built with vanilla HTML/CSS/JS, it emulates the Generation 9 Pokédex (Rotom Phone) experience with TikTok-inspired "iceberg" lore generation and Web Stable Diffusion artwork.

## Quick Start

1. **Clone the repo**: `git clone https://github.com/your-username/infinite-pokedex.git`
2. **Install dependencies**: Run `/scripts/setup.sh` (installs Node.js dependencies and development tools)
3. **Set up environment**: Copy `.env.example` to `.env` and fill in values (OpenRouter API key, CDN settings)
4. **Launch dev mode**: `./scripts/run-dev.sh` (starts Vite dev server and crawler)
5. **Run tests**: `./scripts/test-suite.sh` (unit, security, integration, performance)

## Project Overview

Infinite Pokédex combines:

- **Server-side crawling** of Bulbapedia, Serebii, and Pokémon forums for canonical data and "iceberg" tidbits
- **On-device AI generation** using WebLLM (Qwen3-small) for lore and Web Stable Diffusion for artwork
- **Offline-first PWA** with IndexedDB caching and Service Worker background sync
- **Gen 9 Pokédex UI** with smooth animations and mobile-first responsive design

Each time you open a Pokémon entry, the app generates fresh lore in 5-panel "iceberg" style (like the TikTok account @starstatik) and creates contextual artwork using image-to-image generation.

## Project Structure

Follow the layout in `/docs/agents/File Structure Doc.md` for modularity:

```
/source/
├── client/          # PWA frontend (vanilla HTML/CSS/JS)
├── server/          # Node.js crawler and API
/scripts/            # Build and utility scripts
/tests/              # Test suites (unit, security, integration)
/docs/               # Documentation
├── agents/          # Agent reference documents
├── code/            # Code documentation
└── tests/           # Test documentation
```

## Key Documents

- **AGENTS.md**: Rules for AI agents (Cursor, Claude, etc.)
- **scratchpad.md**: Current tasks and progress tracking
- **Implementation Plan**: Sprint roadmap in `/docs/agents/Implementation Plan.md`
- **Project Requirements**: High-level objectives in `/docs/agents/Project Requirements Doc.md`
- **Tech Stack**: Technologies and dependencies in `/docs/agents/Tech Stack Doc.md`

## Development Workflow

### Prerequisites

- Node.js v18+ with npm
- Modern mobile browser (Chrome Android, Safari iOS)
- Docker (for crawler development)

### Development Commands

```bash
# Setup project
./scripts/setup.sh

# Start development
./scripts/run-dev.sh

# Run tests
./scripts/test-suite.sh

# Build for production
./scripts/build.sh

# Deploy to CDN
./scripts/deploy.sh
```

### Testing

- **Unit Tests**: Jest for client/server components (80%+ coverage)
- **Security Tests**: XSS protection, privacy compliance, vulnerability scanning
- **Integration Tests**: Playwright for PWA functionality and AI generation
- **Performance Tests**: <3s TTI, <2MB bundle size targets

## Technology Stack

### Frontend

- **Core**: Vanilla HTML5, CSS3, JavaScript ES2020+
- **PWA**: Web App Manifest, Service Worker, IndexedDB
- **AI**: WebLLM (Qwen3-small), Web Stable Diffusion
- **Build**: Vite for development and production builds

### Backend

- **Runtime**: Node.js v18+ with Express.js
- **Crawling**: Puppeteer, Cheerio for web scraping
- **AI**: OpenRouter API for tidbit synthesis
- **Storage**: Local disk cache, CDN for dataset publishing

### Development

- **Testing**: Jest, Playwright, ESLint, Prettier
- **Deployment**: Docker, GitHub Actions, CDN publishing
- **Documentation**: JSDoc, Mermaid diagrams, Markdown

## Features

### Core Functionality

- **Dynamic Lore Generation**: Each Pokémon entry generates fresh 5-panel "iceberg" lore
- **Image Generation**: WebSD creates contextual artwork for each lore panel
- **Offline Support**: Full functionality after initial sync, works without internet
- **Gen 9 Aesthetics**: Rotom Phone UI with smooth animations and mobile-first design

### AI Integration

- **WebLLM**: On-device lore generation using Qwen3-small model
- **WebSD**: Image-to-image generation using base Pokémon illustrations
- **dSpy Framework**: Optimized prompting for high-quality content generation
- **Fallback Handling**: Graceful degradation for low-end devices

### Data Management

- **Respectful Crawling**: Compliant web scraping with rate limiting
- **Versioned Datasets**: Atomic updates with rollback capability
- **Client Caching**: IndexedDB with adaptive quota management
- **Background Sync**: Opportunistic updates when online

## Contributing

- Reference **AGENTS.md** for project scope and guidelines
- Run tests before submitting PRs (`./scripts/test-suite.sh`)
- Update documentation as per `/docs/agents/Documentation Guidelines.md`
- Follow TCREI task structure from Implementation Plan
- Ensure 80%+ test coverage for new code

## Browser Support

- **Primary**: Chrome Android, Safari iOS/macOS (PWA support)
- **Features**: Service Workers, IndexedDB, WebLLM, WebSD
- **Fallbacks**: Graceful degradation for older browsers
- **Testing**: Real device testing on mid-range Android and iPhone

## Performance Targets

- **Bundle Size**: <2MB total for fast mobile loading
- **Time to Interactive**: <3s on mid-range mobile devices
- **Offline Functionality**: 100% feature parity when offline
- **AI Generation**: <6s for lore + artwork generation

## Security & Privacy

- **No User Data**: All generation occurs on-device
- **Respectful Crawling**: Compliant with robots.txt and rate limits
- **Content Filtering**: Safety filters for generated content
- **Attribution**: Proper licensing and source attribution

## License

MIT License - see LICENSE file for details

**Assumptions**: Modern mobile browsers with PWA support, Node.js v18+, sufficient device resources for AI models.  
**Known Issues**: Low-end devices may require quality scaling; Safari has different IndexedDB quotas; we implement adaptive fallbacks.
