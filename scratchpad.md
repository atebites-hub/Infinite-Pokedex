# Infinite Pokédex — Project Scratchpad

This file serves as the central hub for task planning, progress tracking, and agent communication in Infinite Pokédex. It evolves with the project—update sections as you plan, execute, and iterate. Agents use it for TCREI breakdowns, status updates, and feedback. Do not edit without explicit user instruction; reference AGENTS.md for rules.

## Background and Motivation

Infinite Pokédex is a Progressive Web App inspired by the TikTok account @starstatik, which creates "iceberg" lore videos for Pokémon. Instead of videos, we're building a PWA that generates immersive, ever-changing lore for each Pokémon using on-device AI. The app emulates the Generation 9 Pokédex (Rotom Phone) experience with TikTok-inspired 5-panel "iceberg" lore generation and Web Stable Diffusion artwork.

The project combines server-side web crawling of Bulbapedia/Serebii for canonical data and "iceberg" tidbits, with client-side AI generation using WebLLM (Qwen3-small) for lore and WebSD for artwork. This creates an "infinite" experience where each Pokémon entry feels fresh and unique, while maintaining the authentic Gen 9 Pokédex aesthetic.

## Key Challenges and Analysis

### Assumptions

- Modern mobile browsers support Service Workers, IndexedDB, and Web Workers
- WebLLM provides Qwen3-small model suitable for on-device execution
- WebSD supports image-to-image generation with acceptable performance
- External sites (Bulbapedia, Serebii) allow respectful scraping within rate limits
- Users have sufficient device resources for AI model execution

### Counterpoints

- **Skeptic**: What if WebLLM/WebSD are too resource-intensive for mobile devices?
- **Alternative**: Implement server-side generation with aggressive caching and fallbacks
- **Skeptic**: What if external sites change structure or block scraping?
- **Alternative**: Use static datasets with manual updates and robust parser error handling

### Alternatives

- **Option 1**: Use server-side AI generation instead of on-device (simpler but less private)
- **Option 2**: Use pre-generated content instead of dynamic generation (faster but less "infinite")
- **Option 3**: Use React/Vue instead of vanilla JS (more complex but potentially better maintainability)

### Risks

- **Performance**: AI models may be too heavy for low-end devices
- **Reliability**: External site changes could break crawler
- **Cost**: CDN and API costs for dataset hosting and LLM services
- **Compatibility**: Safari PWA limitations and IndexedDB quota differences

## High-Level Task Breakdown

### Phase 1: Foundation (Sprints 1-2)

1. **T**: Set up project structure and development environment. **C**: From File Structure Doc, create all directories and base files. **R**: Use vanilla HTML/CSS/JS; no frameworks. **E**: `npm init`, `vite.config.js`, basic `index.html`. **I**: Test dev server runs; iterate on structure if needed.

2. **T**: Implement basic PWA manifest and service worker. **C**: From App Flow Doc, create offline-first architecture. **R**: Use standard PWA patterns; manifest must include all required fields. **E**: `manifest.json` with icons, `sw.js` with basic caching. **I**: Test PWA installation on mobile; verify offline functionality.

3. **T**: Build server-side crawler with respectful scraping. **C**: From Backend Structure Doc, create crawler for Bulbapedia/Serebii. **R**: Respect robots.txt, rate limiting, exponential backoff. **E**: `base-crawler.js`, domain-specific parsers, retry logic. **I**: Test crawling on small dataset; verify compliance.

4. **T**: Implement data processing and tidbit synthesis. **C**: From Backend Structure Doc, create parser and LLM integration. **R**: Extract canonical metadata; validate against schema. **E**: `parser.js`, `normalizer.js`, OpenRouter integration. **I**: Test parsing accuracy; verify synthesis quality.

### Phase 2: AI Integration (Sprints 3-5)

5. **T**: Integrate WebLLM for on-device lore generation. **C**: From Tech Stack Doc, implement Qwen3-small model. **R**: Use smallest available model; implement progressive loading. **E**: `webllm-worker.js`, model selection, memory management. **I**: Test model loading; verify generation quality.

