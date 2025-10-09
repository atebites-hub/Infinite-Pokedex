// Infinite Pokédex - Main Application
// Core app initialization and routing

import { PokedexApp } from './pokedex.js';
import { StorageManager } from './storage.js';
import { AnimationManager } from './animations.js';
import { cdnSync } from './sync.js';

class App {
  constructor() {
    this.pokedex = null;
    this.storage = null;
    this.animations = null;
    this.currentView = 'species';
    this.isLoading = true;

    this.init();
  }

  /**
   * Initialize the application
   * Sets up all core systems and starts the app
   */
  async init() {
    try {
      console.log('Infinite Pokédex: Initializing...');

      // Initialize core systems
      this.storage = new StorageManager();
      this.animations = new AnimationManager();
      this.pokedex = new PokedexApp(this.storage, this.animations);

      // Register service worker
      await this.registerServiceWorker();

      // Set up event listeners
      this.setupEventListeners();

      // Initialize PWA features
      await this.initializePWA();

      // Load initial data
      await this.loadInitialData();

      // Hide loading screen and show main app
      this.showMainApp();

      console.log('Infinite Pokédex: Initialized successfully');
    } catch (error) {
      console.error('Infinite Pokédex: Initialization failed', error);
      this.showError('Failed to initialize the app. Please refresh the page.');
    }
  }

  /**
   * Register service worker for PWA functionality
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              this.showUpdateNotification();
            }
          });
        });
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }

    // Sync button
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        this.handleSync();
      });
    }

    // Modal close
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Modal overlay click
    const modal = document.getElementById('pokemon-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e);
    });

    // Online/offline status
    window.addEventListener('online', () => {
      this.handleOnlineStatus(true);
    });

    window.addEventListener('offline', () => {
      this.handleOnlineStatus(false);
    });

    // App visibility changes
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
  }

  /**
   * Initialize PWA features
   */
  async initializePWA() {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is running in standalone mode');
    }

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('App was installed');
      this.hideInstallPrompt();
    });
  }

  /**
   * Load initial data from storage or CDN
   */
  async loadInitialData() {
    try {
      // Check if we have cached data
      const cachedData = await this.storage.getCachedData();

      if (cachedData && cachedData.length > 0) {
        console.log('Loading cached data:', cachedData.length, 'species');
        this.pokedex.loadSpeciesData(cachedData);
      } else {
        console.log('No cached data found, loading from CDN...');
        await this.loadFromCDN();
      }

      await cdnSync.initialize();
      await cdnSync.syncAll();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.showError(
        'Failed to load Pokémon data. Please check your connection.'
      );
    }
  }

  /**
   * Load data from CDN
   */
  async loadFromCDN() {
    try {
      // This would fetch from the CDN in a real implementation
      // For now, we'll use mock data
      const mockData = this.generateMockData();
      await this.storage.cacheData(mockData);
      this.pokedex.loadSpeciesData(mockData);
    } catch (error) {
      console.error('Failed to load from CDN:', error);
      throw error;
    }
  }

  /**
   * Generate mock data for development
   */
  generateMockData() {
    const mockSpecies = [
      {
        id: 1,
        name: 'Bulbasaur',
        number: '001',
        types: ['grass', 'poison'],
        description:
          'A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.',
        sprite: '/assets/sprites/bulbasaur.png',
        artwork: '/assets/artwork/bulbasaur.jpg',
      },
      {
        id: 2,
        name: 'Ivysaur',
        number: '002',
        types: ['grass', 'poison'],
        description:
          'When the bulb on its back grows large, it appears to lose the ability to stand on its hind legs.',
        sprite: '/assets/sprites/ivysaur.png',
        artwork: '/assets/artwork/ivysaur.jpg',
      },
      {
        id: 3,
        name: 'Venusaur',
        number: '003',
        types: ['grass', 'poison'],
        description:
          'The flower on its back releases a soothing scent that enraptures those nearby.',
        sprite: '/assets/sprites/venusaur.png',
        artwork: '/assets/artwork/venusaur.jpg',
      },
    ];

    return mockSpecies;
  }

  /**
   * Show the main app and hide loading screen
   */
  showMainApp() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainApp = document.getElementById('main-app');

    if (loadingScreen && mainApp) {
      loadingScreen.style.display = 'none';
      mainApp.style.display = 'block';

      // Trigger entrance animation
      this.animations.fadeIn(mainApp);
    }

    this.isLoading = false;
  }

  /**
   * Switch between different views
   */
  switchView(viewName) {
    if (this.currentView === viewName) return;

    // Update navigation
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.remove('active');
    });

    const activeNavItem = document.querySelector(`[data-view="${viewName}"]`);
    if (activeNavItem) {
      activeNavItem.classList.add('active');
    }

    // Hide current view
    const currentView = document.querySelector('.view-content.active');
    if (currentView) {
      this.animations.slideOut(currentView, 'right');
    }

    // Show new view
    const newView = document.getElementById(`${viewName}-view`);
    if (newView) {
      newView.classList.add('active');
      this.animations.slideIn(newView, 'left');
    }

    this.currentView = viewName;

    // Load view-specific data
    this.loadViewData(viewName);
  }

  /**
   * Load data for specific view
   */
  loadViewData(viewName) {
    switch (viewName) {
      case 'species':
        this.pokedex.loadSpeciesList();
        break;
      case 'favorites':
        this.pokedex.loadFavoritesList();
        break;
      case 'settings':
        this.pokedex.loadSettings();
        break;
    }
  }

  /**
   * Handle search input
   */
  handleSearch(query) {
    if (this.pokedex) {
      this.pokedex.searchSpecies(query);
    }
  }

  /**
   * Handle sync button click
   */
  async handleSync() {
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
      syncBtn.classList.add('syncing');
      syncBtn.disabled = true;
    }

    try {
      await this.loadFromCDN();
      this.showToast('Data synced successfully!', 'success');
    } catch (error) {
      console.error('Sync failed:', error);
      this.showToast('Sync failed. Please try again.', 'error');
    } finally {
      if (syncBtn) {
        syncBtn.classList.remove('syncing');
        syncBtn.disabled = false;
      }
    }
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboardNavigation(e) {
    // Escape key closes modal
    if (e.key === 'Escape') {
      this.closeModal();
    }

    // Tab navigation for accessibility
    if (e.key === 'Tab') {
      // Ensure focus is visible
      document.body.classList.add('keyboard-navigation');
    }
  }

  /**
   * Handle online/offline status
   */
  handleOnlineStatus(isOnline) {
    if (isOnline) {
      this.showToast('Connection restored', 'success');
    } else {
      this.showToast('You are offline', 'warning');
    }
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // App is hidden, pause animations
      this.animations.pauseAnimations();
    } else {
      // App is visible, resume animations
      this.animations.resumeAnimations();
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showToast(message, 'error');
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  /**
   * Show update notification
   */
  showUpdateNotification() {
    this.showToast('New version available! Refresh to update.', 'info');
  }

  /**
   * Show install prompt
   */
  showInstallPrompt() {
    // This would show a custom install prompt
    console.log('Install prompt available');
  }

  /**
   * Hide install prompt
   */
  hideInstallPrompt() {
    // This would hide the install prompt
    console.log('Install prompt hidden');
  }

  /**
   * Close modal
   */
  closeModal() {
    const modal = document.getElementById('pokemon-modal');
    if (modal) {
      this.animations.fadeOut(modal);
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  // Expose PokedexApp instance globally for history buttons
  setTimeout(() => {
    if (window.app && window.app.pokedex) {
      window.pokedexApp = window.app.pokedex;
    }
  }, 100);
});

// Export for testing
export { App };
