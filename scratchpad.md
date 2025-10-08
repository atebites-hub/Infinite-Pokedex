# Infinite Pokédex — Project Scratchpad

This file serves as the central hub for current task planning, progress tracking, and agent communication. It focuses on active work and next steps. For historical information, see [Project History](./docs/project-history.md).

## Project Overview

**Infinite Pokédex** is a Progressive Web App that generates immersive, ever-changing lore for each Pokémon using on-device AI. Inspired by @starstatik's TikTok "iceberg" lore videos, the app combines:
- Server-side web crawling (Bulbapedia/Serebii/Smogon) for canonical data
- Client-side AI generation (WebLLM for lore, WebSD for artwork)
- Gen 9 Pokédex (Rotom Phone) aesthetic
- Offline-first PWA architecture

## Current Status

**Project Phase**: Phase 2 - AI Integration  
**Current Sprint**: Sprint 4 (WebLLM Integration)  
**Overall Progress**: 37.5% (3 of 8 sprints complete)  
**Last Updated**: Sprint 3 completed, ready for Sprint 4

### Completed Sprints ✅

- **Sprint 1**: Foundation & Setup (Frontend, Server, DevOps)
- **Sprint 2**: Server Infrastructure Enhancement
- **Sprint 3**: Client Data Sync & Offline Support

### Current Sprint: Sprint 4 - WebLLM Integration

**Goal**: Implement on-device lore generation using WebLLM (mlc-ai/Qwen3-0.6B-q4f16_0-MLC)

**Status**: Ready to begin

**Key Tasks**:
1. [ ] Set up WebLLM and load mlc-ai/Qwen3-0.6B-q4f16_0-MLC model
2. [ ] Create Web Worker for model execution
3. [ ] Implement prompt engineering with dSpy
4. [ ] Generate 5-panel "iceberg" lore format
5. [ ] Add memory management and fallbacks
6. [ ] Create lore generation UI
7. [ ] Write comprehensive tests
8. [ ] Update documentation

**Success Criteria**:
- Model loads and runs on-device
- Generates coherent 5-panel lore
- Memory usage stays within limits
- Works offline after initial load
- 80%+ test coverage

## Next Steps (Immediate)

- Lock in Sprint 4 implementation specs using the confirmed model (WebLLM `mlc-ai/Qwen3-0.6B-q4f16_0-MLC`) and lore caching rules.
- Document loading-state UX (progress wheel/bar) for lore + artwork generation before storyboarding the UI.
- Update client sync plan to auto-regenerate lore immediately after tidbit sync (triggered on app load) and reflect boot-only crawler cadence in documentation.

## Background and Motivation

Sprint 4 is where the Infinite Pokédex finally delivers the “ever-changing lore” promise from `docs/agents/Project Requirements Doc.md`. The user has emphasized that server-generated tidbits are the single source of truth while the client-generated lore must persist indefinitely in IndexedDB. The backend may only generate new tidbits when the crawler uncovers previously unseen or materially changed pages, guarding against redundant OpenRouter usage. This planning pass documents that contract end-to-end so later implementation stays aligned without reinterpretation.

## Key Challenges and Analysis

- **Meaningful crawl diffs**: HTML noise (ads, layout tweaks) can falsely trigger re-generation. Plan: canonicalize pages (strip boilerplate, normalize whitespace) before hashing; compare both raw and cleaned hashes to balance sensitivity. Counterpoint: over-normalization could miss subtle content edits—mitigate by logging diff samples for manual review during early runs.
- **Tidbit relevance filtering**: Some pages have zero Pokémon content. We must flag and skip them before OpenRouter calls by checking entity extraction, keyword thresholds, and section metadata. Alternative: rely on embeddings to detect latent references; trade-off is compute cost—worth piloting on high-noise domains.
- **Lore cache growth vs. storage limits**: User requires lore to persist indefinitely in IndexedDB; we can only prune if quota pressure forces it. Need heuristics to detect quota warnings early and offer manual cleanup without auto-deleting lore.
- **Client/server cadence**: Crawling occurs on server boot only; each page is processed once for tidbits and never revisited unless newly discovered. We must ensure manifests still surface new species discovered during the initial crawl and rely on best-judgment prioritization while the single pass runs.
- **Model resource constraints**: Target model is WebLLM `mlc-ai/Qwen3-0.6B-q4f16_0-MLC`. Ensure capability checks and post-generation teardown so WebSD can load afterward. No fallback content; rely on console logging for debugging, so we must instrument logs clearly.

