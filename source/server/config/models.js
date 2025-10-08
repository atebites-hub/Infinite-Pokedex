/**
 * LLM Model Configuration
 *
 * Defines OpenRouter model configurations for tidbit synthesis and content generation.
 * Includes model selection, prompt templates, and safety filters.
 *
 * @fileoverview LLM model configuration and prompt templates
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

/**
 * OpenRouter model configurations
 */
export const modelConfigs = {
  // Primary model for tidbit synthesis
  tidbitSynthesis: {
    model: 'openai/gpt-3.5-turbo',
    maxTokens: 1000,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
  },

  // Fallback model for reliability
  fallback: {
    model: 'meta-llama/llama-3.1-8b-instruct',
    maxTokens: 800,
    temperature: 0.6,
    topP: 0.85,
    frequencyPenalty: 0.05,
    presencePenalty: 0.05,
  },

  // Content validation model
  validation: {
    model: 'openai/gpt-3.5-turbo',
    maxTokens: 200,
    temperature: 0.1,
    topP: 0.5,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
};

/**
 * Prompt templates for different tasks
 */
export const promptTemplates = {
  tidbitSynthesis: `You are an expert Pokémon lore researcher creating "iceberg" content for a Pokédex app. 

Your task is to analyze the provided Pokémon data and forum discussions to create 3-7 concise, intriguing tidbits that would appeal to fans who enjoy deep Pokémon lore and theories.

For each tidbit:
- Write a compelling title (2-6 words)
- Provide 1-3 sentences explaining the theory, fact, or connection
- Keep it mysterious and intriguing, like "iceberg" content
- Base it on real information from the sources
- Avoid spoilers for recent games
- Make it accessible to casual fans but interesting to hardcore fans

Pokémon Data:
{speciesData}

Forum Discussions:
{forumData}

Create tidbits that explore:
- Hidden connections between Pokémon
- Real-world inspirations and references
- Game development secrets and cut content
- Fan theories with evidence
- Obscure trivia and easter eggs
- Cultural and mythological connections

Format your response as JSON:
{
  "tidbits": [
    {
      "title": "Tidbit Title",
      "body": "Explanation of the theory or fact...",
      "sourceRefs": ["source-id-1", "source-id-2"]
    }
  ]
}`,

  contentValidation: `Analyze this Pokémon tidbit for appropriateness and accuracy:

Title: {title}
Content: {body}

Rate each aspect 1-5 (1=inappropriate/inaccurate, 5=excellent):
- Accuracy: How well does this align with known Pokémon facts?
- Appropriateness: Is this suitable for all ages?
- Interest: How engaging and intriguing is this content?
- Clarity: Is this clearly written and understandable?

Respond with JSON:
{
  "accuracy": 4,
  "appropriateness": 5,
  "interest": 4,
  "clarity": 5,
  "approved": true,
  "reason": "Brief explanation of rating"
}`,

  safetyFilter: `Check this content for safety issues:

Content: {content}

Identify any issues with:
- Violence or inappropriate themes
- Misinformation or false claims
- Offensive language or content
- Copyright violations
- Privacy concerns

Respond with JSON:
{
  "safe": true,
  "issues": [],
  "confidence": 0.95
}`,
};

/**
 * Safety and content filters
 */
export const safetyConfig = {
  // Content filters
  filters: {
    profanity: true,
    violence: true,
    misinformation: true,
    copyright: true,
    privacy: true,
  },

  // Minimum scores for approval
  thresholds: {
    accuracy: 3,
    appropriateness: 4,
    interest: 3,
    clarity: 3,
    safety: 0.8,
  },

  // Blocked content patterns
  blockedPatterns: [/spoil/i, /leak/i, /hack/i, /cheat/i, /exploit/i],

  // Required source verification
  sourceRequirements: {
    minSources: 1,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    trustedDomains: [
      'bulbapedia.bulbagarden.net',
      'serebii.net',
      'pokemon.com',
      'nintendo.com',
    ],
  },
};

/**
 * Get model configuration for a specific task
 * @param {string} task - Task type (tidbitSynthesis, validation, etc.)
 * @returns {Object} Model configuration
 */
export function getModelConfig(task) {
  const config = modelConfigs[task];
  if (!config) {
    throw new Error(`Unknown task: ${task}`);
  }
  return config;
}

/**
 * Get prompt template for a specific task
 * @param {string} task - Task type
 * @param {Object} variables - Variables to substitute in template
 * @returns {string} Formatted prompt
 */
export function getPrompt(task, variables = {}) {
  const template = promptTemplates[task];
  if (!template) {
    throw new Error(`Unknown prompt template: ${task}`);
  }

  // Simple variable substitution
  let prompt = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
  }

  return prompt;
}

/**
 * Validate model response
 * @param {Object} response - Model response to validate
 * @param {string} task - Task type
 * @returns {Object} Validation result
 */
export function validateResponse(response, task) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check for required fields based on task
  switch (task) {
    case 'tidbitSynthesis':
      if (!response.tidbits || !Array.isArray(response.tidbits)) {
        result.valid = false;
        result.errors.push('Missing or invalid tidbits array');
      } else {
        // Validate each tidbit
        for (const [index, tidbit] of response.tidbits.entries()) {
          if (!tidbit.title || !tidbit.body) {
            result.valid = false;
            result.errors.push(`Tidbit ${index} missing title or body`);
          }
          if (tidbit.title && tidbit.title.length > 50) {
            result.warnings.push(`Tidbit ${index} title too long`);
          }
          if (tidbit.body && tidbit.body.length > 500) {
            result.warnings.push(`Tidbit ${index} body too long`);
          }
        }
      }
      break;

    case 'validation':
      const requiredFields = [
        'accuracy',
        'appropriateness',
        'interest',
        'clarity',
        'approved',
      ];
      for (const field of requiredFields) {
        if (!(field in response)) {
          result.valid = false;
          result.errors.push(`Missing required field: ${field}`);
        }
      }
      break;

    case 'safetyFilter':
      if (!('safe' in response) || typeof response.safe !== 'boolean') {
        result.valid = false;
        result.errors.push('Missing or invalid safe field');
      }
      break;
  }

  return result;
}
