const CACHE = 'dingloft-app-v22-audio-fix';
const CORE = [
  "/launch.html?v=18",
  "/app.html?route=home",
  "/desktop-shell.html?src=ventas.html",
  "/ventas.html",
  "/index.html",
  "/dingloft-app.js",
  "/desktop-shell.js",
  "/desktop-global-nav.js",
  "/dingloft-ui-guard.js",
  "/pwa-install.js",
  "/manifest.webmanifest?v=18",
  "/mobile-shell-redirect.js",
  "/img/pwa-liquid-192-v5.png",
  "/img/pwa-liquid-512-v5.png",
  "/img/pwa-liquid-maskable-512-v5.png",
  "/img/apple-touch-icon-liquid-v5.png",
  "/img/pwa-liquid-rounded-192-v17.png",
  "/img/pwa-liquid-rounded-512-v17.png",
  "/img/iphone-se-640x1136.png",
  "/img/iphone-8-750x1334.png",
  "/img/iphone-8-plus-1242x2208.png",
  "/img/iphone-x-1125x2436.png",
  "/img/iphone-11-828x1792.png",
  "/img/iphone-11-pro-max-1242x2688.png",
  "/img/iphone-12-mini-1080x2340.png",
  "/img/iphone-14-1170x2532.png",
  "/img/iphone-14-plus-1284x2778.png",
  "/img/iphone-15-pro-1179x2556.png",
  "/img/iphone-15-pro-max-1290x2796.png",
  "/img/iphone-16-pro-1206x2622.png",
  "/img/iphone-16-pro-max-1320x2868.png"
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

  // Audio previews must bypass the PWA cache so Safari can request byte ranges normally.
  if (req.destination === 'audio' || /^\/audio\//i.test(url.pathname) || req.headers.has('range')) return;

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
        return caches.match('/launch.html?v=18') || caches.match('/app.html?route=home');
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