## High-Level Task Breakdown

### Sprint 4 — WebLLM Integration & Lore Pipeline (Planning)

1. **T**: Architect server tidbit indexing and incremental crawl workflow.  
   **C**: `docs/agents/Backend Structure Doc.md` + new user requirements demand per-page slugging, content hashing, and Pokémon relevance filtering before OpenRouter.  
   **R**: Maintain `source_page_id`, raw + normalized hashes, entity detection, skip low-value pages, queue high-priority domains first.  
   **E**: Flowchart covering crawl → parse → filter → OpenRouter → manifest diff.  
   **I**: Validate heuristics against noisy forums; iterate threshold logic before coding.

2. **T**: Define client tidbit manifest sync and lore cache retention policy.  
   **C**: `docs/agents/App Flow Doc.md` mandates offline-first behavior with lore persistence.  
   **R**: Specify manifest schema (`tidbit_revision` per species), incremental downloads, offline bypass, regeneration triggers, permanent lore caching (prune only under quota pressure). Auto-regenerate lore immediately after manifest sync during app load.  
   **E**: Sequence diagram for app load (online/offline), highlighting IndexedDB updates, regeneration queue kickoff, and progress indicator states.  
   **I**: Stress-test plan against quota constraints; adjust manual cleanup UX accordingly.

3. **T**: Formalize WebLLM worker interface and dSpy-style prompt templates.  
   **C**: `docs/agents/Tech Stack Doc.md` enforces worker usage; user provided exemplar Blastoise panels.  
   **R**: Worker loads WebLLM `mlc-ai/Qwen3-0.6B-q4f16_0-MLC`, streams status updates (progress wheel), applies dSpy prompt optimization, and tears down weights after lore is generated so WebSD can load.  
   **E**: Prompt schema + sample response for Blastoise shaped like “Living Tank → Silent Guardian,” including dSpy module wiring.  
   **I**: Run mock prompts with sample tidbits to tune context packing before implementation.

4. **T**: Plan lore UI/UX with WebSD artwork integration and history browsing.  
   **C**: `docs/agents/Frontend Guidelines.md` requires Gen 9 styling and panel artwork backgrounds.  
   **R**: Panel component overlays text on WebSD art, ensures readability, exposes regenerate + history controls, surfaces visual progress indicators for lore/image stages, and handles lite mode by instructing users to check console when failures occur.  
   **E**: State machine (`idle → generating → cached → history`) and wireframe sketches.  
   **I**: Evaluate accessibility (contrast, screen readers) and adjust plan iteratively.

5. **T**: Outline testing, telemetry, and documentation updates.  
   **C**: `docs/agents/Testing Guidelines.md` + documentation rules require coverage and doc parity.  
   **R**: Draft test matrix (server filters, manifest diffing, worker prompts, cache ops), logging guidelines (ensure console logs expose failures since there is no user-facing fallback), doc updates for `/docs/code/*` and `/docs/tests/*`.  
   **E**: Table enumerating unit/integration scenarios and expected commands.  
   **I**: Refine matrix post-implementation to ensure ≥80% coverage and recorded lessons.

## Current Status / Progress Tracking

- Sprint 4 planning underway — tidbit/lore pipeline requirements captured; awaiting implementation kickoff after documentation updates.