6. **T**: Implement WebSD for image-to-image generation. **C**: From Tech Stack Doc, create artwork generation system. **R**: Use base illustrations as init images; optimize for mobile. **E**: `websd-worker.js`, image processing, quality settings. **I**: Test image generation; verify quality and performance.

7. **T**: Build Gen 9 Pokédex UI with animations. **C**: From Frontend Guidelines, create Rotom-style interface. **R**: Mobile-first design; CSS animations for Gen 9 feel. **E**: Base layout with navigation, card components, color palette. **I**: Test on various screen sizes; refine animations.

### Phase 3: Polish & Deployment (Sprints 6-8)

8. **T**: Implement comprehensive testing suite. **C**: From Testing Guidelines, create unit, security, and integration tests. **R**: 80%+ coverage for all modules; security scan clean. **E**: Jest tests, Playwright E2E, security scanning. **I**: Run full test suite; fix any failures.

9. **T**: Set up production deployment pipeline. **C**: From Backend Structure Doc, implement CI/CD for deployment. **R**: Automated builds, CDN publishing, rollback capability. **E**: GitHub Actions, Docker containers, deployment scripts. **I**: Test deployment pipeline; verify rollback functionality.

10. **T**: Create user documentation and launch preparation. **C**: From Documentation Guidelines, create comprehensive user docs. **R**: Clear instructions, troubleshooting, FAQ. **E**: User guide, help system, video tutorials. **I**: Test documentation; verify clarity and completeness.

## Current Status / Progress Tracking

**Project Status**: Sprint 1 Complete ✅ - Ready for Sprint 3  
**Current Sprint**: Sprint 3 (Client Data Sync & Offline Support)  
**Progress**: Sprint 1 (100%), Sprint 2 (100%), Sprint 3 (0%)  
**Last Updated**: All Sprint 1 agents completed, Sprint 2 merged, Sprint 3 planning

### Completed

- ✅ All 9 core agent reference documents created
- ✅ Project Requirements Doc with comprehensive scope
- ✅ App Flow Doc with detailed user journeys
- ✅ Tech Stack Doc with complete technology specifications
- ✅ Frontend Guidelines with Gen 9 Pokédex design system
- ✅ Backend Structure Doc with crawler and CDN architecture
- ✅ Implementation Plan with 8-sprint roadmap
- ✅ File Structure Doc with modular organization
- ✅ Testing Guidelines with comprehensive test strategy
- ✅ Documentation Guidelines with maintenance standards
- ✅ README.md with project overview and quick start
- ✅ scratchpad.md with initial project planning
- ✅ AGENTS.md updated for Infinite Pokédex
- ✅ Multi-agent coordination prompts created
- ✅ Sprint 1: Foundation & Setup (all agents completed)
- ✅ Sprint 2: Server Infrastructure & Crawler (Agent 2 completed)

### Sprint 1 Completed ✅

- **Agent 1 (Frontend)**: `feature/frontend-foundation` - ✅ COMPLETED - PWA structure, UI, IndexedDB
- **Agent 2 (Server)**: `feature/server-infrastructure` - ✅ COMPLETED - Crawler, parser, LLM integration
- **Agent 3 (DevOps)**: `feature/dev-environment` - ✅ COMPLETED - Testing, CI/CD, automation

**Sprint 1 Summary**:
- All 3 agents completed their tasks successfully
- Frontend: PWA structure, Gen 9 UI, Service Worker, IndexedDB
- Server: Crawler (Bulbapedia/Serebii/Smogon), parser, tidbit synthesis
- DevOps: CI/CD pipeline, Docker, security scanning, E2E tests

### Sprint 2 Completed ✅

- **Server Infrastructure**: Fully implemented and merged
- Respectful web crawler with robots.txt compliance
- HTML parser and data normalizer with validation
- OpenRouter LLM integration for tidbit synthesis
- Dataset builder and CDN publisher (ready for deployment)
- Comprehensive unit tests with 80%+ coverage

### Sprint 3 Completed ✅

