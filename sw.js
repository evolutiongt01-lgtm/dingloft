const VERSION = '55';
const CACHE_PREFIX = 'dingloft-app-';
const CACHE = `${CACHE_PREFIX}v${VERSION}-offline`;
const RUNTIME = `${CACHE_PREFIX}runtime-v${VERSION}`;
const OFFLINE = '/offline.html';

const CORE = [
  '/offline.html',
  '/launch.html?v=55',
  '/app.html?route=home',
  '/desktop-shell.html?src=ventas.html',
  '/ventas.html',
  '/index.html',
  '/multitrack.html',
  '/multitrack.html?app=1',
  '/account.html',
  '/login.html',
  '/sketchup.html',
  '/sketchup.html?app=1',
  '/yamahakeys.html',
  '/yamahakeys.html?app=1',
  '/autocad.html',
  '/autocad.html?app=1',
  '/nord.html',
  '/nord.html?app=1',
  '/rhodes.html',
  '/rhodes.html?app=1',
  '/mainstage.html',
  '/mainstage.html?app=1',
  '/logic.html',
  '/logic.html?app=1',
  '/office.html',
  '/office.html?app=1',
  '/cinema4d.html',
  '/cinema4d.html?app=1',
  '/dual.html',
  '/dual.html?app=1',
  '/esword.html',
  '/esword.html?app=1',
  '/producto.html',
  '/producto.html?app=1',
  '/tienda.html',
  '/dingloft-app.js',
  '/desktop-shell.js',
  '/desktop-global-nav.js',
  '/dingloft-ui-guard.js?v=55',
  '/dingloft-presence.js?v=55',
  '/mobile-shell-redirect.js',
  '/pwa-install.js',
  '/dingloft-commerce.js?v=2.1.0',
  '/pwa-runtime.js?v=55',
  '/dingloft-mobile-chrome.js?v=34',
  '/manifest.webmanifest?v=46',
  '/img/pwa-liquid-rounded-192-v17.png',
  '/img/pwa-liquid-rounded-512-v17.png',
  '/img/pwa-liquid-192-v5.png',
  '/img/pwa-liquid-512-v5.png',
  '/img/pwa-liquid-maskable-512-v5.png'
];

async function precache(){
  const cache = await caches.open(CACHE);
  await Promise.allSettled(CORE.map(async url => {
    try {
      const req = new Request(url, {cache:'reload'});
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res.clone());
    } catch(_) {}
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(precache());
  // Intentionally DO NOT skipWaiting here: the app shows a full update screen first.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && ![CACHE,RUNTIME].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const data = event.data;
  if (data === 'SKIP_WAITING' || data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (data?.type === 'GET_VERSION' && event.ports?.[0]) event.ports[0].postMessage({version:VERSION});
});

function isSensitive(url, req){
  const host = url.hostname.toLowerCase();
  if (host.includes('workers.dev') || host.includes('paypal.com') || host.includes('paypalobjects.com') || host.includes('googleapis.com') || host.includes('firebaseio.com') || host.includes('zoho.')) return true;
  if (/\/(admin|commerce-admin|register)\.html$/i.test(url.pathname)) return true;
  if (/\/(download|checkout|webhooks|auth)\b/i.test(url.pathname)) return true;
  if (req.headers.has('authorization')) return true;
  return false;
}

async function networkFirst(req){
  const cache = await caches.open(RUNTIME);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(()=>{});
    return fresh;
  } catch(_) {
    const exact = await cache.match(req) || await caches.match(req);
    if (exact) return exact;
    return (await caches.match(OFFLINE)) || new Response('Sin conexión', {status:503, headers:{'content-type':'text/plain;charset=utf-8'}});
  }
}

async function staleWhileRevalidate(req){
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(req) || await caches.match(req);
  const network = fetch(req).then(async fresh => {
    if (fresh && (fresh.ok || fresh.type === 'opaque')) await cache.put(req, fresh.clone()).catch(()=>{});
    return fresh;
  }).catch(()=>null);
  return cached || await network || Response.error();
}

async function cacheFirst(req){
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(req) || await caches.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  if (fresh && (fresh.ok || fresh.type === 'opaque')) await cache.put(req, fresh.clone()).catch(()=>{});
  return fresh;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache commerce/auth/API traffic. Offline checkout must fail closed.
  if (isSensitive(url, req)) return;

  // Keep audio previews on the network path so Safari byte-range playback stays reliable.
  if (req.destination === 'audio' || /^\/audio\//i.test(url.pathname) || req.headers.has('range')) return;

  // Documents are network-first and fall back to the last visited copy/offline page.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Same-origin app code/content: show cache immediately, refresh silently in background.
  if (url.origin === self.location.origin) {
    if (['script','style','image','font','manifest'].includes(req.destination) || /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(req));
    }
    return;
  }

  // Cache only harmless presentation resources from known CDNs for offline rendering.
  const presentationHosts = new Set(['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net']);
  if (presentationHosts.has(url.hostname) && ['style','font','image'].includes(req.destination)) {
    event.respondWith(cacheFirst(req));
  }
});
