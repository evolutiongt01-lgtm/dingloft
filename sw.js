const CACHE = 'dingloft-app-v1';
const CORE = [
  '/app.html?route=home',
  '/dingloft-app.js',
  '/pwa-install.js',
  '/manifest.webmanifest',
  '/mobile-shell-redirect.js',
  '/img/pwa-icon-192.png',
  '/img/pwa-icon-512.png',
  '/img/pwa-maskable-512.png',
  '/img/dingloft.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('dingloft-app-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache admin/auth endpoints or downloadable/API-like URLs.
  if (/\/(admin|commerce-admin|login|register)\.html$/i.test(url.pathname) || /\/download$/i.test(url.pathname)) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (_) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return caches.match('/app.html?route=home');
      }
    })());
    return;
  }

  if (['script','style','image','font','manifest'].includes(req.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const network = fetch(req).then(async fresh => {
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      }).catch(() => null);
      return cached || await network || Response.error();
    })());
  }
});