- **Client Data Sync**: Fully implemented and merged
- CDN sync system with resumable downloads and chunking
- Service Worker with advanced caching strategies (cache-first, network-first)
- Version management with SHA-256 integrity verification
- Offline fallback with retry queue and error handling
- Sync progress UI components with notifications
- Comprehensive unit tests with 80%+ coverage
- Complete documentation with architecture diagrams

### Pending (Future Sprints)

- [ ] Sprint 4: WebLLM Integration (on-device lore generation)
- [ ] Sprint 5: WebSD Integration (image-to-image generation)
- [ ] Sprint 6: UI Polish & Animations (Gen 9 Pokédex feel)
- [ ] Sprint 7: Testing & QA (comprehensive testing, security)
- [ ] Sprint 8: Deployment & Launch (production deployment, monitoring)

## Project Status Board

### Sprint 1: Multi-Agent Development (Active)

**Agent 1 (Frontend Foundation)**: `feature/frontend-foundation` ✅ COMPLETED

- [x] Set up project structure and Vite development environment
- [x] Create basic PWA manifest and service worker
- [x] Implement Gen 9 Pokédex UI foundation with Rotom styling
- [x] Set up IndexedDB wrapper and data management
- [x] Create responsive mobile-first design

**Agent 2 (Server Infrastructure)**: `feature/server-infrastructure` ✅ COMPLETED

- [x] Set up Node.js server structure and dependencies
- [x] Implement respectful web crawler for Bulbapedia/Serebii
- [x] Build HTML parser and data normalizer
- [x] Integrate OpenRouter LLM for tidbit synthesis
- [x] Create dataset builder and CDN publisher
- [x] Add Smogon crawler for Strategy Pokedex and forums

**Agent 3 (Development Environment)**: `feature/dev-environment` ✅ COMPLETED

- [x] Create development scripts and automation
- [x] Set up Jest testing framework with 80%+ coverage
- [x] Implement Playwright for E2E testing
- [x] Configure ESLint, Prettier, and security scanning
- [x] Set up GitHub Actions CI/CD pipeline
- [x] Create Docker configuration for crawler
- [x] Add ESLint security plugin
- [x] Create integration test documentation

### Sprint 3: Client Data Sync & Offline Support ✅ COMPLETED

**Branch**: `feature/client-sync`
**Status**: Completed and ready for merge

**Tasks**:
- [x] Build CDN sync system with resumable downloads
- [x] Implement Service Worker caching strategies
- [x] Create data integrity and version management
- [x] Build offline fallback and error handling
- [x] Add sync progress UI components
- [x] Create comprehensive sync tests
- [x] Update documentation for Sprint 3

**Accomplishments**:
- ✅ CDNSync class with chunked downloads and resume capability
- ✅ VersionManager with semantic versioning and SHA-256 integrity checks
- ✅ Service Worker with cache-first and network-first strategies
- ✅ OfflineManager with retry queue and fallback responses
- ✅ ErrorHandler for centralized error management
- ✅ SyncUI with progress bar and browser notifications
- ✅ Offline fallback HTML page with auto-retry
- ✅ Comprehensive unit tests (sync, version, offline)
- ✅ Complete documentation with Mermaid diagrams

### Future Sprints (Pending)

- [ ] Sprint 4: WebLLM Integration (on-device lore generation)
- [ ] Sprint 5: WebSD Integration (image-to-image generation)
- [ ] Sprint 6: UI Polish & Animations (Gen 9 Pokédex feel)
- [ ] Sprint 7: Testing & QA (comprehensive testing, security)
- [ ] Sprint 8: Deployment & Launch (production deployment, monitoring)

## Agent Feedback & Assistance Requests

### Multi-Agent Coordination Status

- **Sprint 1 Active**: 3 parallel agents working on independent tasks
- **No Cross-Dependencies**: Each agent can work independently
- **Communication**: Primary via scratchpad.md updates, secondary via GitHub issues
- **Branch Strategy**: Each agent has dedicated feature branch

### Agent-Specific Notes

