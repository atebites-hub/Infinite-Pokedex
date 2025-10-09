/**
 * Tidbit Synthesizer
 *
 * Integrates with OpenRouter LLM to generate "iceberg" tidbits from
 * crawled Pokémon data and forum discussions.
 *
 * @fileoverview LLM integration for tidbit synthesis
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import axios from 'axios';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import {
  getModelConfig,
  getPrompt,
  validateResponse,
} from '../config/models.js';

/**
 * Tidbit synthesizer using OpenRouter LLM
 */
export class TidbitSynthesizer {
  constructor(config) {
    this.config = config;
    this.apiKey = config.openRouterApiKey;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.cache = new Map();

    // Allow mock mode without API key for testing
    if (!this.apiKey && !config.mockMode) {
      throw new Error(
        'OpenRouter API key is required (or set mockMode: true for testing)'
      );
    }

    // Initialize HTTP client only if not in mock mode
    if (!config.mockMode) {
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'InfinitePokedexBot/1.0',
        },
        timeout: 30000,
      });
    }
  }

  /**
   * Safely extract content from OpenRouter API response
   *
   * Pre: response object from axios HTTP call
   * Post: returns content string or throws descriptive error
   *
   * @param {Object} response - Axios response object
   * @param {string} context - Context string for error messages (e.g., 'tidbit generation')
   * @returns {string} Extracted message content
   * @throws {Error} If response structure is invalid
   */
  extractResponseContent(response, context = 'API call') {
    if (!response || !response.data) {
      throw new Error(
        `Invalid response structure in ${context}: missing response.data`
      );
    }

    if (!response.data.choices || !Array.isArray(response.data.choices)) {
      throw new Error(
        `Invalid response structure in ${context}: missing or invalid choices array`
      );
    }

    if (response.data.choices.length === 0) {
      throw new Error(
        `Invalid response structure in ${context}: choices array is empty`
      );
    }

    if (!response.data.choices[0].message) {
      throw new Error(
        `Invalid response structure in ${context}: missing message in first choice`
      );
    }

    if (typeof response.data.choices[0].message.content !== 'string') {
      throw new Error(
        `Invalid response structure in ${context}: missing or invalid content in message`
      );
    }

    return response.data.choices[0].message.content;
  }

  /**
   * Enrich species data with generated tidbits
   * @param {Object} processedData - Processed species data
   * @returns {Promise<Object>} Enriched data with tidbits
   */
  async enrich(processedData) {
    try {
      logger.info('Generating tidbits for species data...');

      const enrichedData = {};

      for (const [speciesId, speciesData] of Object.entries(processedData)) {
        try {
          const enrichedSpecies = await this.enrichSpecies(
            speciesId,
            speciesData
          );
          enrichedData[speciesId] = enrichedSpecies;

          // Rate limiting between requests
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error(`Failed to enrich species ${speciesId}:`, error.message);
          // Continue with other species
          enrichedData[speciesId] = speciesData;
        }
      }

      logger.info(
        `Tidbit synthesis complete: ${Object.keys(enrichedData).length} species processed`
      );
      return enrichedData;
    } catch (error) {
      logger.error('Tidbit synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Enrich a single species with tidbits
   * @param {string} speciesId - Species ID
   * @param {Object} speciesData - Species data
   * @returns {Promise<Object>} Enriched species data
   */
  async enrichSpecies(speciesId, speciesData) {
    try {
      // Prepare data for LLM first
      const speciesDataText = this.formatSpeciesData(speciesData);

      // Try to get forum data, but don't fail if it's unavailable
      let forumDataText = '';
      try {
        forumDataText = await this.getForumData(speciesId);
      } catch (error) {
        logger.warn(
          `Failed to get forum data for species ${speciesId}:`,
          error.message
        );
        // Continue without forum data
      }

      // Generate cache key - stable even if forum data fails
      const cacheKey = this.getCacheKey(speciesId, speciesData, forumDataText);
      if (this.cache.has(cacheKey)) {
        logger.debug(`Cache hit for species ${speciesId}`);
        const cached = this.cache.get(cacheKey);
        return { ...speciesData, tidbits: cached };
      }

      // Extract pokemon name for RAG context
      const pokemonName = speciesData.name || `pokemon-${speciesId}`;

      // Generate tidbits with RAG context
      const tidbits = await this.generateTidbits(
        speciesDataText,
        forumDataText,
        pokemonName
      );

      // Validate and filter tidbits
      const validatedTidbits = await this.validateTidbits(tidbits);

      // Cache the result
      this.cache.set(cacheKey, validatedTidbits);

      return {
        ...speciesData,
        tidbits: validatedTidbits,
      };
    } catch (error) {
      logger.error(`Failed to enrich species ${speciesId}:`, error.message);
      return speciesData; // Return original data on error
    }
  }

  /**
   * Load RAG context from comprehensive crawl data
   * @param {string} pokemonName - Name of the Pokémon
   * @returns {Promise<Object>} RAG context with relevant content
   */
  async loadRagContext(pokemonName) {
    try {
      const crawlResultsPath = join(
        process.cwd(),
        'comprehensive-crawl-results.csv'
      );
      const crawlSummaryPath = join(
        process.cwd(),
        'comprehensive-crawl-summary.json'
      );

      // Try to load summary first for metadata
      let summary = { totalContentLength: 0, relevantPages: 0 };

      try {
        const summaryData = await fs.readFile(crawlSummaryPath, 'utf8');
        summary = JSON.parse(summaryData);
      } catch (error) {
        logger.warn('Could not load crawl summary, using defaults');
      }

      // Load and filter crawl results for this Pokémon
      let relevantContent = [];

      try {
        const csvData = await fs.readFile(crawlResultsPath, 'utf8');
        const lines = csvData.split('\n').slice(1); // Skip header

        for (const line of lines) {
          if (!line.trim()) continue;

          const columns = line
            .split(',')
            .map((col) => col.replace(/^"|"$/g, ''));
          if (columns.length >= 7) {
            const [
              url,
              title,
              contentLength,
              depth,
              crawledAt,
              isRelevant,
              contentPreview,
            ] = columns;

            if (isRelevant === 'true') {
              relevantContent.push({
                url,
                title,
                contentLength: parseInt(contentLength),
                content: contentPreview,
                source: this.extractSourceFromUrl(url),
              });
            }
          }
        }
      } catch (error) {
        logger.warn('Could not load crawl results, using empty RAG context');
      }

      // Prioritize and limit content to fit context window
      const prioritizedContent = this.prioritizeRagContent(
        relevantContent,
        pokemonName
      );
      const contextWindow = this.buildContextWindow(prioritizedContent);

      return {
        pokemonName,
        totalContentLength: summary.totalContentLength || 0,
        relevantPages: summary.relevantPages || 0,
        sourcesUsed: [...new Set(prioritizedContent.map((c) => c.source))],
        contextWindow,
        prioritizedContent,
      };
    } catch (error) {
      logger.warn('Failed to load RAG context:', error.message);
      return {
        pokemonName,
        totalContentLength: 0,
        relevantPages: 0,
        sourcesUsed: [],
        contextWindow: '',
        prioritizedContent: [],
      };
    }
  }

  /**
   * Extract source name from URL
   * @param {string} url - URL to analyze
   * @returns {string} Source name
   */
  extractSourceFromUrl(url) {
    if (url.includes('bulbapedia')) return 'bulbapedia';
    if (url.includes('smogon.com')) return 'smogon';
    if (url.includes('serebii.net')) return 'serebii';
    if (url.includes('reddit.com')) return 'reddit';
    return 'unknown';
  }

  /**
   * Prioritize RAG content by relevance and source quality
   * @param {Array} content - Array of content items
   * @param {string} pokemonName - Name of the Pokémon
   * @returns {Array} Prioritized content
   */
  prioritizeRagContent(content, pokemonName) {
    const sourcePriority = {
      bulbapedia: 10, // Highest quality - official wiki
      smogon: 8, // Strategy guides - detailed analysis
      serebii: 7, // Comprehensive database
      reddit: 5, // Community discussions
      unknown: 1,
    };

    return content
      .map((item) => ({
        ...item,
        priority: sourcePriority[item.source] || 1,
        relevanceScore: this.calculateRelevanceScore(item, pokemonName),
      }))
      .sort(
        (a, b) => b.priority * b.relevanceScore - a.priority * a.relevanceScore
      );
  }

  /**
   * Calculate relevance score for content
   * @param {Object} item - Content item
   * @param {string} pokemonName - Name of the Pokémon
   * @returns {number} Relevance score (0-1)
   */
  calculateRelevanceScore(item, pokemonName) {
    const text = (item.title + ' ' + item.content).toLowerCase();
    const pokemonTerms = [pokemonName.toLowerCase(), 'pokémon', 'pokemon'];

    let score = 0;
    for (const term of pokemonTerms) {
      if (text.includes(term)) score += 0.3;
    }

    // Bonus for longer, more detailed content
    if (item.contentLength > 1000) score += 0.2;
    if (item.contentLength > 5000) score += 0.2;

    // Bonus for strategy/analysis content
    if (
      text.includes('strategy') ||
      text.includes('competitive') ||
      text.includes('analysis')
    ) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  /**
   * Build context window from prioritized content
   * @param {Array} prioritizedContent - Prioritized content array
   * @returns {string} Context window text
   */
  buildContextWindow(prioritizedContent) {
    const maxContextLength = 8000; // Leave room for prompt and response
    let contextParts = [];
    let currentLength = 0;

    for (const item of prioritizedContent) {
      const part = `[${item.source.toUpperCase()}] ${item.title}\n${item.content}\n`;
      if (currentLength + part.length <= maxContextLength) {
        contextParts.push(part);
        currentLength += part.length;
      } else {
        break; // Context window full
      }
    }

    return contextParts.join('\n---\n');
  }

  /**
   * Build RAG-enhanced prompt
   * @param {string} speciesData - Basic species data
   * @param {string} forumData - Forum data
   * @param {Object} ragContext - RAG context
   * @returns {string} Enhanced prompt
   */
  buildRagPrompt(speciesData, forumData, ragContext) {
    const contextWindow =
      ragContext.contextWindow || 'No additional context available.';

    return `You are creating "iceberg" tidbits for ${ragContext.pokemonName} using comprehensive web research.

WEB RESEARCH CONTEXT (${ragContext.sourcesUsed.join(', ')} - ${ragContext.relevantPages} pages, ${ragContext.totalContentLength} chars):
${contextWindow}

BASIC SPECIES DATA:
${speciesData}

FORUM DISCUSSIONS:
${forumData}

INSTRUCTIONS:
Create 5 intriguing tidbits that reveal hidden depths of ${ragContext.pokemonName}'s lore. Use the web research context to find connections, theories, and obscure facts that fans would find fascinating.

For each tidbit:
- Title: 2-6 compelling words
- Body: 1-3 sentences explaining the theory/fact/connection
- Make it mysterious and iceberg-like (surface facts → deeper mysteries)
- Reference specific sources when possible
- Focus on: evolution mysteries, competitive strategies, real-world inspirations, fan theories, cultural connections

Format as JSON:
{
  "tidbits": [
    {
      "title": "Tidbit Title",
      "body": "Detailed explanation...",
      "sourceRefs": ["bulbapedia", "smogon"]
    }
  ]
}`;
  }

  /**
   * Generate tidbits using LLM
   * @param {string} speciesData - Formatted species data
   * @param {string} forumData - Forum discussion data
   * @returns {Promise<Array>} Generated tidbits
   */
  async generateTidbits(speciesData, forumData, pokemonName = 'bulbasaur') {
    // Mock mode for testing without API key
    if (this.config.mockMode) {
      return this.generateMockTidbits(speciesData, forumData);
    }

    try {
      // Load comprehensive crawl data for RAG
      const ragContext = await this.loadRagContext(pokemonName);

      // Get model config (uses OPENROUTER_MODEL_ID from .env)
      const modelConfig = getModelConfig('tidbitSynthesis');

      // Build RAG-enhanced prompt
      const prompt = this.buildRagPrompt(speciesData, forumData, ragContext);

      logger.info(
        `Generating tidbits for ${pokemonName} using model: ${modelConfig.model} with ${ragContext.totalContentLength || 0} chars of RAG context`
      );

      const response = await this.client.post('/chat/completions', {
        model: modelConfig.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert Pokémon lore researcher creating "iceberg" content for a Pokédex app.
            You have access to comprehensive web-crawled data from Bulbapedia, Smogon strategy guides, Serebii, and community forums.
            Generate intriguing, accurate tidbits that reveal hidden depths of Pokémon lore and connections.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        top_p: modelConfig.topP,
        frequency_penalty: modelConfig.frequencyPenalty,
        presence_penalty: modelConfig.presencePenalty,
      });

      if (response.status !== 200) {
        throw new Error(
          `OpenRouter API error: ${response.status} - ${response.data?.error?.message || 'Unknown error'}`
        );
      }

      const content = this.extractResponseContent(
        response,
        'tidbit generation'
      );
      const parsed = this.parseTidbitsResponse(content);

      return parsed.tidbits || [];
    } catch (error) {
      logger.error('Failed to generate tidbits:', error.message);

      // Try fallback model
      try {
        return await this.generateTidbitsFallback(
          speciesData,
          forumData,
          pokemonName
        );
      } catch (fallbackError) {
        logger.error(
          'Fallback tidbit generation failed:',
          fallbackError.message
        );
        return [];
      }
    }
  }

  /**
   * Generate tidbits using fallback model
   * @param {string} speciesData - Formatted species data
   * @param {string} forumData - Forum discussion data
   * @returns {Promise<Array>} Generated tidbits
   */
  async generateTidbitsFallback(
    speciesData,
    forumData,
    pokemonName = 'bulbasaur'
  ) {
    const modelConfig = getModelConfig('fallback');
    const prompt = getPrompt('tidbitSynthesis', {
      speciesData,
      forumData,
    });

    const response = await this.client.post('/chat/completions', {
      model: modelConfig.model,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert Pokémon lore researcher. Generate concise, intriguing tidbits based on the provided data.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      top_p: modelConfig.topP,
    });

    const content = this.extractResponseContent(
      response,
      'fallback tidbit generation'
    );
    const parsed = this.parseTidbitsResponse(content);

    return parsed.tidbits || [];
  }

  /**
   * Generate mock tidbits for testing without API
   * @param {string} speciesData - Formatted species data
   * @param {string} forumData - Forum discussion data
   * @returns {Array} Mock tidbits
   */
  generateMockTidbits(speciesData, forumData) {
    logger.info('Generating mock tidbits (no API key configured)');

    // Simulate processing time
    // Simulate processing delay
    const tidbits = [
      {
        title: 'Ancient Origins',
        body: 'This Pokémon has roots tracing back to ancient civilizations, where it was revered as a guardian of nature and balance.',
        sourceRefs: ['historical_records', 'archaeological_findings'],
        generatedAt: new Date().toISOString(),
        qualityScore: { accuracy: 4, interest: 5, clarity: 4 },
      },
      {
        title: 'Hidden Abilities',
        body: 'Beyond its visible powers, this Pokémon possesses latent abilities that manifest only under specific environmental conditions.',
        sourceRefs: ['field_research', 'laboratory_studies'],
        generatedAt: new Date().toISOString(),
        qualityScore: { accuracy: 5, interest: 4, clarity: 5 },
      },
      {
        title: 'Cultural Significance',
        body: 'In various cultures, this Pokémon symbolizes resilience and adaptation, appearing in myths and legends across different regions.',
        sourceRefs: ['cultural_studies', 'mythological_texts'],
        generatedAt: new Date().toISOString(),
        qualityScore: { accuracy: 3, interest: 5, clarity: 4 },
      },
      {
        title: 'Evolutionary Mysteries',
        body: 'The evolutionary path of this Pokémon holds secrets that scientists are still working to unravel, with unusual patterns observed in wild populations.',
        sourceRefs: ['evolutionary_biology', 'field_observations'],
        generatedAt: new Date().toISOString(),
        qualityScore: { accuracy: 4, interest: 4, clarity: 3 },
      },
      {
        title: 'Trainer Bonds',
        body: 'This Pokémon forms unusually deep bonds with trainers who demonstrate patience and understanding, showing behaviors not seen with others.',
        sourceRefs: ['behavioral_studies', 'trainer_accounts'],
        generatedAt: new Date().toISOString(),
        qualityScore: { accuracy: 5, interest: 3, clarity: 5 },
      },
    ];

    logger.info(`Generated ${tidbits.length} mock tidbits`);
    return tidbits;
  }

  /**
   * Parse LLM response for tidbits
   * @param {string} content - LLM response content
   * @returns {Object} Parsed response
   */
  parseTidbitsResponse(content) {
    try {
      // Try to parse as JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: extract tidbits from text
      const tidbits = [];
      const lines = content.split('\n');
      let currentTidbit = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('"title"') || trimmed.startsWith('Title:')) {
          if (currentTidbit) {
            tidbits.push(currentTidbit);
          }
          currentTidbit = {
            title: trimmed
              .replace(/^["']?title["']?:\s*["']?/i, '')
              .replace(/["']$/, ''),
            body: '',
            sourceRefs: [],
          };
        } else if (
          trimmed.startsWith('"body"') ||
          trimmed.startsWith('Body:')
        ) {
          if (currentTidbit) {
            currentTidbit.body = trimmed
              .replace(/^["']?body["']?:\s*["']?/i, '')
              .replace(/["']$/, '');
          }
        }
      }

      if (currentTidbit) {
        tidbits.push(currentTidbit);
      }

      return { tidbits };
    } catch (error) {
      logger.error('Failed to parse tidbits response:', error.message);
      return { tidbits: [] };
    }
  }

  /**
   * Validate and filter tidbits
   * @param {Array} tidbits - Raw tidbits
   * @returns {Promise<Array>} Validated tidbits
   */
  async validateTidbits(tidbits) {
    const validated = [];

    for (const tidbit of tidbits) {
      try {
        // Basic validation
        if (!tidbit.title || !tidbit.body) {
          continue;
        }

        // Check safety
        const safetyCheck = await this.checkSafety(tidbit);
        if (!safetyCheck.safe) {
          logger.warn(`Tidbit failed safety check: ${tidbit.title}`);
          continue;
        }

        // Check content quality
        const qualityCheck = await this.checkQuality(tidbit);
        if (qualityCheck.approved) {
          validated.push({
            title: tidbit.title.trim(),
            body: tidbit.body.trim(),
            sourceRefs: tidbit.sourceRefs || [],
            quality: qualityCheck,
          });
        }
      } catch (error) {
        logger.error('Failed to validate tidbit:', error.message);
      }
    }

    return validated.slice(0, 7); // Limit to 7 tidbits
  }

  /**
   * Check tidbit safety
   * @param {Object} tidbit - Tidbit to check
   * @returns {Promise<Object>} Safety check result
   */
  async checkSafety(tidbit) {
    try {
      const modelConfig = getModelConfig('validation');
      const prompt = getPrompt('safetyFilter', {
        content: `${tidbit.title}: ${tidbit.body}`,
      });

      const response = await this.client.post('/chat/completions', {
        model: modelConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
      });

      const content = this.extractResponseContent(response, 'safety check');
      const parsed = this.parseSafetyResponse(content);

      return parsed;
    } catch (error) {
      logger.error('Safety check failed:', error.message);
      return { safe: true, issues: [], confidence: 0.5 };
    }
  }

  /**
   * Check tidbit quality
   * @param {Object} tidbit - Tidbit to check
   * @returns {Promise<Object>} Quality check result
   */
  async checkQuality(tidbit) {
    try {
      const modelConfig = getModelConfig('validation');
      const prompt = getPrompt('contentValidation', {
        title: tidbit.title,
        body: tidbit.body,
      });

      const response = await this.client.post('/chat/completions', {
        model: modelConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
      });

      const content = this.extractResponseContent(response, 'quality check');
      const parsed = this.parseQualityResponse(content);

      return parsed;
    } catch (error) {
      logger.error('Quality check failed:', error.message);
      return {
        approved: true,
        accuracy: 3,
        appropriateness: 4,
        interest: 3,
        clarity: 3,
      };
    }
  }

  /**
   * Parse safety check response
   * @param {string} content - Response content
   * @returns {Object} Parsed safety result
   */
  parseSafetyResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // Fallback parsing
    }

    return { safe: true, issues: [], confidence: 0.8 };
  }

  /**
   * Parse quality check response
   * @param {string} content - Response content
   * @returns {Object} Parsed quality result
   */
  parseQualityResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // Fallback parsing
    }

    return {
      approved: true,
      accuracy: 3,
      appropriateness: 4,
      interest: 3,
      clarity: 3,
    };
  }

  /**
   * Format species data for LLM
   * @param {Object} speciesData - Species data
   * @returns {string} Formatted data
   */
  formatSpeciesData(speciesData) {
    const parts = [];

    if (speciesData.name) {
      parts.push(`Name: ${speciesData.name}`);
    }

    if (speciesData.types && speciesData.types.length > 0) {
      parts.push(`Types: ${speciesData.types.join(', ')}`);
    }

    if (speciesData.stats) {
      const stats = Object.entries(speciesData.stats)
        .filter(([key, value]) => value > 0)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (stats) {
        parts.push(`Stats: ${stats}`);
      }
    }

    if (speciesData.abilities && speciesData.abilities.length > 0) {
      parts.push(`Abilities: ${speciesData.abilities.join(', ')}`);
    }

    if (speciesData.description) {
      parts.push(`Description: ${speciesData.description}`);
    }

    if (speciesData.trivia && speciesData.trivia.length > 0) {
      parts.push(`Trivia: ${speciesData.trivia.join('; ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Get forum data for species
   * @param {string} speciesId - Species ID
   * @returns {Promise<string>} Forum data
   */
  async getForumData(speciesId) {
    // This would integrate with forum scraping
    // For now, return consistent placeholder data to ensure stable cache keys
    // TODO: Implement actual forum scraping integration
    return `Forum discussions about species ${speciesId} would be scraped here.`;
  }

  /**
   * Generate cache key for species
   * @param {string} speciesId - Species ID
   * @param {Object} speciesData - Species data
   * @param {string} forumData - Forum discussion data
   * @returns {string} Cache key
   */
  getCacheKey(speciesId, speciesData, forumData) {
    // Create a stable cache key using only essential, unchanging data
    // Exclude tidbits array and other dynamic fields to prevent cache invalidation
    const stableData = {
      name: speciesData.name,
      types: speciesData.types,
      stats: speciesData.stats,
      abilities: speciesData.abilities,
      description: speciesData.description,
      trivia: speciesData.trivia,
    };

    // Normalize forum data to ensure consistent cache keys
    // Use a consistent placeholder when forum data is empty/undefined to prevent cache misses
    const normalizedForumData =
      forumData && forumData.trim() ? forumData.trim() : 'no-forum-data';

    // Include forum data in cache key to ensure cache invalidation when forum discussions change
    const cacheData = {
      speciesData: stableData,
      forumData: normalizedForumData,
    };

    // Use full SHA-256 hash to minimize collision risk
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(cacheData))
      .digest('hex');

    return `${speciesId}-${dataHash}`;
  }

  /**
   * Get synthesizer statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      apiKey: this.apiKey ? 'configured' : 'missing',
      baseUrl: this.baseUrl,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}
