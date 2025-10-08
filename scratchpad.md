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

**Project Status**: Multi-agent Sprint 1 development in progress  
**Current Sprint**: Sprint 1 (Foundation & Setup) - 2 agents completed, 1 pending  
**Progress**: 67% (2/3 agents completed)  
**Last Updated**: Agent 2 (Server Infrastructure) completed

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

### Active Agents (Sprint 1)

- **Agent 1 (Frontend)**: `feature/frontend-foundation` - ✅ COMPLETED - PWA structure, UI, IndexedDB
- **Agent 2 (Server)**: `feature/server-infrastructure` - Pending - Crawler, parser, LLM integration
- **Agent 3 (DevOps)**: `feature/dev-environment` - Pending - Testing, CI/CD, automation

### Pending (Future Sprints)

- [ ] Sprint 2: Server Infrastructure (crawler, parser, LLM integration)
- [ ] Sprint 3: Client Data Sync (offline support, background sync)
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

**Agent 3 (Development Environment)**: `feature/dev-environment`

- [ ] Create development scripts and automation
- [ ] Set up Jest testing framework with 80%+ coverage
- [ ] Implement Playwright for E2E testing
- [ ] Configure ESLint, Prettier, and security scanning
- [ ] Set up GitHub Actions CI/CD pipeline

### Future Sprints (Pending)

- [ ] Sprint 2: Server Infrastructure completion
- [ ] Sprint 3: Client Data Sync (offline support, background sync)
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
**Agent 3 (DevOps)**: Pending - Testing, CI/CD, automation, quality gates

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
- **CLI Detection Bug Fix**: Fixed CLI detection logic in index.js to properly compare file paths using fileURLToPath() and resolve() for reliable path comparison, with safety check for undefined process.argv[1] when imported as module
- **Robots.txt Parser Bug Fix**: Fixed RobotsParser.parseRobotsTxt() method to skip lines without colons, preventing undefined value variables that could cause unexpected behavior when processing robots.txt rules
- **Cache Key Bug Fix**: Fixed TidbitSynthesizer.getCacheKey() method to use stable data fields only (excluding tidbits array) and SHA-256 hashing instead of truncated base64, preventing cache invalidation and hash collisions

### Process Lessons

- **Agent Coordination**: Clear documentation boundaries prevent scope creep and conflicts
- **Sprint Planning**: 8-sprint structure provides manageable development phases
- **Quality Gates**: Comprehensive testing and security scanning ensure production readiness
- **Documentation Maintenance**: Living documentation that evolves with code changes

**Next Steps**: Begin Sprint 1 implementation with foundation setup and basic PWA structure.