**Agent 1 (Frontend)**: ✅ COMPLETED - PWA structure, Gen 9 UI, IndexedDB wrapper
**Agent 2 (Server)**: ✅ COMPLETED - Crawler, parser, LLM integration, CDN publishing  
**Agent 3 (DevOps)**: ✅ COMPLETED - Testing, CI/CD, automation, quality gates
**Sprint 3 (Client Sync)**: ✅ COMPLETED - CDN sync, offline support, version management

### Agent 2 (Server Infrastructure) - COMPLETED

**Accomplishments:**

- ✅ Complete Node.js server structure with modular architecture
- ✅ Respectful web crawler with rate limiting and robots.txt compliance
- ✅ HTML parser using Cheerio with domain-specific extractors
- ✅ OpenRouter LLM integration for tidbit synthesis with safety filters
- ✅ Dataset builder with versioning and content hashing
- ✅ CDN publisher with atomic updates and rollback support
- ✅ Comprehensive configuration system for multiple CDN providers
- ✅ Structured logging and error handling
- ✅ Test suite and documentation

**Key Features Implemented:**

- Rate limiting with exponential backoff and circuit breakers
- Multi-source data normalization and validation
- LLM-powered tidbit generation with quality controls
- Atomic CDN publishing with version management
- Support for AWS S3, Cloudflare R2, and Vercel Blob
- Comprehensive error handling and logging
- Smogon Strategy Pokedex crawler for competitive data
- Smogon forums crawler for community discussions and tidbits

### Key Decisions Made

- **Technology Choice**: Vanilla HTML/CSS/JS over frameworks for performance
- **AI Approach**: On-device generation with WebLLM/WebSD for privacy
- **Architecture**: Server-side crawling + client-side generation + CDN publishing
- **UI Design**: Gen 9 Pokédex (Rotom Phone) aesthetic with mobile-first approach
- **Multi-Agent**: Parallel development with no cross-dependencies

### Coordination Protocol

- **Daily Updates**: Each agent updates scratchpad with progress and blockers
- **Conflict Resolution**: Use feature branches and coordinate through scratchpad
- **Success Metrics**: All tasks complete within 2 weeks, tests pass, documentation updated

## Lessons

### Project Setup Lessons

- **Documentation First**: Comprehensive agent reference documents provide clear context boundaries
- **TCREI Structure**: Task, Context, Rules, Examples, Iteration format ensures clear implementation guidance
- **Mobile-First**: Vanilla HTML/CSS/JS approach prioritizes performance and bundle size
- **AI Integration**: On-device generation balances privacy with performance requirements

### Technical Lessons

