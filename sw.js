const VERSION = '113';
const CACHE_PREFIX = 'dingloft-app-';
const CACHE = `${CACHE_PREFIX}v${VERSION}-offline`;
const RUNTIME = `${CACHE_PREFIX}runtime-v${VERSION}`;
const OFFLINE = '/offline.html';

const CORE = [
  '/offline.html',
  '/launch',
  '/app?route=home',
  '/app.html?route=home',
  '/desktop-shell?src=ventas.html',
  '/ventas',
  '/ventas?app=1',
  '/',
  '/multitrack',
  '/multitrack?app=1',
  '/account',
  '/account?app=1',
  '/login',
  '/login?app=1',
  '/register?app=1',
  '/sketchup',
  '/sketchup?app=1',
  '/yamahakeys',
  '/yamahakeys?app=1',
  '/autocad',
  '/autocad?app=1',
  '/nord',
  '/nord?app=1',
  '/rhodes',
  '/rhodes?app=1',
  '/mainstage',
  '/mainstage?app=1',
  '/logic',
  '/logic?app=1',
  '/office',
  '/office?app=1',
  '/cinema4d',
  '/cinema4d?app=1',
  '/dual',
  '/dual?app=1',
  '/esword',
  '/esword?app=1',
  '/producto',
  '/producto?app=1',
  '/tienda',
  '/dingloft-app.js',
  '/dingloft-app.js?v=102',
  '/desktop-shell.js',
  '/desktop-shell.js?v=89',
  '/desktop-global-nav.js',
  '/dingloft-theme.js?v=2',
  '/dingloft-theme.css?v=2',
  '/dingloft-ui-guard.js?v=56',
  '/dingloft-presence.js?v=55',
  '/dingloft-customer-push.js?v=1',
  '/mobile-shell-redirect.js',
  '/mobile-shell-redirect.js?v=94',
  '/pwa-install.js',
  '/dingloft-commerce.js?v=2.2.1-shell94',
  '/dingloft-cart-sync.js?v=91',
  '/pwa-runtime.js?v=78',
  '/dingloft-mobile-nav-v71.js?v=98',
  '/dingloft-mobile-dock.css?v=34',
  '/dingloft-mobile-cart-v92.js?v=94',
  '/multitrack-worker-gate.js?v=73',
  '/manifest.webmanifest?v=94',
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
  // Precache the new build, but DO NOT take over existing tabs automatically.
  // The runtime activates it only after the user accepts the update, preventing refresh loops.
  event.waitUntil(precache());
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
  if (/\/(admin|commerce-admin|register)(?:\.html)?$/i.test(url.pathname)) return true;
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

async function fastAppNavigation(req){
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(req, {ignoreSearch:true}) || await caches.match(req, {ignoreSearch:true});
  const network = fetch(req).then(async fresh => {
    if (fresh && fresh.ok) await cache.put(req, fresh.clone()).catch(()=>{});
    return fresh;
  }).catch(()=>null);
  if (cached) {
    network.catch(()=>{});
    return cached;
  }
  return await network || (await caches.match(OFFLINE)) || new Response('Sin conexión', {status:503, headers:{'content-type':'text/plain;charset=utf-8'}});
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

  // Vercel has cleanUrls enabled. If Chromium asks the Service Worker for an old
  // *.html navigation, proxying Vercel's redirect can surface as ERR_FAILED.
  // Redirect legacy installed-PWA URLs locally before touching the network.
  const isDocument = req.mode === 'navigate' || req.destination === 'document';
  if (isDocument && /\.html$/i.test(url.pathname)) {
    const clean = new URL(url.href);
    clean.pathname = clean.pathname.replace(/\.html$/i, '') || '/';
    event.respondWith(Promise.resolve(Response.redirect(clean.href, 302)));
    return;
  }

  // Installed-app startup paints from cache immediately on clean routes.
  const isFastAppRoute = isDocument && (url.pathname === '/launch' || url.pathname === '/app' || url.pathname === '/app.html' || url.searchParams.get('app') === '1');
  if (isFastAppRoute) {
    event.respondWith(fastAppNavigation(req));
    return;
  }

  // Normal documents remain network-first and fall back to the last visited copy/offline page.
  if (isDocument) {
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


/* ==========================================================================
   Dingloft Admin Universal Web Push · v110
   Soporte + ventas + comentarios/experiencias + reservas pagadas.
   ========================================================================== */
function dingloftAdminPushPayload(event){
  if(!event.data)return null;
  try{
    const payload=event.data.json();
    const data=payload?.data&&typeof payload.data==='object'?payload.data:payload||{};
    const notification=payload?.notification||{};
    if(!String(data.kind||'').startsWith('dingloft_')&&!notification.title&&!data.title)return null;
    return{data,notification};
  }catch(_){return null}
}

self.addEventListener('push',event=>{
  const parsed=dingloftAdminPushPayload(event);
  if(!parsed)return;
  const{data,notification}=parsed;
  const kind=String(data.kind||'dingloft_admin');
  const title=data.title||notification.title||'Dingloft';
  const body=data.body||notification.body||'Nueva actividad en Dingloft.';
  const chatId=String(data.chatId||'');
  const eventId=String(data.eventId||data.purchaseId||data.reviewId||data.reservationId||chatId||'new');
  const customer=kind==='dingloft_cart'||kind==='dingloft_customer'||kind==='dingloft_customer_support';
  const fallback=customer?'/account?cart=1':kind==='dingloft_sale'?'/admin#orders':kind==='dingloft_review'?'/admin#reviews':kind==='dingloft_reservation_paid'?'/admin#reservations':'/admin#support';
  const url=data.url||fallback;
  event.waitUntil((async()=>{
    await self.registration.showNotification(title,{
      body,
      icon:'/img/pwa-liquid-rounded-192-v17.png',
      badge:'/img/favicon.png',
      tag:`${kind}-${eventId}`.slice(0,180),
      renotify:true,
      data:{url,chatId,kind,eventId}
    });
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      try{
        client.postMessage({type:'DINGLOFT_ADMIN_PUSH',data});
        if(kind==='dingloft_support')client.postMessage({type:'DINGLOFT_SUPPORT_PUSH',data});
      }catch(_){}
    }
  })());
});

self.addEventListener('notificationclick',event=>{
  const kind=String(event.notification?.data?.kind||'');
  if(!kind.startsWith('dingloft_'))return;
  event.notification.close();
  const target=new URL(event.notification?.data?.url||'/admin',self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      try{
        const current=new URL(client.url);
        if(current.origin===self.location.origin&&(kind==='dingloft_cart'||kind==='dingloft_customer'||kind==='dingloft_customer_support'||/\/admin(?:\.html)?$/i.test(current.pathname))){
          await client.focus();
          if('navigate'in client)await client.navigate(target);
          return;
        }
      }catch(_){}
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
