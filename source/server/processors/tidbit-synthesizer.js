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
import { logger } from '../utils/logger.js';
import { getModelConfig, getPrompt, validateResponse } from '../config/models.js';

/**
 * Tidbit synthesizer using OpenRouter LLM
 */
export class TidbitSynthesizer {
  constructor(config) {
    this.config = config;
    this.apiKey = config.openRouterApiKey;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.cache = new Map();
    
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'InfinitePokedexBot/1.0'
      },
      timeout: 30000
    });
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
          const enrichedSpecies = await this.enrichSpecies(speciesId, speciesData);
          enrichedData[speciesId] = enrichedSpecies;
          
          // Rate limiting between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error(`Failed to enrich species ${speciesId}:`, error.message);
          // Continue with other species
          enrichedData[speciesId] = speciesData;
        }
      }

      logger.info(`Tidbit synthesis complete: ${Object.keys(enrichedData).length} species processed`);
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
      // Check cache first
      const cacheKey = this.getCacheKey(speciesId, speciesData);
      if (this.cache.has(cacheKey)) {
        logger.debug(`Cache hit for species ${speciesId}`);
        const cached = this.cache.get(cacheKey);
        return { ...speciesData, tidbits: cached };
      }

      // Prepare data for LLM
      const speciesDataText = this.formatSpeciesData(speciesData);
      const forumDataText = await this.getForumData(speciesId);

      // Generate tidbits
      const tidbits = await this.generateTidbits(speciesDataText, forumDataText);

      // Validate and filter tidbits
      const validatedTidbits = await this.validateTidbits(tidbits);

      // Cache the result
      this.cache.set(cacheKey, validatedTidbits);

      return {
        ...speciesData,
        tidbits: validatedTidbits
      };

    } catch (error) {
      logger.error(`Failed to enrich species ${speciesId}:`, error.message);
      return speciesData; // Return original data on error
    }
  }

  /**
   * Generate tidbits using LLM
   * @param {string} speciesData - Formatted species data
   * @param {string} forumData - Forum discussion data
   * @returns {Promise<Array>} Generated tidbits
   */
  async generateTidbits(speciesData, forumData) {
    try {
      const modelConfig = getModelConfig('tidbitSynthesis');
      const prompt = getPrompt('tidbitSynthesis', {
        speciesData,
        forumData
      });

      const response = await this.client.post('/chat/completions', {
        model: modelConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert Pokémon lore researcher creating "iceberg" content for a Pokédex app. Generate intriguing, accurate tidbits based on the provided data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        top_p: modelConfig.topP,
        frequency_penalty: modelConfig.frequencyPenalty,
        presence_penalty: modelConfig.presencePenalty
      });

      if (response.status !== 200) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const content = response.data.choices[0].message.content;
      const parsed = this.parseTidbitsResponse(content);

      return parsed.tidbits || [];

    } catch (error) {
      logger.error('Failed to generate tidbits:', error.message);
      
      // Try fallback model
      try {
        return await this.generateTidbitsFallback(speciesData, forumData);
      } catch (fallbackError) {
        logger.error('Fallback tidbit generation failed:', fallbackError.message);
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
  async generateTidbitsFallback(speciesData, forumData) {
    const modelConfig = getModelConfig('fallback');
    const prompt = getPrompt('tidbitSynthesis', {
      speciesData,
      forumData
    });

    const response = await this.client.post('/chat/completions', {
      model: modelConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert Pokémon lore researcher. Generate concise, intriguing tidbits based on the provided data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      top_p: modelConfig.topP
    });

    const content = response.data.choices[0].message.content;
    const parsed = this.parseTidbitsResponse(content);

    return parsed.tidbits || [];
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
            title: trimmed.replace(/^["']?title["']?:\s*["']?/i, '').replace(/["']$/, ''),
            body: '',
            sourceRefs: []
          };
        } else if (trimmed.startsWith('"body"') || trimmed.startsWith('Body:')) {
          if (currentTidbit) {
            currentTidbit.body = trimmed.replace(/^["']?body["']?:\s*["']?/i, '').replace(/["']$/, '');
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
            quality: qualityCheck
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
        content: `${tidbit.title}: ${tidbit.body}`
      });

      const response = await this.client.post('/chat/completions', {
        model: modelConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature
      });

      const content = response.data.choices[0].message.content;
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
        body: tidbit.body
      });

      const response = await this.client.post('/chat/completions', {
        model: modelConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature
      });

      const content = response.data.choices[0].message.content;
      const parsed = this.parseQualityResponse(content);

      return parsed;

    } catch (error) {
      logger.error('Quality check failed:', error.message);
      return { approved: true, accuracy: 3, appropriateness: 4, interest: 3, clarity: 3 };
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

    return { approved: true, accuracy: 3, appropriateness: 4, interest: 3, clarity: 3 };
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
    // For now, return placeholder data
    return `Forum discussions about species ${speciesId} would be scraped here.`;
  }

  /**
   * Generate cache key for species
   * @param {string} speciesId - Species ID
   * @param {Object} speciesData - Species data
   * @returns {string} Cache key
   */
  getCacheKey(speciesId, speciesData) {
    const dataHash = JSON.stringify(speciesData);
    return `${speciesId}-${Buffer.from(dataHash).toString('base64').slice(0, 16)}`;
  }

  /**
   * Get synthesizer statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      apiKey: this.apiKey ? 'configured' : 'missing',
      baseUrl: this.baseUrl
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}