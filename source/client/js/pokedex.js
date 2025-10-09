// Infinite Pokédex - Core Pokédex Application
// Main application logic for species management and UI

import { StorageManager } from './storage.js';
import { AnimationManager } from './animations.js';
import { cdnSync } from './sync.js';

const MAX_PARALLEL_GENERATIONS = 1;

export class PokedexApp {
  constructor(storage, animations) {
    this.storage = storage;
    this.animations = animations;
    this.speciesData = [];
    this.filteredSpecies = [];
    this.favorites = new Set();
    this.currentSearchQuery = '';
    this.settings = {
      aiQuality: 'balanced',
      offlineMode: false,
    };

    this.loreGenerationQueue = [];
    this.activeLoreGenerations = 0;
    this.autoGenerationEnabled = true;
    this.pendingUpdates = new Set();

    // WebLLM worker management
    this.webllmWorker = null;
    this.workerReady = false;
    this.workerInitializing = false;

    // WebSD worker management
    this.websdWorker = null;
    this.websdReady = false;
    this.websdInitializing = false;

    // Lore history management
    this.loreHistory = [];
    this.maxHistorySize = 10;

    this.init();
  }

  /**
   * Initialize the Pokédex application
   * Sets up event listeners and loads initial data
   */
  async init() {
    try {
      // Load settings
      await this.loadSettings();

      // Load favorites
      await this.loadFavorites();

      // Initialize WebLLM worker (async, don't block app startup)
      this.initializeWebLLMWorker().catch((error) => {
        console.warn('WebLLM worker initialization failed:', error);
        console.warn('Lore generation will not be available');
      });

      // Initialize WebSD worker (async, don't block app startup)
      this.initializeWebSDWorker().catch((error) => {
        console.warn('WebSD worker initialization failed:', error);
        console.warn('Artwork generation will not be available');
      });

      this.setupEventListeners();
      this.setupTidbitEventListeners();

      console.log('Pokédex app initialized');
    } catch (error) {
      console.error('Failed to initialize Pokédex app:', error);
    }
  }

  /**
   * Initialize WebSD worker
   */
  async initializeWebSDWorker() {
    if (this.websdInitializing || this.websdReady) {
      return;
    }

    this.websdInitializing = true;

    try {
      console.log('Initializing WebSD worker...');

      // Create worker
      this.websdWorker = new Worker('./js/websd-worker.js', { type: 'module' });

      // Set up message handlers
      this.websdWorker.onmessage = (event) => {
        this.handleWebSDMessage(event.data);
      };

      this.websdWorker.onerror = (error) => {
        console.error('WebSD worker error:', error);
        this.websdInitializing = false;
        this.websdReady = false;
      };

      // Wait for worker to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSD worker initialization timeout'));
        }, 30000); // 30 second timeout

        const checkReady = (message) => {
          if (message.type === 'worker-ready') {
            clearTimeout(timeout);
            resolve();
          } else if (message.type === 'worker-error') {
            clearTimeout(timeout);
            reject(new Error(message.data.error));
          }
        };

