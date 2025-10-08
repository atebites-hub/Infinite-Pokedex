// Infinite Pokédex - Core Pokédex Application
// Main application logic for species management and UI

import { StorageManager } from './storage.js';
import { AnimationManager } from './animations.js';

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

      // Set up event listeners
      this.setupEventListeners();

      console.log('Pokédex app initialized');
    } catch (error) {
      console.error('Failed to initialize Pokédex app:', error);
    }
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

      // This would integrate with WebLLM in a real implementation
      // For now, we'll simulate the generation
      await this.simulateLoreGeneration(speciesId);

      // Remove generating state
      this.animations.setGeneratingState(lorePanel, false);
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
}
