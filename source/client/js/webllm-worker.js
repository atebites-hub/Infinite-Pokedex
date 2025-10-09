/**
 * WebLLM Worker
 *
 * Handles on-device LLM inference for lore generation using WebLLM.
 * Loads the Qwen3-0.6B model, processes tidbit data into 5-panel lore format,
 * and manages model lifecycle for efficient memory usage with WebSD.
 *
 * @fileoverview WebLLM worker for client-side lore generation
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import * as webllm from '@mlc-ai/web-llm';

// Model configuration
const MODEL_CONFIG = {
  model: 'mlc-ai/Qwen3-0.6B-q4f16_0-MLC',
  modelId: 'Qwen3-0.6B-q4f16_0-MLC',
  modelLib: 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.65/dist/',
};

// Generation parameters
const GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 800,
  repetitionPenalty: 1.1,
  presencePenalty: 0.1,
  frequencyPenalty: 0.1,
};

// dSpy-style prompt templates for lore generation
const PROMPT_TEMPLATES = {
  systemPrompt: `You are an expert Pokémon lore researcher creating compelling "iceberg" content. Generate exactly 5 distinct panels of lore, each with a title and 1-2 sentence description. Each panel should reveal increasingly deeper or more intriguing aspects of the Pokémon's history, abilities, or cultural significance.

Format your response as exactly 5 panels, each with:
- A compelling title (3-8 words)
- 1-2 sentences of engaging lore

Focus on creating mysterious, intriguing content that makes players want to learn more.`,

  userPrompt: `Generate 5-panel lore for {pokemonName} based on these tidbits:

{tidbits}

Create panels that build an iceberg of knowledge, from surface-level facts to deeper mysteries.`,

  formatInstructions: `Output exactly 5 panels in this JSON format:
[
  {
    "title": "Panel Title",
    "body": "Panel description text",
    "panelNumber": 1
  },
  ...
]`,
};

class WebLLMWorker {
  constructor() {
    this.engine = null;
    this.isInitialized = false;
    this.isGenerating = false;

    // Progress tracking
    this.progressCallback = null;
    this.currentProgress = {
      stage: 'idle',
      progress: 0,
      message: 'Ready',
    };

    this.init();
  }

  async init() {
    try {
      this.updateProgress('initializing', 0, 'Initializing WebLLM engine...');

      // Initialize WebLLM engine
      this.engine = new webllm.MLCEngine();
      await this.engine.reload(MODEL_CONFIG.modelId, {
        modelLib: MODEL_CONFIG.modelLib,
      });

      this.isInitialized = true;
      this.updateProgress('ready', 100, 'Model ready for generation');

      // Notify main thread that worker is ready
      self.postMessage({
        type: 'worker-ready',
        data: { success: true },
      });
    } catch (error) {
      console.error('Failed to initialize WebLLM worker:', error);
      this.updateProgress(
        'error',
        0,
        `Initialization failed: ${error.message}`
      );

      self.postMessage({
        type: 'worker-error',
        data: {
          stage: 'initialization',
          error: error.message,
        },
      });
    }
  }

  updateProgress(stage, progress, message) {
    this.currentProgress = { stage, progress, message };

    if (this.progressCallback) {
      this.progressCallback(this.currentProgress);
    }

    // Send progress updates to main thread
    self.postMessage({
      type: 'progress-update',
      data: this.currentProgress,
    });
  }

  async generateLore(pokemonName, tidbits) {
    if (!this.isInitialized) {
      throw new Error('WebLLM worker not initialized');
    }

    if (this.isGenerating) {
      throw new Error('Generation already in progress');
    }

    this.isGenerating = true;

    try {
      this.updateProgress('preparing', 10, 'Preparing generation request...');

      // Format tidbits for prompt
      const formattedTidbits = this.formatTidbits(tidbits);

      // Build the complete prompt
      const prompt = this.buildPrompt(pokemonName, formattedTidbits);

      this.updateProgress('loading-model', 15, 'Loading WebLLM model...');

      // Wait for model to be ready (WebLLM handles this internally)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.updateProgress('generating', 30, 'Generating lore panels...');

      // Generate response using WebLLM
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: PROMPT_TEMPLATES.systemPrompt },
          { role: 'user', content: prompt },
        ],
        ...GENERATION_CONFIG,
        stream: false,
      });

      this.updateProgress('parsing', 80, 'Parsing generated content...');

      const rawContent = response.choices[0].message.content;
      const lorePanels = this.parseResponse(rawContent);

      this.updateProgress('complete', 100, 'Lore generation complete');

      return lorePanels;
    } catch (error) {
      console.error('Lore generation failed:', error);
      this.updateProgress('error', 0, `Generation failed: ${error.message}`);
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  formatTidbits(tidbits) {
    if (!Array.isArray(tidbits)) {
      return 'No tidbits available for this Pokémon.';
    }

    return tidbits
      .map((tidbit, index) => `${index + 1}. ${tidbit.title}: ${tidbit.body}`)
      .join('\n');
  }

  buildPrompt(pokemonName, formattedTidbits) {
    // Sanitize inputs for template replacement
    const safePokemonName = String(pokemonName || '').slice(0, 100);
    const safeTidbits = String(formattedTidbits || '').slice(0, 5000);

    return (
      PROMPT_TEMPLATES.userPrompt
        .replace('{pokemonName}', safePokemonName)
        .replace('{tidbits}', safeTidbits) +
      '\n\n' +
      PROMPT_TEMPLATES.formatInstructions
    );
  }

  parseResponse(rawContent) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const panels = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(panels) || panels.length !== 5) {
        throw new Error('Response does not contain exactly 5 panels');
      }

      // Validate and format each panel
      return panels.map((panel, index) => {
        const title =
          typeof panel.title === 'string' ? panel.title : `Panel ${index + 1}`;
        const body =
          typeof panel.body === 'string' ? panel.body : 'No content generated';
        return {
          title: title.slice(0, 100), // Limit title length
          body: body.slice(0, 500), // Limit body length
          panelNumber: index + 1,
        };
      });
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Raw content:', rawContent);

      // Fallback: create basic panels from raw content
      return this.createFallbackPanels(rawContent);
    }
  }

  createFallbackPanels(rawContent) {
    // Simple fallback parsing if JSON parsing fails
    const lines = rawContent.split('\n').filter((line) => line.trim());

    const panels = [];
    for (let i = 0; i < 5; i++) {
      panels.push({
        title: `Lore Panel ${i + 1}`,
        body: lines[i] || `Generated lore content for panel ${i + 1}`,
        panelNumber: i + 1,
      });
    }

    return panels;
  }

  async unloadModel() {
    if (this.engine) {
      try {
        this.updateProgress('unloading', 50, 'Unloading WebLLM model...');
        await this.engine.unload();
        this.updateProgress('unloaded', 100, 'Model unloaded successfully');
      } catch (error) {
        console.warn('Failed to unload WebLLM model:', error);
      }
    }
  }

  getProgress() {
    return this.currentProgress;
  }

  isReady() {
    return this.isInitialized && !this.isGenerating;
  }
}

// Telemetry tracking
const telemetry = {
  generations: 0,
  errors: 0,
  totalTime: 0,
  startTime: Date.now(),
};

// Worker instance
const webllmWorker = new WebLLMWorker();

// Message handler
self.onmessage = async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'generate-lore': {
        const startTime = Date.now();
        const { pokemonName, tidbits } = data;

        try {
          const lorePanels = await webllmWorker.generateLore(
            pokemonName,
            tidbits
          );
          const duration = Date.now() - startTime;

          // Track telemetry
          telemetry.generations++;
          telemetry.totalTime += duration;

          self.postMessage({
            type: 'lore-generated',
            data: {
              pokemonName,
              lorePanels,
              success: true,
              telemetry: { duration },
            },
          });
        } catch (error) {
          telemetry.errors++;
          throw error;
        }
        break;
      }

      case 'unload-model':
        await webllmWorker.unloadModel();
        self.postMessage({
          type: 'model-unloaded',
          data: { success: true },
        });
        break;

      case 'get-status':
        self.postMessage({
          type: 'status-response',
          data: {
            isReady: webllmWorker.isReady(),
            progress: webllmWorker.getProgress(),
            isInitialized: webllmWorker.isInitialized,
            isGenerating: webllmWorker.isGenerating,
          },
        });
        break;

      case 'get-telemetry':
        self.postMessage({
          type: 'telemetry-response',
          data: {
            ...telemetry,
            uptime: Date.now() - telemetry.startTime,
            averageGenerationTime:
              telemetry.generations > 0
                ? telemetry.totalTime / telemetry.generations
                : 0,
          },
        });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'worker-error',
      data: {
        stage: type,
        error: error.message,
      },
    });
  }
};
