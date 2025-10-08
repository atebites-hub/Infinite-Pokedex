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

**Goal**: Implement on-device lore generation using WebLLM (Qwen3-small)

**Status**: Ready to begin

**Key Tasks**:
1. [ ] Set up WebLLM and load Qwen3-small model
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

### Sprint 4 Planning

**T**: Set up WebLLM and load Qwen3-small model  
**C**: From Tech Stack Doc, integrate WebLLM library and select smallest Qwen3 model  
**R**: Use Web Worker for execution; implement progressive loading; handle model download  
**E**: `webllm-worker.js`, model initialization, memory monitoring  
**I**: Test model loading on various devices; verify memory usage

**T**: Implement prompt engineering with dSpy  
**C**: From Project Requirements, create prompts that generate 5-panel iceberg lore  
**R**: Use dSpy for prompt optimization; include metadata and tidbits in context  
**E**: Prompt templates, context formatting, output parsing  
**I**: Test prompt quality; iterate based on output coherence

**T**: Create lore generation UI  
**C**: From Frontend Guidelines, build interface for viewing generated lore  
**R**: Gen 9 aesthetic; show loading states; handle regeneration  
**E**: Lore viewer component, loading animations, regenerate button  
**I**: Test UI responsiveness; verify animations work smoothly

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
- **IndexedDB Transaction Await Bug**: Fixed incorrect usage of `await tx.complete` and `await tx.done` in version.js, sync.js, and offline.js. Standard IndexedDB transactions don't have awaitable `complete` or `done` properties - they use `oncomplete`/`onerror` events. The code was attempting to await non-promise values, which would cause runtime errors. Wrapped all IndexedDB operations (`store.get()`, `store.put()`, `store.delete()`) in proper Promises using `onsuccess` and `onerror` callbacks. This affected 5 methods in version.js, 6 methods in sync.js, and 3 methods in offline.js. All tests pass after the fix. (Fixed: October 8, 2025)
- **Logger Import Issue**: Fixed logger.js to export a logger object instead of individual functions. Modules were importing `{ logger }` expecting an object with methods like `logger.info()`, but the module was exporting individual functions. Changed to export a single logger object with debug/info/warn/error methods. This affected version.js, sync-ui.js, offline.js, and sync.js. (Fixed: October 2025)
- **Offline Manager Fetch Event**: Removed ineffective `fetch` event listener from OfflineManager.setupEventListeners(). The code was trying to intercept fetch requests on the `window` object (lines 33-39), but `fetch` events are only dispatched in Service Worker contexts, not in the main thread. This listener would never fire, making it dead code. The OfflineManager already properly detects connectivity through `online` and `offline` events, which are the correct approach for the main thread. (Fixed: October 2025)

### Best Practices
- **Documentation First**: Write docs before/during implementation
- **Test Coverage**: 80%+ coverage catches most issues
- **Error Handling**: Comprehensive error handling prevents silent failures
- **User Feedback**: Progress indicators essential for long operations
- **Graceful Degradation**: Always provide fallbacks
- **Export Consistency**: When exporting utilities, prefer object exports over individual functions for better namespace management
- **IndexedDB Promises**: Always wrap IndexedDB operations in proper Promises. Native IndexedDB uses callbacks (`onsuccess`/`onerror`), not awaitable properties. Don't use `await tx.complete` or `await store.get()` - wrap them in `new Promise((resolve, reject) => { ... })`

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