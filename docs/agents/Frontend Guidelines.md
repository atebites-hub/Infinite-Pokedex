# Infinite Pokédex — Frontend Guidelines

This document defines the design system, coding standards, and animation patterns for the Infinite Pokédex PWA. We use vanilla HTML/CSS/JS to keep the bundle minimal and ensure smooth Gen 9 Pokédex animations.

## Design Philosophy
The UI emulates the Generation 9 Pokédex (Rotom Phone) with a modern, mobile‑first approach. Animations should feel snappy and game‑like, similar to Scarlet/Violet's Pokédex transitions. We prioritize performance over complexity, using CSS animations and transforms over heavy JavaScript libraries.

## Technology Stack
- **Core**: Vanilla HTML5, CSS3, JavaScript (ES2020+)
- **PWA**: Web App Manifest, Service Worker, IndexedDB
- **AI**: WebLLM (Qwen3‑small), Web Stable Diffusion
- **Build**: Simple bundler (Vite or esbuild) for minification and asset optimization
- **No frameworks**: Keep dependencies minimal for faster loading and better mobile performance

## Color Palette (Gen 9 Rotom Theme)
```css
:root {
  /* Primary Rotom Colors */
  --rotom-blue: #4A90E2;
  --rotom-cyan: #7ED4E6;
  --rotom-purple: #8B5CF6;
  --rotom-pink: #EC4899;
  
  /* Backgrounds */
  --bg-primary: #0F172A;      /* Dark slate */
  --bg-secondary: #1E293B;   /* Lighter slate */
  --bg-card: #334155;         /* Card background */
  
  /* Text */
  --text-primary: #F8FAFC;    /* White */
  --text-secondary: #CBD5E1; /* Light gray */
  --text-muted: #94A3B8;     /* Muted gray */
  
  /* Accents */
  --accent-gold: #F59E0B;     /* Type badges */
  --accent-green: #10B981;    /* Success states */
  --accent-red: #EF4444;       /* Error states */
  
  /* Gradients */
  --gradient-rotom: linear-gradient(135deg, var(--rotom-blue), var(--rotom-purple));
  --gradient-card: linear-gradient(145deg, var(--bg-card), var(--bg-secondary));
}
```

## Typography
```css
/* Primary Font - Game-like UI */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* Fallback for system fonts */
@font-face {
  font-family: 'GameUI';
  src: local('SF Pro Display'), local('Segoe UI'), local('Roboto');
  font-weight: 300 700;
}

/* Usage */
.pokedex-text {
  font-family: 'Inter', 'GameUI', system-ui, sans-serif;
  font-weight: 500;
  line-height: 1.4;
}

.pokedex-title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.pokedex-body {
  font-size: clamp(0.875rem, 2.5vw, 1.125rem);
  font-weight: 400;
}
```

## Layout & Spacing
```css
/* Mobile-first responsive design */
.pokedex-container {
  width: 100vw;
  height: 100vh;
  max-width: 480px; /* Rotom phone width */
  margin: 0 auto;
  background: var(--bg-primary);
  overflow: hidden;
}

/* Spacing scale (8px base) */
:root {
  --space-xs: 0.25rem;  /* 4px */
  --space-sm: 0.5rem;  /* 8px */
  --space-md: 1rem;    /* 16px */
  --space-lg: 1.5rem;   /* 24px */
  --space-xl: 2rem;     /* 32px */
  --space-2xl: 3rem;    /* 48px */
}
```

## Gen 9 Pokédex Animations
We recreate the smooth, game‑like transitions from Scarlet/Violet using CSS animations and transforms.

### Entry Transition Animation
```css
/* Pokédex entry slide-in (like opening a Pokédex entry) */
.pokedex-entry {
  transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.pokedex-entry.open {
  transform: translateX(0);
}

/* Staggered content reveal */
.entry-content > * {
  opacity: 0;
  transform: translateY(20px);
  animation: revealContent 0.6s ease-out forwards;
}

.entry-content > *:nth-child(1) { animation-delay: 0.1s; }
.entry-content > *:nth-child(2) { animation-delay: 0.2s; }
.entry-content > *:nth-child(3) { animation-delay: 0.3s; }

@keyframes revealContent {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Rotom Phone UI Animations
```css
/* Home screen card hover effects */
.pokemon-card {
  transform: scale(1);
  transition: all 0.2s ease-out;
  cursor: pointer;
}

