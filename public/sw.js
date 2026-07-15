const CACHE_NAME = 'gaole-helper-cache-v1';

// Active assets to cache immediately
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Install Event - Pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Force active immediately
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of pages immediately
});

// Fetch Event - Stale-While-Revalidate caching strategy
// Serves cache immediately for speed, fetches update in background
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip caching for Google Sheet API redirects or external Apps Script posts
  const url = event.request.url;
  if (url.includes('script.google.com') || url.includes('script.googleusercontent.com')) {
    // Network-only for cloud sync API requests
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If valid response, clone it and put in cache
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          console.log('[Service Worker] Fetch failed (possibly offline):', err);
          // If network fails, return cached response if available
        });

        // Return cached response immediately if exists, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