## Project Status Board

- [ ] Sprint 4 — Server tidbit indexing & manifest design (planning)
- [ ] Sprint 4 — Client sync & lore cache policy (planning)
- [ ] Sprint 4 — WebLLM worker prompt spec (planning)
- [ ] Sprint 4 — Lore UI/UX + regeneration planning (planning)
- [ ] Sprint 4 — Test & documentation strategy (planning)

## Agent Feedback & Assistance Requests

### Current Blockers
- None; ready to proceed once outstanding clarifications resolved.

### Questions for User
### Questions for User
- None pending.

### Technical Decisions Needed
1. Telemetry scope: allow local anonymized timing logs for debugging, or restrict to dev builds?

## Pending Sprints

- **Sprint 5**: WebSD Integration (image-to-image generation)
- **Sprint 6**: UI Polish & Animations (Gen 9 Pokédex feel)
- **Sprint 7**: Testing & QA (comprehensive testing, security)
- **Sprint 8**: Deployment & Launch (production deployment, monitoring)

## Key Decisions & Assumptions

### Technical Decisions
- **Vanilla HTML/CSS/JS**: For performance and bundle size
- **On-device AI**: WebLLM/WebSD for privacy and offline capability
- **CDN Distribution**: For fast global access to dataset
- **Offline-First**: Service Worker + IndexedDB architecture

### Current Assumptions
- Modern browsers support Web Workers and WebAssembly
- WebLLM Qwen3-small model is suitable for mobile devices
- Users have sufficient device resources (2GB+ RAM)
- Model download size is acceptable (~500MB-1GB)

### Known Risks
- **Performance**: AI models may be heavy for low-end devices
- **Memory**: Model execution may exceed browser limits
- **Download**: Large model size may deter users
- **Compatibility**: Safari limitations with WebAssembly

## Agent Feedback & Assistance Requests

### Current Blockers
None - Ready to begin Sprint 4

### Questions for User
1. Should we implement a "lite" mode for low-end devices?
2. What's the acceptable model download size?
3. Should we cache generated lore or regenerate each time?
4. Priority: Quality vs. Speed for lore generation?

### Technical Decisions Needed
1. Model selection: Smallest Qwen3 vs. performance trade-off
2. Prompt strategy: Single prompt vs. multi-step generation
3. Caching strategy: Cache lore or always regenerate
4. Fallback strategy: What to show if model fails to load

## Resources & References

### Core Documentation
- [Project Requirements](./docs/agents/Project Requirements Doc.md)
- [Implementation Plan](./docs/agents/Implementation Plan.md)
- [Tech Stack](./docs/agents/Tech Stack Doc.md)
- [Frontend Guidelines](./docs/agents/Frontend Guidelines.md)

### Technical Documentation
- [CDN Sync System](./docs/code/sync.md)
- [Version Management](./docs/code/version.md)
- [Offline Support](./docs/code/offline.md)
- [Service Worker](./docs/code/devops.md)