        // Temporary message handler for initialization
        this.websdWorker.onmessage = (event) => {
          checkReady(event.data);
          this.handleWebSDMessage(event.data);
        };
      });

      this.websdReady = true;
      this.websdInitializing = false;
      console.log('WebSD worker ready');
    } catch (error) {
      console.error('Failed to initialize WebSD worker:', error);
      this.websdInitializing = false;
      this.websdReady = false;
      throw error;
    }
  }

  /**
   * Handle messages from WebSD worker
   */
  handleWebSDMessage(message) {
    const { type, data } = message;

    switch (type) {
      case 'worker-ready':
        console.log('WebSD worker reported ready');
        break;

      case 'progress-update':
        this.handleArtworkProgress(data);
        break;

      case 'artwork-generated':
        this.handleArtworkGenerated(data);
        break;

      case 'worker-error':
        console.error('WebSD worker error:', data);
        this.handleWebSDError(data);
        break;

      default:
        console.warn('Unknown WebSD worker message type:', type);
    }
  }

  /**
   * Handle artwork generation progress updates
   */
  handleArtworkProgress(progress) {
    // Update UI with artwork progress information
    const generatingElements = document.querySelectorAll('.generating-artwork');
    generatingElements.forEach((element) => {
      this.animations.updateGenerationProgress(
        element,
        progress.progress,
        progress.message
      );
    });
  }

  /**
   * Handle completed artwork generation
   */
  handleArtworkGenerated(data) {
    const { pokemonName, artwork, success } = data;

    if (success && artwork) {
      // Find the panel and update it with artwork
      const panelElement = document.querySelector(
        `.lore-panel[data-panel="${artwork.panelNumber}"]`
      );
      if (panelElement) {
        this.addArtworkToPanel(panelElement, artwork);
      }
    }
  }

  /**
   * Handle WebSD errors
   */
  handleWebSDError(error) {
    console.error('WebSD generation failed:', error);

    // Show error in UI
    const generatingElements = document.querySelectorAll('.generating-artwork');
    generatingElements.forEach((element) => {
      const statusText = element.querySelector('.generation-status');
      if (statusText) {
        statusText.textContent =
          'Artwork generation failed - check console for details';
        statusText.style.color = '#ff6b6b';
      }
    });
  }

  /**
   * Add artwork to a lore panel
   */
  addArtworkToPanel(panelElement, artwork) {
    // Remove generating state
    panelElement.classList.remove('generating-artwork');

    // Add artwork image
    const artworkContainer = document.createElement('div');
    artworkContainer.className = 'panel-artwork';

    const img = document.createElement('img');
    img.src = artwork.imageData.imageUrl;
    img.alt = artwork.imageData.altText;
    img.loading = 'lazy';

    artworkContainer.appendChild(img);
    panelElement.insertBefore(artworkContainer, panelElement.firstChild);
  }

  /**
   * Set up event listeners for Pokédex functionality
   */
  setupEventListeners() {
    // Species card clicks
    document.addEventListener('click', (e) => {
      const speciesCard = e.target.closest('.pokemon-card');
      if (speciesCard) {
        const speciesId = parseInt(speciesCard.dataset.speciesId);
        this.openSpeciesEntry(speciesId);
      }
    });

    // Favorite button clicks
    document.addEventListener('click', (e) => {
      const favoriteBtn = e.target.closest('.favorite-btn');
      if (favoriteBtn) {
        e.stopPropagation();
        const speciesId = parseInt(favoriteBtn.dataset.speciesId);
        this.toggleFavorite(speciesId);
      }
    });

    // Settings changes
    document.addEventListener('change', (e) => {
      if (e.target.id === 'ai-quality') {
        this.updateSetting('aiQuality', e.target.value);
      } else if (e.target.id === 'offline-mode') {
        this.updateSetting('offlineMode', e.target.checked);
      }
    });

    document.addEventListener('click', async (event) => {
      const regenerateBtn = event.target.closest('.regenerate-btn');
      if (regenerateBtn) {
        const speciesId = Number(regenerateBtn.dataset.speciesId);
        if (!Number.isNaN(speciesId)) {
          await this.enqueueLoreGeneration(String(speciesId), {
            reason: 'manual-regenerate',
          });
        }
      }
    });
  }

  /**
   * Initialize WebLLM worker
   */
  async initializeWebLLMWorker() {
    if (this.workerInitializing || this.workerReady) {
      return;
    }

    this.workerInitializing = true;

    try {
      console.log('Initializing WebLLM worker...');

      // Create worker
      this.webllmWorker = new Worker('./js/webllm-worker.js', {
        type: 'module',
      });

      // Set up message handlers
      this.webllmWorker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };

      this.webllmWorker.onerror = (error) => {
        console.error('WebLLM worker error:', error);
        this.workerInitializing = false;
        this.workerReady = false;
      };

      // Wait for worker to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebLLM worker initialization timeout'));
        }, 30000); // 30 second timeout

        const checkReady = (message) => {
          if (message.type === 'worker-ready') {
            clearTimeout(timeout);
            resolve();
          } else if (message.type === 'worker-error') {
            clearTimeout(timeout);
            reject(new Error(message.data.error));
          }
        };

        // Temporary message handler for initialization
        this.webllmWorker.onmessage = (event) => {
          checkReady(event.data);
          this.handleWorkerMessage(event.data);
        };
      });

      this.workerReady = true;
      this.workerInitializing = false;
      console.log('WebLLM worker ready');
    } catch (error) {
      console.error('Failed to initialize WebLLM worker:', error);
      this.workerInitializing = false;
      this.workerReady = false;
      throw error;
    }
  }

  /**
   * Handle messages from WebLLM worker
   */
  handleWorkerMessage(message) {
    const { type, data } = message;

    switch (type) {
      case 'worker-ready':
        console.log('WebLLM worker reported ready');
        break;

      case 'progress-update':
        this.handleGenerationProgress(data);
        break;

      case 'lore-generated':
        this.handleLoreGenerated(data);
        break;

      case 'worker-error':
        console.error('WebLLM worker error:', data);
        this.handleWorkerError(data);
        break;

      case 'model-unloaded':
        console.log('WebLLM model unloaded');
        break;

      default:
        console.warn('Unknown worker message type:', type);
    }
  }

  /**
   * Handle generation progress updates
   */
  handleGenerationProgress(progress) {
    // Update UI with progress information
    const generatingElements = document.querySelectorAll('.generating-lore');
    generatingElements.forEach((element) => {
      this.animations.updateGenerationProgress(
        element,
        progress.progress,
        progress.message
      );
    });
  }

  /**
   * Handle completed lore generation
   */
  handleLoreGenerated(data) {
    const { pokemonName, lorePanels, success } = data;

    if (success && lorePanels) {
      // Add to history
      this.addToLoreHistory(pokemonName, lorePanels);

      // Find the species and update the UI
      const species = this.speciesData.find((s) => s.name === pokemonName);
      if (species) {
        this.renderLorePanels(species.id, lorePanels);

        // Generate artwork for each panel
        this.generateArtworkForPanels(pokemonName, lorePanels);

        // Store the generated lore
        this.storage
          .storeGeneratedContent({
            speciesId: species.id,
            type: 'lore',
            content: lorePanels,
          })
          .catch((error) => console.error('Failed to store lore:', error));
      }
    }
  }

  /**
   * Add generated lore to history
   */
  addToLoreHistory(pokemonName, lorePanels) {
    const historyEntry = {
      pokemonName,
      lorePanels,
      generatedAt: new Date().toISOString(),
      id: Date.now(),
    };

    this.loreHistory.unshift(historyEntry);

    // Limit history size
    if (this.loreHistory.length > this.maxHistorySize) {
      this.loreHistory = this.loreHistory.slice(0, this.maxHistorySize);
    }

    // Update history UI
    this.updateLoreHistoryUI();
  }

  /**
   * Update lore history UI
   */
  updateLoreHistoryUI() {
    const historyContainer = document.getElementById('lore-history');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';

    if (this.loreHistory.length === 0) {
      historyContainer.innerHTML =
        '<p>No lore history yet. Generate some lore to see it here!</p>';
      return;
    }

    const historyList = document.createElement('div');
    historyList.className = 'lore-history-list';

    this.loreHistory.forEach((entry) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'lore-history-item';

      const date = new Date(entry.generatedAt).toLocaleString();
      const preview =
        entry.lorePanels.length > 0
          ? `${entry.lorePanels[0].title}: ${entry.lorePanels[0].body.substring(0, 100)}...`
          : 'No content';

      historyItem.innerHTML = `
        <h5>${entry.pokemonName}</h5>
        <small>${date}</small>
        <p>${preview}</p>
        <button class="btn btn-secondary btn-sm" onclick="pokedexApp.loadFromHistory(${entry.id})">
          Load
        </button>
      `;

      historyList.appendChild(historyItem);
    });

    historyContainer.appendChild(historyList);
  }

  /**
   * Load lore from history
   */
  loadFromHistory(historyId) {
    const historyEntry = this.loreHistory.find(
      (entry) => entry.id === historyId
    );
    if (!historyEntry) return;

    // Find the current species entry and load the historical lore
    const species = this.speciesData.find(
      (s) => s.name === historyEntry.pokemonName
    );
    if (species) {
      this.renderLorePanels(species.id, historyEntry.lorePanels);
    }
  }

  /**
   * Generate artwork for all lore panels
   */
  async generateArtworkForPanels(pokemonName, lorePanels) {
    if (!this.websdReady || !Array.isArray(lorePanels)) {
      console.log('WebSD not ready or no panels to generate artwork for');
      return;
    }

    console.log(`Generating artwork for ${lorePanels.length} panels...`);

    for (const panel of lorePanels) {
      try {
        // Mark panel as generating artwork
        const panelElement = document.querySelector(
          `.lore-panel[data-panel="${panel.panelNumber}"]`
        );
        if (panelElement) {
          panelElement.classList.add('generating-artwork');
          this.animations.showGenerationProgress(
            panelElement,
            'Preparing artwork...'
          );
        }

        // Send artwork generation request to WebSD worker
        this.websdWorker.postMessage({
          type: 'generate-artwork',
          data: {
            pokemonName,
            lorePanel: panel,
          },
        });

        // Small delay between panel generations
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `Failed to generate artwork for panel ${panel.panelNumber}:`,
          error
        );
      }
    }
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(error) {
    console.error('WebLLM generation failed:', error);

    // Show error in UI
    const generatingElements = document.querySelectorAll('.generating-lore');
    generatingElements.forEach((element) => {
      const statusText = element.querySelector('.generation-status');
      if (statusText) {
        statusText.textContent =
          'Generation failed - check console for details';
        statusText.style.color = '#ff6b6b';
      }
    });
  }

  setupTidbitEventListeners() {
    window.addEventListener('tidbits:updated', async (event) => {
      const detail = event.detail;
      if (!detail || !detail.speciesId) {
        return;
      }

      this.pendingUpdates.add(detail.speciesId);
      await this.enqueueLoreGeneration(detail.speciesId, {
        reason: 'tidbits-updated',
      });
    });

    window.addEventListener('tidbits:sync-complete', async (event) => {
      const detail = event.detail;
      if (!detail) {
        return;
      }

      const updatedSpecies = detail.synced || [];
      for (const speciesId of updatedSpecies) {
        this.pendingUpdates.add(speciesId);
        await this.enqueueLoreGeneration(speciesId, {
          reason: 'sync-complete',
        });
      }

      const removedSpecies = detail.removed || [];
      for (const speciesId of removedSpecies) {
        this.pendingUpdates.delete(speciesId);
        await this.storage.deleteTidbitRecord(speciesId);
      }
    });
  }

  async enqueueLoreGeneration(speciesId, metadata = {}) {
    if (!speciesId) {
      return;
    }

    const alreadyQueued = this.loreGenerationQueue.some(
      (task) => task.speciesId === speciesId
    );
    const isActive = this.pendingUpdates.has(speciesId);

    if (!alreadyQueued && !isActive) {
      this.loreGenerationQueue.push({ speciesId, metadata });
    }

    this.pendingUpdates.add(speciesId);
    await this.processLoreQueue();
  }

  async processLoreQueue() {
    if (
      this.activeLoreGenerations >= MAX_PARALLEL_GENERATIONS ||
      this.loreGenerationQueue.length === 0
    ) {
      return;
    }

    const nextTask = this.loreGenerationQueue.shift();
    if (!nextTask) {
      return;
    }

    this.activeLoreGenerations += 1;

    try {
      await this.generateLore(Number(nextTask.speciesId));
    } catch (error) {
      console.error('Auto lore generation failed', {
        speciesId: nextTask.speciesId,
        error,
      });
    } finally {
      this.pendingUpdates.delete(nextTask.speciesId);
      this.activeLoreGenerations -= 1;
      if (this.loreGenerationQueue.length > 0) {
        await this.processLoreQueue();
      }
    }
  }

  /**
   * Load species data into the application
   * @param {Array} speciesData - Array of species objects
   */
  loadSpeciesData(speciesData) {
    this.speciesData = speciesData;
    this.filteredSpecies = [...speciesData];
    this.renderSpeciesList();
  }

  /**
   * Render the species list
   */
  renderSpeciesList() {
    const speciesList = document.getElementById('species-list');
    if (!speciesList) return;

    // Clear existing content
    speciesList.innerHTML = '';

    if (this.filteredSpecies.length === 0) {
      this.renderEmptyState(speciesList);
      return;
    }

    // Create species cards
    const fragment = document.createDocumentFragment();

    this.filteredSpecies.forEach((species) => {
      const card = this.createSpeciesCard(species);
      fragment.appendChild(card);
    });

    speciesList.appendChild(fragment);

    // Animate cards in
    const cards = speciesList.querySelectorAll('.pokemon-card');
    this.animations.stagger(cards, 'fadeIn', 50);
  }

  /**
   * Create a species card element
   * @param {Object} species - Species data
   * @returns {HTMLElement} Species card element
   */
  createSpeciesCard(species) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.dataset.speciesId = species.id;

    const isFavorited = this.favorites.has(species.id);

    card.innerHTML = `
      <div class="pokemon-card-header">
        <span class="pokemon-number">#${species.number}</span>
        <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" 
                data-species-id="${species.id}"
                aria-label="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
          <span class="favorite-icon">${isFavorited ? '❤️' : '🤍'}</span>
        </button>
      </div>
      <h3 class="pokemon-name">${species.name}</h3>
      <div class="pokemon-types">
        ${species.types
          .map((type) => `<span class="type-badge type-${type}">${type}</span>`)
          .join('')}
      </div>
      <p class="pokemon-description">${species.description}</p>
    `;

    return card;
  }

  /**
   * Render empty state when no species match
   */
  renderEmptyState(container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No Pokémon found</h3>
        <p>Try adjusting your search terms</p>
      </div>
    `;
  }

  /**
   * Search species by name
   * @param {string} query - Search query
   */
  searchSpecies(query) {
    this.currentSearchQuery = query.toLowerCase();

    if (!query.trim()) {
      this.filteredSpecies = [...this.speciesData];
    } else {
      this.filteredSpecies = this.speciesData.filter((species) =>
        species.name.toLowerCase().includes(this.currentSearchQuery)
      );
    }

    this.renderSpeciesList();
  }

  /**
   * Open species entry modal
   * @param {number} speciesId - Species ID to open
   */
  async openSpeciesEntry(speciesId) {
    try {
      const species = this.speciesData.find((s) => s.id === speciesId);
      if (!species) return;

      const modal = document.getElementById('pokemon-modal');
      const entry = document.getElementById('pokemon-entry');

      if (!modal || !entry) return;

      // Show modal
      modal.style.display = 'flex';
      this.animations.fadeIn(modal);

      // Load species data
      await this.loadSpeciesEntry(species, entry);
    } catch (error) {
      console.error('Failed to open species entry:', error);
    }
  }

  /**
   * Load species entry content
   * @param {Object} species - Species data
   * @param {HTMLElement} container - Container to render in
   */
  async loadSpeciesEntry(species, container) {
    container.innerHTML = `
      <div class="species-entry">
        <div class="species-header">
          <div class="species-info">
            <span class="species-number">#${species.number}</span>
            <h2 class="species-name">${species.name}</h2>
            <div class="species-types">
              ${species.types
                .map(
                  (type) =>
                    `<span class="type-badge type-${type}">${type}</span>`
                )
                .join('')}
            </div>
          </div>
          <button class="favorite-btn ${this.favorites.has(species.id) ? 'favorited' : ''}" 
                  data-species-id="${species.id}">
            <span class="favorite-icon">${this.favorites.has(species.id) ? '❤️' : '🤍'}</span>
          </button>
        </div>
        
        <div class="species-content">
          <div class="species-description">
            <h3>Description</h3>
            <p>${species.description}</p>
          </div>
          
          <div class="lore-section">
            <h3>AI-Generated Lore</h3>
            <div class="lore-panel" id="lore-panel-${species.id}">
              <button class="generate-lore-btn" data-species-id="${species.id}">
                Generate Lore
              </button>
            </div>
          </div>
          
          <div class="artwork-section">
            <h3>AI-Generated Artwork</h3>
            <div class="artwork-panel" id="artwork-panel-${species.id}">
              <button class="generate-artwork-btn" data-species-id="${species.id}">
                Generate Artwork
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Set up event listeners for the entry
    this.setupEntryEventListeners(species.id);

    // Load existing generated content
    window.dispatchEvent(
      new CustomEvent('lore:view-opened', {
        detail: {
          speciesId: String(species.id),
        },
      })
    );

    await this.loadGeneratedContent(species.id);
  }

  /**
   * Set up event listeners for species entry
   * @param {number} speciesId - Species ID
   */
  setupEntryEventListeners(speciesId) {
    // Generate lore button
    const loreBtn = document.querySelector(
      `[data-species-id="${speciesId}"].generate-lore-btn`
    );
    if (loreBtn) {
      loreBtn.addEventListener('click', () => {
        this.generateLore(speciesId);
      });
    }

    // Generate artwork button
    const artworkBtn = document.querySelector(
      `[data-species-id="${speciesId}"].generate-artwork-btn`
    );
    if (artworkBtn) {
      artworkBtn.addEventListener('click', () => {
        this.generateArtwork(speciesId);
      });
    }
  }

  /**
   * Toggle favorite status for species
   * @param {number} speciesId - Species ID to toggle
   */
  async toggleFavorite(speciesId) {
    try {
      const isFavorited = this.favorites.has(speciesId);

      if (isFavorited) {
        await this.storage.removeFromFavorites(speciesId);
        this.favorites.delete(speciesId);
      } else {
        await this.storage.addToFavorites(speciesId);
        this.favorites.add(speciesId);
      }

      // Update UI
      this.updateFavoriteButtons(speciesId, !isFavorited);

      // Animate the change
      const favoriteBtn = document.querySelector(
        `[data-species-id="${speciesId}"].favorite-btn`
      );
      if (favoriteBtn) {
        this.animations.bounce(favoriteBtn);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }

  /**
   * Update favorite buttons in UI
   * @param {number} speciesId - Species ID
   * @param {boolean} isFavorited - Whether species is favorited
   */
  updateFavoriteButtons(speciesId, isFavorited) {
    const buttons = document.querySelectorAll(
      `[data-species-id="${speciesId}"].favorite-btn`
    );

    buttons.forEach((btn) => {
      const icon = btn.querySelector('.favorite-icon');
      if (icon) {
        icon.textContent = isFavorited ? '❤️' : '🤍';
      }

      if (isFavorited) {
        btn.classList.add('favorited');
      } else {
        btn.classList.remove('favorited');
      }
    });
  }

  /**
   * Load favorites list
   */
  async loadFavoritesList() {
    const favoritesList = document.getElementById('favorites-list');
    if (!favoritesList) return;

    try {
      const favoriteIds = await this.storage.getFavorites();
      const favoriteSpecies = this.speciesData.filter((species) =>
        favoriteIds.includes(species.id)
      );

      if (favoriteSpecies.length === 0) {
        favoritesList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">❤️</div>
            <h3>No favorites yet</h3>
            <p>Add some Pokémon to your favorites!</p>
          </div>
        `;
        return;
      }

      // Render favorite species
      const fragment = document.createDocumentFragment();
      favoriteSpecies.forEach((species) => {
        const card = this.createSpeciesCard(species);
        fragment.appendChild(card);
      });

      favoritesList.innerHTML = '';
      favoritesList.appendChild(fragment);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }

  /**
   * Load settings
   */
  async loadSettings() {
    try {
      this.settings.aiQuality = await this.storage.getSetting(
        'aiQuality',
        'balanced'
      );
      this.settings.offlineMode = await this.storage.getSetting(
        'offlineMode',
        false
      );

      // Update UI
      const aiQualitySelect = document.getElementById('ai-quality');
      const offlineModeCheckbox = document.getElementById('offline-mode');

      if (aiQualitySelect) {
        aiQualitySelect.value = this.settings.aiQuality;
      }

      if (offlineModeCheckbox) {
        offlineModeCheckbox.checked = this.settings.offlineMode;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * Update a setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  async updateSetting(key, value) {
    try {
      this.settings[key] = value;
      await this.storage.setSetting(key, value);
      console.log(`Setting ${key} updated to:`, value);
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
    }
  }

  /**
   * Generate lore for species
   * @param {number} speciesId - Species ID
   */
  async generateLore(speciesId) {
    const lorePanel = document.getElementById(`lore-panel-${speciesId}`);
    if (!lorePanel) return;

    try {
      // Set generating state
      this.animations.setGeneratingState(lorePanel, true);

      const tidbitRecord = await this.storage.getTidbitRecord(
        String(speciesId).padStart(4, '0')
      );

      if (!tidbitRecord || !Array.isArray(tidbitRecord.tidbits)) {
        console.warn('No tidbits found for species', speciesId);
        this.animations.setGeneratingState(lorePanel, false);
        return;
      }

      // Ensure WebLLM worker is initialized
      if (!this.workerReady) {
        await this.initializeWebLLMWorker();
      }

      // Get species name for the worker
      const species = this.speciesData.find((s) => s.id === speciesId);
      const speciesName = species ? species.name : `Species ${speciesId}`;

      // Send generation request to worker
      this.webllmWorker.postMessage({
        type: 'generate-lore',
        data: {
          pokemonName: speciesName,
          tidbits: tidbitRecord.tidbits,
        },
      });

      // The worker will handle the rest and call handleLoreGenerated when done
    } catch (error) {
      console.error('Failed to generate lore:', error);
      this.animations.setGeneratingState(lorePanel, false);
      this.animations.animateError(lorePanel);
    }
  }

  /**
   * Generate artwork for species
   * @param {number} speciesId - Species ID
   */
  async generateArtwork(speciesId) {
    const artworkPanel = document.getElementById(`artwork-panel-${speciesId}`);
    if (!artworkPanel) return;

    try {
      // Set generating state
      this.animations.setGeneratingState(artworkPanel, true);

      // This would integrate with WebSD in a real implementation
      // For now, we'll simulate the generation
      await this.simulateArtworkGeneration(speciesId);

      // Remove generating state
      this.animations.setGeneratingState(artworkPanel, false);
    } catch (error) {
      console.error('Failed to generate artwork:', error);
      this.animations.setGeneratingState(artworkPanel, false);
      this.animations.animateError(artworkPanel);
    }
  }

  /**
   * Simulate lore generation (placeholder)
   * @param {number} speciesId - Species ID
   */
  async simulateLoreGeneration(speciesId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const species = this.speciesData.find((s) => s.id === speciesId);
        const lorePanel = document.getElementById(`lore-panel-${speciesId}`);

        if (lorePanel && species) {
          const lore = `Deep within the forests of Kanto, ${species.name} is said to possess ancient wisdom passed down through generations. Legends speak of its connection to the natural world and its ability to communicate with other Pokémon through mysterious means.`;

          lorePanel.innerHTML = `
            <div class="generated-lore">
              <p>${lore}</p>
              <button class="regenerate-btn" data-species-id="${speciesId}">
                Regenerate
              </button>
            </div>
          `;

          // Store generated content
          this.storage.storeGeneratedContent({
            speciesId: speciesId,
            type: 'lore',
            content: lore,
          });
        }

        resolve();
      }, 2000); // Simulate 2-second generation time
    });
  }

  /**
   * Simulate artwork generation (placeholder)
   * @param {number} speciesId - Species ID
   */
  async simulateArtworkGeneration(speciesId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const species = this.speciesData.find((s) => s.id === speciesId);
        const artworkPanel = document.getElementById(
          `artwork-panel-${speciesId}`
        );

        if (artworkPanel && species) {
          const artworkUrl = `/assets/artwork/${species.name.toLowerCase()}.jpg`;

          artworkPanel.innerHTML = `
            <div class="generated-artwork">
              <img src="${artworkUrl}" alt="${species.name} artwork" class="artwork-image">
              <button class="regenerate-btn" data-species-id="${speciesId}">
                Regenerate
              </button>
            </div>
          `;

          // Store generated content
          this.storage.storeGeneratedContent({
            speciesId: speciesId,
            type: 'artwork',
            content: artworkUrl,
          });
        }

        resolve();
      }, 3000); // Simulate 3-second generation time
    });
  }

  /**
   * Load existing generated content for species
   * @param {number} speciesId - Species ID
   */
  async loadGeneratedContent(speciesId) {
    try {
      const loreContent = await this.storage.getGeneratedContent(
        speciesId,
        'lore'
      );
      const artworkContent = await this.storage.getGeneratedContent(
        speciesId,
        'artwork'
      );

      // Load lore if exists
      if (loreContent.length > 0) {
        const lorePanel = document.getElementById(`lore-panel-${speciesId}`);
        if (lorePanel) {
          const latestLore = loreContent[0];
          lorePanel.innerHTML = `
            <div class="generated-lore">
              <p>${latestLore.content}</p>
              <button class="regenerate-btn" data-species-id="${speciesId}">
                Regenerate
              </button>
            </div>
          `;
        }
      }

      // Load artwork if exists
      if (artworkContent.length > 0) {
        const artworkPanel = document.getElementById(
          `artwork-panel-${speciesId}`
        );
        if (artworkPanel) {
          const latestArtwork = artworkContent[0];
          artworkPanel.innerHTML = `
            <div class="generated-artwork">
              <img src="${latestArtwork.content}" alt="Generated artwork" class="artwork-image">
              <button class="regenerate-btn" data-species-id="${speciesId}">
                Regenerate
              </button>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Failed to load generated content:', error);
    }
  }

  /**
   * Render lore panels to DOM
   * @param {number} speciesId - Species ID
   * @param {Array} lorePanels - Array of lore panel objects
   */
  renderLorePanels(speciesId, lorePanels) {
    const lorePanel = document.getElementById(`lore-panel-${speciesId}`);
    if (!lorePanel) return;

    if (!Array.isArray(lorePanels) || lorePanels.length === 0) {
      lorePanel.innerHTML = '<p>No lore available</p>';
      this.animations.setGeneratingState(lorePanel, false);
      return;
    }

    const panelsHtml = lorePanels
      .map(
        (panel) => `
      <div class="lore-panel" data-panel="${panel.panelNumber}">
        <h4>${panel.title}</h4>
        <p>${panel.body}</p>
      </div>
    `
      )
      .join('');

    lorePanel.innerHTML = `
      <div class="generated-lore-panels">
        ${panelsHtml}
        <div class="lore-actions">
          <button class="regenerate-lore-btn" data-species-id="${speciesId}">Regenerate Lore</button>
        </div>
      </div>
    `;

    // Set generating state to false
    this.animations.setGeneratingState(lorePanel, false);
  }
}
