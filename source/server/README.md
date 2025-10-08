# Infinite Pokédex Server

Node.js crawler and data processing pipeline for the Infinite Pokédex Progressive Web App.

## Overview

The server component handles:
- Respectful web crawling of Bulbapedia and Serebii
- HTML parsing and data normalization
- LLM-powered tidbit synthesis via OpenRouter
- Dataset building and CDN publishing

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and CDN settings
   ```

3. **Test the server:**
   ```bash
   node test-server.js
   ```

4. **Run the crawler:**
   ```bash
   node index.js --species 1,2,3 --dry-run
   ```

## Configuration

### Environment Variables

- `OPENROUTER_API_KEY` - Required for LLM tidbit synthesis
- `CDN_BUCKET_URL` - Required for dataset publishing
- `CRAWL_RATE_LIMIT` - Rate limit in requests per minute (default: 1000)
- `LOG_LEVEL` - Logging level (ERROR, WARN, INFO, DEBUG)

### CDN Providers

The server supports multiple CDN providers:

- **AWS S3 + CloudFront** (default)
- **Cloudflare R2**
- **Vercel Blob**

Configure the appropriate environment variables for your chosen provider.

## Usage

### Command Line Interface

```bash
# Crawl specific species
node index.js --species 1,2,3

# Skip cache and re-crawl everything
node index.js --species 1,2,3 --skip-cache

# Dry run without publishing to CDN
node index.js --species 1,2,3 --dry-run

# Show help
node index.js --help
```

### Programmatic Usage

```javascript
import { InfinitePokedexServer } from './index.js';

const server = new InfinitePokedexServer();
await server.initialize();

const result = await server.runPipeline({
  species: [1, 2, 3],
  dryRun: true
});
```

## Architecture

### Components

- **Crawlers** - Respectful web scraping with rate limiting
- **Processors** - HTML parsing and data normalization
- **Synthesizers** - LLM-powered tidbit generation
- **Builders** - Dataset assembly and versioning
- **Publishers** - CDN deployment with atomic updates

### Data Flow

1. **Crawl** - Fetch data from Bulbapedia/Serebii
2. **Parse** - Extract structured data from HTML
3. **Normalize** - Merge and validate data from multiple sources
4. **Synthesize** - Generate tidbits using LLM
5. **Build** - Assemble canonical dataset
6. **Publish** - Deploy to CDN with versioning

## Rate Limiting

The server implements respectful crawling with:
- Robots.txt compliance checking
- Rate limiting per domain
- Exponential backoff on errors
- Circuit breaker patterns
- Local caching to minimize requests

## Error Handling

- Graceful degradation on individual species failures
- Comprehensive logging with structured output
- Health checks and monitoring
- Rollback support for failed deployments

## Development

### Testing

```bash
# Run component tests
node test-server.js

# Run full test suite
npm test
```

### Logging

The server uses structured logging with configurable levels:

```javascript
import { logger } from './utils/logger.js';

logger.info('Processing species', { speciesId: 1 });
logger.error('Crawl failed', { error: error.message });
```

## License

MIT License - see LICENSE file for details.