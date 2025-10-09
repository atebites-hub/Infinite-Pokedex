/**
 * WebSD Worker
 *
 * Handles on-device Stable Diffusion image generation for Pokémon artwork.
 * Generates images based on lore content and displays them alongside text panels.
 *
 * @fileoverview WebSD worker for client-side artwork generation
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

import * as webllm from '@mlc-ai/web-llm';

// WebSD would use a different library, but for now we'll mock it
// In a real implementation, this would import from @mlc-ai/web-sd or similar

class WebSDWorker {
  constructor() {
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
      this.updateProgress('initializing', 0, 'Initializing WebSD...');

      // WebSD initialization would go here
      // For now, we'll simulate the initialization
      await new Promise((resolve) => setTimeout(resolve, 500));

      this.isInitialized = true;
      this.updateProgress('ready', 100, 'WebSD ready for generation');

      // Notify main thread that worker is ready
      self.postMessage({
        type: 'worker-ready',
        data: { success: true },
      });
    } catch (error) {
      console.error('Failed to initialize WebSD worker:', error);
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

  async generateArtwork(pokemonName, lorePanel) {
    if (!this.isInitialized) {
      throw new Error('WebSD worker not initialized');
    }

    if (this.isGenerating) {
      throw new Error('Artwork generation already in progress');
    }

    this.isGenerating = true;

    try {
      this.updateProgress('preparing', 10, 'Preparing artwork generation...');

      // Create prompt from lore panel
      const prompt = this.buildArtworkPrompt(pokemonName, lorePanel);

      this.updateProgress('generating', 20, 'Generating artwork...');

      // Simulate WebSD generation (would be real API call)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate mock artwork data (base64 encoded placeholder)
      const artworkData = await this.generateMockArtwork(
        pokemonName,
        lorePanel
      );

      this.updateProgress('complete', 100, 'Artwork generation complete');

      return {
        panelNumber: lorePanel.panelNumber,
        prompt: prompt,
        imageData: artworkData,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Artwork generation failed:', error);
      this.updateProgress('error', 0, `Generation failed: ${error.message}`);
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  buildArtworkPrompt(pokemonName, lorePanel) {
    const basePrompt = `${pokemonName} Pokémon, ${lorePanel.body}`;

    // Add style elements based on panel content
    const styleElements = [];

    if (
      lorePanel.body.toLowerCase().includes('ancient') ||
      lorePanel.body.toLowerCase().includes('mysterious')
    ) {
      styleElements.push('ancient ruins background', 'mysterious atmosphere');
    }

    if (
      lorePanel.body.toLowerCase().includes('battle') ||
      lorePanel.body.toLowerCase().includes('warrior')
    ) {
      styleElements.push('battle damaged', 'heroic pose');
    }

    if (
      lorePanel.body.toLowerCase().includes('nature') ||
      lorePanel.body.toLowerCase().includes('forest')
    ) {
      styleElements.push('lush forest background', 'natural setting');
    }

    if (
      lorePanel.body.toLowerCase().includes('evolve') ||
      lorePanel.body.toLowerCase().includes('evolution')
    ) {
      styleElements.push('glowing energy', 'transformation effect');
    }

    return `${basePrompt}, ${styleElements.join(', ')}, digital art, detailed, high quality, Pokémon style`;
  }

  async generateMockArtwork(pokemonName, lorePanel) {
    // Create a mock base64 encoded image
    // In a real implementation, this would be the actual WebSD generated image

    // Simulate different artwork based on panel content
    const themes = {
      ancient:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      battle:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      nature:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      evolution:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    let theme = 'nature'; // default

    const content = lorePanel.body.toLowerCase();
    if (content.includes('ancient') || content.includes('mysterious'))
      theme = 'ancient';
    else if (content.includes('battle') || content.includes('warrior'))
      theme = 'battle';
    else if (content.includes('evolve') || content.includes('evolution'))
      theme = 'evolution';

    return {
      theme,
      imageUrl: themes[theme],
      altText: `${pokemonName} - ${lorePanel.title}`,
      metadata: {
        pokemon: pokemonName,
        panel: lorePanel.panelNumber,
        theme: theme,
        generated: true,
      },
    };
  }

  getProgress() {
    return this.currentProgress;
  }

  isReady() {
    return this.isInitialized && !this.isGenerating;
  }
}

// Worker instance
const websdWorker = new WebSDWorker();

// Message handler
self.onmessage = async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'generate-artwork':
        const { pokemonName, lorePanel } = data;
        const artwork = await websdWorker.generateArtwork(
          pokemonName,
          lorePanel
        );

        self.postMessage({
          type: 'artwork-generated',
          data: {
            pokemonName,
            artwork,
            success: true,
          },
        });
        break;

      case 'get-status':
        self.postMessage({
          type: 'status-response',
          data: {
            isReady: websdWorker.isReady(),
            progress: websdWorker.getProgress(),
            isInitialized: websdWorker.isInitialized,
            isGenerating: websdWorker.isGenerating,
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