.pokemon-card:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(74, 144, 226, 0.3);
}

.pokemon-card:active {
  transform: scale(0.98);
}

/* Loading states with Rotom-style pulse */
.loading-rotom {
  animation: rotomPulse 1.5s ease-in-out infinite;
}

@keyframes rotomPulse {
  0%, 100% { 
    transform: scale(1);
    filter: brightness(1);
  }
  50% { 
    transform: scale(1.05);
    filter: brightness(1.2);
  }
}
```

### Lore Generation Animation
```css
/* Lore panel generation (like typing effect) */
.lore-panel {
  opacity: 0;
  transform: translateY(10px);
  animation: loreReveal 0.8s ease-out forwards;
}

.lore-panel.generating {
  background: linear-gradient(90deg, 
    var(--bg-card) 25%, 
    var(--rotom-cyan) 50%, 
    var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

## Component Architecture
```javascript
// Simple component pattern (no framework needed)
class PokedexEntry {
  constructor(speciesId) {
    this.speciesId = speciesId;
    this.element = this.createElement();
  }
  
  createElement() {
    const entry = document.createElement('div');
    entry.className = 'pokedex-entry';
    entry.innerHTML = this.getTemplate();
    return entry;
  }
  
  async loadData() {
    // Load from IndexedDB
    const data = await this.getSpeciesData(this.speciesId);
    this.render(data);
  }
  
  async generateLore() {
    // WebLLM generation
    this.element.classList.add('generating');
    const lore = await this.runWebLLM();
    this.renderLore(lore);
    this.element.classList.remove('generating');
  }
}
```

## Responsive Design
```css
/* Mobile-first breakpoints */
@media (max-width: 375px) {
  .pokedex-container {
    font-size: 14px;
  }
}

@media (min-width: 768px) {
  .pokedex-container {
    max-width: 600px;
    border-radius: 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }
}

/* Tablet landscape */
@media (min-width: 1024px) and (orientation: landscape) {
  .pokedex-container {
    max-width: 800px;
    height: 90vh;
  }
}
```

## Performance Optimizations
```css
/* Hardware acceleration for animations */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU layer */
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Optimize images */
.pokemon-sprite {
  image-rendering: pixelated; /* For pixel art */
  image-rendering: -webkit-optimize-contrast;
}
```

## Accessibility Standards
```css
/* Focus states for keyboard navigation */
.pokemon-card:focus {
  outline: 2px solid var(--rotom-cyan);
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --text-primary: #FFFFFF;
    --bg-primary: #000000;
  }
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## File Organization
```
/source/client/
├── index.html              # Main entry point
├── css/
│   ├── main.css           # Core styles
│   ├── animations.css     # Gen 9 animations
│   └── components.css     # Component styles
├── js/
│   ├── main.js            # App initialization
│   ├── pokedex.js         # Core Pokédex logic
│   ├── animations.js      # Animation helpers
│   └── workers/
│       ├── webllm-worker.js
│       └── websd-worker.js
├── assets/
│   ├── icons/             # PWA icons
│   └── sprites/           # Pokémon sprites
└── sw.js                  # Service Worker
```

## Animation Performance Tips
- Use `transform` and `opacity` for smooth 60fps animations
- Avoid animating `width`, `height`, or layout properties
- Use `will-change` sparingly and remove after animation
- Prefer CSS animations over JavaScript for simple transitions
- Use `requestAnimationFrame` for complex animations

## Browser Support
- **Primary**: Chrome Android, Safari iOS/macOS (PWA support)
- **Features**: Service Workers, IndexedDB, CSS Grid, CSS Custom Properties
- **Fallbacks**: Graceful degradation for older browsers
- **Testing**: Real device testing on mid‑range Android and iPhone

Assumptions: Modern mobile browsers with good CSS animation support. Known Issues: Some older iOS versions may have Service Worker limitations; we provide fallbacks.