- **WebLLM/WebSD**: On-device AI generation requires careful resource management and fallbacks
- **PWA Architecture**: Offline-first design with IndexedDB and Service Worker caching
- **Gen 9 Aesthetics**: CSS animations and transforms can recreate game-like feel without frameworks
- **Respectful Crawling**: Rate limiting and robots.txt compliance essential for sustainable scraping
- **Configuration Architecture**: BaseCrawler should use defaultConfig directly, not try to get 'default' source config
- **Rate Limiting Bug Fix**: Fixed RateLimiter.wait() method to properly handle fractional requestsPerSecond and prevent burstTokens from becoming permanently zero
- **CLI Detection Bug Fix**: Fixed CLI detection logic in index.js to use more robust path comparison that handles undefined process.argv[1] and cross-platform path differences by using import.meta.url comparison as primary method with fallback to fileURLToPath() and resolve() comparison
- **Robots.txt Parser Bug Fix**: Fixed RobotsParser.parseRobotsTxt() method to skip lines without colons, preventing undefined value variables that could cause unexpected behavior when processing robots.txt rules
- **Cache Key Bug Fix**: Fixed TidbitSynthesizer.getCacheKey() method to include forum data in cache key and use full SHA-256 hash instead of truncated hash, preventing stale tidbits when forum discussions change and reducing hash collision risk
- **Cache Key Generation Bug Fix**: Fixed TidbitSynthesizer.enrichSpecies() method to handle getForumData() failures gracefully without breaking cache key generation, ensuring stable cache keys even when forum data is unavailable or inconsistent
- **Cache Key Normalization Bug Fix**: Fixed TidbitSynthesizer.getCacheKey() method to normalize forum data by using a consistent placeholder ('no-forum-data') when forum data is empty or undefined, preventing cache misses due to inconsistent empty string values
- **Test Refactoring**: Moved test-cache-key.js to tests/unit/ directory and created comprehensive test suite with cache-key-fix.test.js and cache-key-fix-runner.js for proper test structure and Jest integration
- **Text Cleaning Bug Fix**: Fixed regex pattern in DataProcessor.cleanText() and sanitizeText() functions to preserve valid punctuation like apostrophes, parentheses, and colons while still removing invalid special characters, preventing corruption of Pokémon names and descriptions
- **Unicode Character Preservation Bug Fix**: Fixed sanitizeText() function in validation.js and cleanText() methods in parser.js and serebii.js to use Unicode property escapes (\p{L}, \p{N}) instead of \w, preserving accented characters (é, ñ), gender symbols (♀, ♂), and other Unicode characters in Pokémon names like Flabébé, Farfetch'd, and Nidoran♀/♂. Also improved HTML tag removal to use proper regex pattern `/<[^>]*>/g` instead of just removing `<>` characters. Created comprehensive test suite (validation-runner.js) with 18 passing tests to verify Unicode preservation.
- **SerebiiCrawler Data Extraction Bug Fix**: Fixed SerebiiCrawler class to replace hardcoded placeholder values with actual HTML parsing using Cheerio, enabling proper extraction of Pokémon data from Serebii pages including name, types, stats, abilities, moves, description, locations, and evolution information
- **Robots.txt Multiple Colons Bug Fix**: Fixed RobotsParser.parseRobotsTxt() method in BaseCrawler to properly handle lines containing multiple colons by using indexOf(':') and substring() instead of split(':'), ensuring complete value preservation for robots.txt rules like "Disallow: /path:with:colons"
- **Robots.txt Malformed Lines Handling**: Enhanced RobotsParser.parseRobotsTxt() method in BaseCrawler to add comprehensive validation and logging for malformed robots.txt lines including: (1) debug logging when lines are missing colons, (2) validation to skip lines with empty directives, (3) debug logging for empty directive lines. Also removed redundant .toLowerCase() calls on already-lowercased directive variables. Added comprehensive test suite (robots-parser.test.js) with 5 passing tests covering edge cases like missing colons, empty directives, multiple colons in values, empty values, and comment handling
- **Rate Limiter Burst Token Logic Bug Fix**: Fixed RateLimiter.wait() method in BaseCrawler to properly handle burst token consumption and refill during wait periods, preventing burstTokens from becoming permanently zero or negative by accounting for time elapsed during waits and using Math.max(0, burstTokens - 1) for token consumption
- **Rate Limiter Minute Limit Check Bug Fix**: Fixed minute limit check in RateLimiter.wait() method to safely handle empty requests array by checking array length before using Math.min(...this.requests), preventing runtime errors when no previous requests exist
- **LLM Response Validation Bug Fix**: Fixed TidbitSynthesizer methods (generateTidbits, generateTidbitsFallback, checkSafety, checkQuality) to validate OpenRouter API response structure before accessing nested properties like response.data.choices[0].message.content, preventing runtime errors when API returns empty or malformed responses. Created reusable extractResponseContent() helper method with comprehensive validation of response structure including checks for null response, missing data, invalid choices array, empty choices, missing message, and invalid content. Added descriptive error messages with context for better debugging. All existing inline validation replaced with helper method calls for consistency and maintainability. Updated test suite with 25 passing tests including 10 new tests for extractResponseContent() method covering all edge cases. Updated package.json to enable Jest experimental ES modules support with NODE_OPTIONS='--experimental-vm-modules' flag

### Process Lessons

- **Agent Coordination**: Clear documentation boundaries prevent scope creep and conflicts
- **Sprint Planning**: 8-sprint structure provides manageable development phases
- **Quality Gates**: Comprehensive testing and security scanning ensure production readiness
- **Documentation Maintenance**: Living documentation that evolves with code changes

**Next Steps**: Begin Sprint 1 implementation with foundation setup and basic PWA structure.