### External Resources
- [WebLLM Documentation](https://github.com/mlc-ai/web-llm)
- [dSpy Framework](https://github.com/stanfordnlp/dspy)
- [WebSD Documentation](https://github.com/mlc-ai/web-stable-diffusion)

## Recent Lessons

### Sprint 3 Learnings
- **Chunked Downloads**: 100 items per chunk works well for memory
- **Resume Capability**: Checkpoint system essential for large downloads
- **Cache Strategies**: Separate caches by content type improves performance
- **Integrity Checks**: SHA-256 verification catches corrupted downloads
- **Offline UX**: Clear messaging and auto-retry improves user experience

### Bug Fixes
- **Inconsistent Block Scoping in Switch Statement**: Fixed inconsistent block scoping in models.js validateResponse() switch statement (lines 236-252). The `validation` case had explicit block scope with curly braces, but `tidbitSynthesis` and `safetyFilter` cases didn't. This inconsistency could lead to unexpected variable declaration conflicts in cases lacking their own block scope. Added explicit block scoping (`{ ... }`) to all three cases for consistency and safety. All validation tests pass after the fix. (Fixed: October 8, 2025)
- **IndexedDB Transaction Completion Bug**: Fixed IndexedDB operations not waiting for transaction completion in version.js, sync.js, and offline.js. While operations were properly wrapped in Promises with `onsuccess`/`onerror` callbacks, they weren't waiting for the transaction's `oncomplete` event. This meant that write operations (`readwrite` transactions) could resolve before data was actually committed to the database. Added `tx.oncomplete` and `tx.onerror` event handlers to all IndexedDB operations to ensure transactions fully complete before the Promise resolves. This affected 5 methods in version.js (initialize, updateVersion, reset, getVersionHistory, addToHistory), 6 methods in sync.js (getCurrentVersion, storeSpecies, saveCheckpoint, getCheckpoint, clearCheckpoint, saveVersion), and 3 methods in offline.js (storeError, getStoredErrors, clearStoredErrors). All 69 unit tests pass after the fix. (Fixed: October 8, 2025)
- **Logger Import Issue**: Fixed logger.js to export a logger object instead of individual functions. Modules were importing `{ logger }` expecting an object with methods like `logger.info()`, but the module was exporting individual functions. Changed to export a single logger object with debug/info/warn/error methods. This affected version.js, sync-ui.js, offline.js, and sync.js. (Fixed: October 2025)
- **Offline Manager Fetch Event**: Removed ineffective `fetch` event listener from OfflineManager.setupEventListeners(). The code was trying to intercept fetch requests on the `window` object (lines 33-39), but `fetch` events are only dispatched in Service Worker contexts, not in the main thread. This listener would never fire, making it dead code. The OfflineManager already properly detects connectivity through `online` and `offline` events, which are the correct approach for the main thread. (Fixed: October 2025)

### Best Practices
- **Documentation First**: Write docs before/during implementation
- **Test Coverage**: 80%+ coverage catches most issues
- **Error Handling**: Comprehensive error handling prevents silent failures
- **User Feedback**: Progress indicators essential for long operations
- **Graceful Degradation**: Always provide fallbacks
- **Export Consistency**: When exporting utilities, prefer object exports over individual functions for better namespace management
- **IndexedDB Promises**: Always wrap IndexedDB operations in proper Promises and wait for transaction completion. Native IndexedDB uses callbacks (`onsuccess`/`onerror`), not awaitable properties. Don't use `await tx.complete` or `await store.get()` - wrap them in `new Promise((resolve, reject) => { ... })`. For write operations (`readwrite` transactions), always wait for `tx.oncomplete` to ensure data is committed before resolving the Promise. For read operations, set `tx.oncomplete = () => {}` and `tx.onerror` handlers to ensure proper transaction handling.
- **Switch Statement Block Scoping**: Always use explicit block scope (`{ ... }`) for all cases in switch statements to prevent variable declaration conflicts and maintain consistency across cases

## Development Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production

# Testing
npm test                   # Run all tests
npm run test:unit          # Run unit tests
npm run test:integration   # Run E2E tests
npm run test:security      # Run security scans
npm run test:coverage      # Generate coverage report

# Linting
npm run lint               # Run ESLint
npm run lint:fix           # Fix linting issues
npm run lint:security      # Run security linting
npm run format             # Format with Prettier

# Docker
npm run docker:build       # Build Docker images
npm run docker:up          # Start containers
npm run docker:down        # Stop containers
```

## Notes

- **Branch**: Create `feature/webllm-integration` for Sprint 4
- **Testing**: Focus on memory usage and model performance
- **Documentation**: Update as implementation progresses
- **Code Review**: Request review before merging to main

---

**Last Updated**: Sprint 3 completion  
**Next Review**: After Sprint 4 Task 1 completion
