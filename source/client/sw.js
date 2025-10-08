// Infinite Pokédex Service Worker
// Handles offline caching and PWA functionality

const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `infinite-pokedex-v${CACHE_VERSION}`;
const STATIC_CACHE = `static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-v${CACHE_VERSION}`;
const CDN_CACHE = `cdn-v${CACHE_VERSION}`;
const IMAGE_CACHE = `images-v${CACHE_VERSION}`;

// Cache size limits (in MB)
const CACHE_LIMITS = {
  [DYNAMIC_CACHE]: 50,
  [CDN_CACHE]: 200,
  [IMAGE_CACHE]: 100,
};

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/css/main.css',
  '/css/animations.css',
  '/css/components.css',
  '/css/responsive.css',
  '/js/main.js',
  '/js/pokedex.js',
  '/js/storage.js',
  '/js/sync.js',
  '/js/logger.js',
  '/js/offline.js',
  '/js/version.js',
  '/js/animations.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/apple-touch-icon.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, CDN_CACHE, IMAGE_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Determine caching strategy based on request type
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isCDNRequest(url)) {
    event.respondWith(cacheFirst(request, CDN_CACHE));
  } else if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (url.origin === location.origin) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

/**
 * Cache-first strategy: Check cache, fallback to network
 * Best for static assets and CDN content
 * 
 * Pre: request is a valid Request object, cacheName is a string
 * Post: Returns Response from cache or network
 * @param {Request} request - The request to handle
 * @param {string} cacheName - The cache to use
 * @return {Promise<Response>} The response
 */
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`Service Worker: Serving from ${cacheName}`, request.url);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      await enforceCacheLimit(cacheName);
    }

    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Cache-first failed', error);
    
    // Try to return cached version as last resort
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for navigation
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || caches.match('/index.html');
    }

    throw error;
  }
}

/**
 * Network-first strategy: Try network, fallback to cache
 * Best for dynamic content that should be fresh
 * 
 * Pre: request is a valid Request object, cacheName is a string
 * Post: Returns Response from network or cache
 * @param {Request} request - The request to handle
 * @param {string} cacheName - The cache to use
 * @return {Promise<Response>} The response
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      await enforceCacheLimit(cacheName);
    }

    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Network-first failed, trying cache', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`Service Worker: Serving stale from ${cacheName}`, request.url);
      return cachedResponse;
    }

    // Return offline fallback for navigation
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || caches.match('/index.html');
    }

    throw error;
  }
}

// Background sync for data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');

    event.waitUntil(
      // Sync with CDN for latest data
      syncWithCDN()
        .then(() => {
          console.log('Service Worker: Background sync completed');
        })
        .catch((error) => {
          console.error('Service Worker: Background sync failed', error);
        })
    );
  }
});

// Push notifications for updates
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body || 'New Pokémon data available!',
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      tag: 'pokedex-update',
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Open Pokédex',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Infinite Pokédex',
        options
      )
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(clients.openWindow('/'));
  }
});

/**
 * Helper function to check if URL is a static asset
 * 
 * Pre: url is a valid URL object
 * Post: Returns boolean indicating if URL is a static asset
 * @param {URL} url - The URL to check
 * @return {boolean} True if static asset
 */
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.startsWith(asset));
}

/**
 * Helper function to check if URL is a CDN request
 * 
 * Pre: url is a valid URL object
 * Post: Returns boolean indicating if URL is a CDN request
 * @param {URL} url - The URL to check
 * @return {boolean} True if CDN request
 */
function isCDNRequest(url) {
  // Check for CDN domains (update with actual CDN URLs)
  const cdnDomains = [
    'cdn.infinitepokedex.com',
    'd1234567890.cloudfront.net',
    'pokedex-data.vercel-storage.com',
  ];
  
  return cdnDomains.some(domain => url.hostname.includes(domain)) ||
         url.pathname.includes('/data/') ||
         url.pathname.endsWith('.json');
}

/**
 * Helper function to check if URL is an image request
 * 
 * Pre: url is a valid URL object
 * Post: Returns boolean indicating if URL is an image request
 * @param {URL} url - The URL to check
 * @return {boolean} True if image request
 */
function isImageRequest(url) {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  return imageExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * Enforce cache size limits by removing oldest entries
 * 
 * Pre: cacheName is a valid cache name string
 * Post: Cache size is within limits
 * @param {string} cacheName - The cache to enforce limits on
 * @return {Promise<void>}
 */
async function enforceCacheLimit(cacheName) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;

  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    // Estimate cache size (rough estimate: 1 request = ~10KB)
    const estimatedSizeMB = (keys.length * 10) / 1024;
    
    if (estimatedSizeMB > limit) {
      // Remove oldest 20% of entries
      const toRemove = Math.floor(keys.length * 0.2);
      const keysToRemove = keys.slice(0, toRemove);
      
      await Promise.all(keysToRemove.map(key => cache.delete(key)));
      console.log(`Service Worker: Removed ${toRemove} entries from ${cacheName}`);
    }
  } catch (error) {
    console.error(`Service Worker: Failed to enforce cache limit for ${cacheName}`, error);
  }
}

/**
 * Helper function to sync with CDN
 * Checks for new dataset versions and downloads updates
 * 
 * Pre: Service worker is active
 * Post: IndexedDB is updated with latest data
 * @return {Promise<void>}
 */
async function syncWithCDN() {
  try {
    console.log('Service Worker: Syncing with CDN...');

    // Send message to all clients to trigger sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CDN_SYNC_START',
        timestamp: Date.now(),
      });
    });

    // The actual sync is handled by the CDNSync class in sync.js
    // Service worker just coordinates and caches the responses
    
    console.log('Service Worker: CDN sync initiated');
    return Promise.resolve();
  } catch (error) {
    console.error('Service Worker: CDN sync failed', error);
    throw error;
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker: Loaded');
