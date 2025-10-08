# Infinite Pokédex — Technology Stack Doc

This document defines the complete technology stack for Infinite Pokédex, including frontend, backend, AI models, data storage, and development tools. All technologies are chosen for mobile-first performance and offline-first PWA capabilities.

## Frontend Technologies

| Technology               | Purpose                                        | Documentation                                                                              | Installation & Usage                       |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| **HTML5**                | Core markup, semantic structure                | [MDN HTML5](https://developer.mozilla.org/en-US/docs/Web/HTML)                             | Native browser API                         |
| **CSS3**                 | Styling, animations, responsive design         | [MDN CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)                                | Native browser API                         |
| **JavaScript ES2020+**   | Core application logic, component architecture | [MDN JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)                  | Native browser API                         |
| **Web App Manifest**     | PWA installation, metadata                     | [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)              | JSON file in root                          |
| **Service Worker**       | Offline caching, background sync               | [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) | `sw.js` file                               |
| **IndexedDB**            | Client-side data persistence                   | [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)            | Native browser API                         |
| **WebLLM**               | On-device LLM for lore generation              | [WebLLM GitHub](https://github.com/mlc-ai/web-llm)                                         | `npm install @mlc-ai/web-llm`              |
| **Web Stable Diffusion** | On-device image generation                     | [WebSD GitHub](https://github.com/mlc-ai/web-stable-diffusion)                             | `npm install @mlc-ai/web-stable-diffusion` |
| **dSpy**                 | Prompt engineering framework                   | [dSpy GitHub](https://github.com/stanfordnlp/dspy)                                         | `pip install dspy-ai` (server-side)        |

**Frontend Assumptions**: Modern mobile browsers (Chrome Android, Safari iOS) with Service Worker and IndexedDB support.  
**Known Issues**: WebLLM/WebSD require significant device resources; we implement fallbacks for low-end devices.

## Backend Technologies

| Technology         | Purpose                           | Documentation                                          | Installation & Usage    |
| ------------------ | --------------------------------- | ------------------------------------------------------ | ----------------------- |
| **Node.js v18+**   | Server runtime, crawler engine    | [Node.js Docs](https://nodejs.org/docs/)               | `nvm install 18`        |
| **Express.js**     | Web server framework (optional)   | [Express Docs](https://expressjs.com/)                 | `npm install express`   |
| **Cheerio**        | HTML parsing and manipulation     | [Cheerio GitHub](https://github.com/cheeriojs/cheerio) | `npm install cheerio`   |
| **Puppeteer**      | Web scraping and rendering        | [Puppeteer Docs](https://pptr.dev/)                    | `npm install puppeteer` |
| **OpenRouter API** | LLM API for tidbit synthesis      | [OpenRouter Docs](https://openrouter.ai/docs)          | API key in environment  |
| **Axios**          | HTTP client for API requests      | [Axios Docs](https://axios-http.com/)                  | `npm install axios`     |
| **Sharp**          | Image processing and optimization | [Sharp Docs](https://sharp.pixelplumbing.com/)         | `npm install sharp`     |

**Backend Assumptions**: Node.js v18+ with npm package manager.  
**Known Issues**: Puppeteer requires Chrome/Chromium; we provide Docker container for consistent environment.

## AI & Machine Learning

| Technology                 | Purpose                      | Documentation                                                         | Installation & Usage  |
| -------------------------- | ---------------------------- | --------------------------------------------------------------------- | --------------------- |
| **Qwen3 (smallest model)** | On-device lore generation    | [WebLLM Models](https://github.com/mlc-ai/web-llm#supported-models)   | Via WebLLM model list |
| **Stable Diffusion**       | Image-to-image generation    | [WebSD Models](https://github.com/mlc-ai/web-stable-diffusion#models) | Via WebSD             |
| **OpenRouter LLM**         | Server-side tidbit synthesis | [OpenRouter Models](https://openrouter.ai/models)                     | API integration       |
| **dSpy Framework**         | Prompt optimization          | [dSpy Docs](https://dspy-docs.vercel.app/)                            | `pip install dspy-ai` |

**AI Assumptions**: WebLLM provides Qwen3-small model; WebSD supports image-to-image mode.  
**Known Issues**: Model loading can be slow on first run; we implement progressive loading and caching.

## Data Storage & Caching

| Technology               | Purpose                      | Documentation                                                                   | Installation & Usage |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------- | -------------------- |
| **IndexedDB**            | Client-side data persistence | [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | Native browser API   |
| **Cache API**            | Service Worker caching       | [MDN Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)         | Native browser API   |
| **CDN (Static Hosting)** | Dataset distribution         | Provider-specific                                                               | Upload via CI/CD     |
| **Local Disk Cache**     | Server-side HTML caching     | Node.js filesystem                                                              | `fs` module          |

**Storage Assumptions**: IndexedDB available with sufficient quota; CDN supports versioned assets.  
**Known Issues**: Safari has different IndexedDB quota limits; we implement adaptive cache policies.

## Development Tools

| Technology     | Purpose                   | Documentation                                      | Installation & Usage              |
| -------------- | ------------------------- | -------------------------------------------------- | --------------------------------- |
| **npm**        | Package management        | [npm Docs](https://docs.npmjs.com/)                | Comes with Node.js                |
| **Vite**       | Build tool and dev server | [Vite Docs](https://vitejs.dev/)                   | `npm install -D vite`             |
| **TypeScript** | Type safety (optional)    | [TypeScript Docs](https://www.typescriptlang.org/) | `npm install -D typescript`       |
| **ESLint**     | Code linting              | [ESLint Docs](https://eslint.org/)                 | `npm install -D eslint`           |
| **Prettier**   | Code formatting           | [Prettier Docs](https://prettier.io/)              | `npm install -D prettier`         |
| **Jest**       | Unit testing              | [Jest Docs](https://jestjs.io/)                    | `npm install -D jest`             |
| **Playwright** | E2E testing               | [Playwright Docs](https://playwright.dev/)         | `npm install -D @playwright/test` |

**Dev Tools Assumptions**: Node.js v18+ with npm; modern development environment.  
**Known Issues**: Playwright requires browser binaries; we provide setup scripts.

## Build & Deployment

| Technology              | Purpose          | Documentation                                          | Installation & Usage                |
| ----------------------- | ---------------- | ------------------------------------------------------ | ----------------------------------- |
| **Docker**              | Containerization | [Docker Docs](https://docs.docker.com/)                | `docker build -t pokedex-crawler .` |
| **GitHub Actions**      | CI/CD pipeline   | [GitHub Actions Docs](https://docs.github.com/actions) | `.github/workflows/`                |
| **Vercel/Netlify**      | Static hosting   | [Vercel Docs](https://vercel.com/docs)                 | Connect repository                  |
| **AWS S3 + CloudFront** | CDN for dataset  | [AWS S3 Docs](https://docs.aws.amazon.com/s3/)         | AWS CLI setup                       |

**Deployment Assumptions**: Git repository with CI/CD access; CDN credentials configured.  
**Known Issues**: Docker builds require sufficient memory for Puppeteer; we optimize container size.

## External APIs & Services

| Service           | Purpose              | Documentation                                                       | Usage                     |
| ----------------- | -------------------- | ------------------------------------------------------------------- | ------------------------- |
| **Bulbapedia**    | Pokémon data source  | [Bulbapedia](https://bulbapedia.bulbagarden.net/)                   | Web scraping (respectful) |
| **Serebii**       | Pokémon data source  | [Serebii](https://www.serebii.net/)                                 | Web scraping (respectful) |
| **OpenRouter**    | LLM API service      | [OpenRouter](https://openrouter.ai/)                                | API key required          |
| **WebLLM Models** | On-device LLM models | [WebLLM Models](https://github.com/mlc-ai/web-llm#supported-models) | Client-side loading       |

**API Assumptions**: External sites allow respectful scraping; rate limits respected.  
**Known Issues**: External sites may change structure; we implement robust parsers with fallbacks.

## Package.json Dependencies

```json
{
  "dependencies": {
    "@mlc-ai/web-llm": "^0.2.0",
    "@mlc-ai/web-stable-diffusion": "^0.1.0",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "puppeteer": "^21.0.0",
    "sharp": "^0.32.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

## Environment Variables

```bash
# Server-side
OPENROUTER_API_KEY=your_api_key_here
CDN_BUCKET_URL=https://your-cdn.com/pokedex
CRAWL_RATE_LIMIT=1000  # requests per minute

# Client-side (optional)
WEBLLM_MODEL_SIZE=small  # small, medium, large
WEBSD_QUALITY=medium     # low, medium, high
```

## Browser Support Matrix

| Feature         | Chrome Android | Safari iOS | Safari macOS | Notes                          |
| --------------- | -------------- | ---------- | ------------ | ------------------------------ |
| Service Workers | ✅             | ✅         | ✅           | Required for PWA               |
| IndexedDB       | ✅             | ✅         | ✅           | Required for offline           |
| WebLLM          | ✅             | ✅         | ✅           | May be slower on older devices |
| WebSD           | ✅             | ✅         | ✅           | Resource intensive             |
| CSS Animations  | ✅             | ✅         | ✅           | Hardware accelerated           |

**Support Assumptions**: Modern mobile browsers with ES2020+ support.  
**Known Issues**: Older iOS versions may have Service Worker limitations; we provide graceful fallbacks.

## Performance Considerations

- **Bundle Size**: Keep under 2MB total for fast mobile loading
- **Model Loading**: Progressive loading with fallbacks for low-end devices
- **Caching**: Aggressive caching with version management
- **Animations**: 60fps CSS animations with hardware acceleration
- **Memory**: Monitor WebLLM/WebSD memory usage; implement cleanup

## Security & Compliance

- **CORS**: Proper CORS headers for CDN assets
- **CSP**: Content Security Policy for XSS protection
- **Rate Limiting**: Respectful crawling with exponential backoff
- **Attribution**: Proper licensing and attribution for scraped content
- **Privacy**: No user data collection; all generation on-device
