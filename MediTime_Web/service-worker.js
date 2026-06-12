const CACHE_NAME = 'meditime-v5';

const PRECACHE_URLS = [
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'fonts/dm-sans-latin.woff2',
  'fonts/dm-sans-latin-ext.woff2',
  'assets/confirmacion.wav',
  'assets/error.wav',
  'assets/normal.wav',
  'assets/prealerta.wav',
  'assets/suave.wav',
  'assets/urgente.wav'
];

// ── Install: precache all listed assets ───────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(() => {
            // Asset may not exist yet; skip without aborting install
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: purge every cache whose name is not the current one ─────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first, fall back to network ──────────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests with http/https scheme
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(networkResponse => {
        // Cache valid same-origin responses and audio assets
        if (
          networkResponse.ok &&
          (url.origin === self.location.origin ||
            event.request.destination === 'audio')
        ) {
          const toCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigate requests: serve cached index.html
        if (event.request.destination === 'document') {
          return caches.match('index.html');
        }
      });
    })
  );
});
