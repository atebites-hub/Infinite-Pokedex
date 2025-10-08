# Infinite Pokédex - Client Code Documentation

## Overview

The client-side code for Infinite Pokédex is a Progressive Web App (PWA) built with vanilla HTML, CSS, and JavaScript. It provides a Gen 9 Pokédex experience with AI-powered lore generation and artwork creation.

## Architecture

### Core Components

- **App** (`main.js`): Main application controller and initialization
- **PokedexApp** (`pokedex.js`): Core Pokédex logic and species management
- **StorageManager** (`storage.js`): IndexedDB wrapper for data persistence
- **AnimationManager** (`animations.js`): Animation system for Gen 9 Pokédex feel

### File Structure

```
/source/client/
├── index.html              # Main entry point with PWA manifest
├── manifest.json           # PWA manifest for installation
├── sw.js                   # Service Worker for offline caching
├── css/                    # Stylesheets
│   ├── main.css           # Core styles and Gen 9 theme
│   ├── animations.css     # Gen 9 Pokédex animations
│   ├── components.css     # Reusable component styles
│   └── responsive.css     # Mobile-first responsive design
├── js/                     # JavaScript modules
│   ├── main.js            # App initialization and routing
│   ├── pokedex.js         # Core Pokédex logic
│   ├── storage.js          # IndexedDB wrapper
│   └── animations.js       # Animation helpers
└── assets/                 # Static assets
    └── icons/             # PWA icons
```

## Key Features

### PWA Functionality

- **Service Worker**: Offline caching and background sync
- **Web App Manifest**: Mobile installation support
- **IndexedDB**: Client-side data persistence
- **Responsive Design**: Mobile-first approach

### Gen 9 Pokédex UI

- **Rotom Theme**: Blue/cyan color scheme with gradients
- **Smooth Animations**: Game-like transitions and effects
- **Mobile-First**: Optimized for mobile devices
- **Accessibility**: Keyboard navigation and screen reader support

### Data Management

- **Species Data**: Pokémon information and metadata
- **Favorites**: User's favorite Pokémon
- **Generated Content**: AI-generated lore and artwork
- **Settings**: User preferences and app configuration

## Usage

### Initialization

```javascript
// App automatically initializes when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
```

### Species Management

```javascript
// Load species data
app.pokedex.loadSpeciesData(speciesData);

// Search species
app.pokedex.searchSpecies('bulbasaur');

// Open species entry
app.pokedex.openSpeciesEntry(speciesId);
```

### Storage Operations

```javascript
// Store species data
await app.storage.storeSpeciesData(speciesData);

// Get species data
const species = await app.storage.getSpeciesData();

// Add to favorites
await app.storage.addToFavorites(speciesId);
```

### Animations

```javascript
// Fade in element
await app.animations.fadeIn(element);

// Slide in from direction
await app.animations.slideIn(element, 'left');

// Stagger multiple elements
await app.animations.stagger(elements, 'fadeIn', 100);
```

## Browser Support

- **Primary**: Chrome Android, Safari iOS/macOS
- **Features**: Service Workers, IndexedDB, CSS Grid, CSS Custom Properties
- **Fallbacks**: Graceful degradation for older browsers

## Performance Considerations

- **Bundle Size**: Minimal dependencies for fast loading
- **Animations**: Hardware-accelerated CSS animations
- **Caching**: Aggressive caching with Service Worker
- **Memory**: Efficient IndexedDB usage

## Development

- **Build Tool**: Vite for fast development and building
- **Linting**: ESLint for code quality
- **Formatting**: Prettier for consistent code style
- **Testing**: Jest for unit tests (configuration pending)

## Deployment

- **Static Hosting**: Deploy to any static hosting service
- **CDN**: Assets served from CDN for performance
- **PWA**: Full Progressive Web App capabilities
