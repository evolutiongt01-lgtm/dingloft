/* Dingloft Unified Cart · v91
   One cart identity across every product page + Multitrack cover hydration.
   Product truth comes from the public Worker catalog; local aliases only migrate old carts. */
(() => {
  'use strict';
  if (window.DingloftCartSync?.version >= 91) return;

  const VERSION = 91;
  const CART_KEY = 'dingloft_cart';
  const OPEN_CART_KEY = 'dingloft_open_cart';
  const WORKER = String(
    window.DINGLOFT_WORKER_BASE ||
    document.querySelector('meta[name="dingloft-worker-base"]')?.content ||
    'https://autumn-breeze-dfa0.evolutiongt01.workers.dev'
  ).replace(/\/$/, '');

  const norm = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ').trim();

  const slugify = value => norm(value).replace(/\s+/g, '-');

  const LEGACY_SKUS = new Map([
    ['autocad 2026','autocad-2026'],
    ['office home and business','office-home-business'],
    ['microsoft office 2024','office-home-business'],
    ['sketchup pro 2026','sketchup-pro-2026'],
    ['sketchup 2026 and autocad 2026','sketchup-2026-autocad-2026'],
    ['sketchup and autocad combo','sketchup-2026-autocad-2026'],
    ['cosmos collection','cosmos-collection'],
    ['cosmo collection','cosmos-collection'],
    ['montage 8 and nord stage 3','montage-8-nord-stage-3'],
    ['biblias e sword','biblias-e-sword'],
    ['biblias y diccionarios para e sword','biblias-e-sword'],
    ['nord stage 4 ultimate library','nord-stage-4-ultimate-library'],
    ['nord essentials sf2 collection','nord-essentials-sf2-collection'],
    ['yamaha legacy collection sf2','yamaha-legacy-collection-sf2'],
    ['pianos legendarios sf2 bundle','pianos-legendarios-sf2-bundle'],
    ['pianos legendarios sf2 bundle completo','pianos-legendarios-sf2-bundle'],
    ['dual legend','pianos-legendarios-sf2-bundle'],
    ['dual legends','pianos-legendarios-sf2-bundle'],
    ['yamaha premium keys','yamaha-premium-keys'],
    ['rhodes affair 2','rhodes-affair-2'],
    ['logic pro','logic-pro'],
    ['cinema 4d','cinema-4d']
  ]);

  let catalogByKey = new Map();
  let mtByKey = new Map();
  let refreshPromise = null;

  function canonicalSku(item = {}) {
    const rawSku = String(item.sku || item.productSku || item.workerSku || '').trim();
    if (rawSku && !/^\d+$/.test(rawSku) && !/^MT-\d+$/i.test(rawSku)) return slugify(rawSku);
    const byName = LEGACY_SKUS.get(norm(item.name || item.title || ''));
    if (byName) return byName;
    const rawId = String(item.id || '').trim();
    if (rawId && !/^\d+$/.test(rawId) && !/^MT-\d+$/i.test(rawId)) return slugify(rawId);
    return rawSku || rawId || slugify(item.name || item.title || '');
  }

  function keyOf(item = {}) {
    const mtId = String(item.mtId || item.multitrackId || item.id || '').trim().toUpperCase();
    if (/^MT-\d+$/.test(mtId)) return `mt:${mtId}`;
    return `sku:${canonicalSku(item) || norm(item.name || item.title || '')}`;
  }

  function imageOf(item = {}) {
    const raw = String(item.cover || item.imageUrl || item.imagePath || item.img || 'dingloft').trim();
    if (/^(?:https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
    if (raw.startsWith('/')) return raw;
    if (raw.startsWith('img/')) return `/${raw}`;
    return `/img/${raw || 'dingloft'}.png`;
  }

  function normalizeItem(raw = {}) {
    const item = { ...raw };
    item.qty = 1;
    item.quantity = 1;

    const maybeMt = String(item.id || item.multitrackId || '').trim().toUpperCase();
    const mtHint = /^MT-\d+$/.test(maybeMt) || String(item.type || '').toLowerCase().includes('multitrack');
    const mt = mtByKey.get(maybeMt) || mtByKey.get(norm(item.name || item.title || '')) || null;
    if (mt) {
      item.id = mt.id || item.id;
      item.sku = mt.commerceSku || mt.sku || item.sku || slugify(mt.title || item.name || '');
      item.name = mt.title || mt.name || item.name;
      item.type = mt.type || 'Multitrack digital';
      item.img = mt.img || item.img || 'dingloft';
      item.cover = mt.cover || item.cover || '';
      item.imageUrl = item.cover || item.imageUrl || '';
      if (Number.isFinite(Number(mt.price ?? mt.priceUsd))) item.price = Number(mt.price ?? mt.priceUsd);
      return item;
    }
    if (mtHint) {
      if (/^MT-\d+$/.test(maybeMt)) item.id = maybeMt;
      item.sku = String(item.sku || item.commerceSku || slugify(item.name || item.title || maybeMt)).trim();
      item.type = item.type || 'Multitrack digital';
      item.img = item.img || 'dingloft';
      return item;
    }

    const sku = canonicalSku(item);
    const product = catalogByKey.get(slugify(sku)) || catalogByKey.get(norm(item.name || '')) || null;
    item.sku = product?.sku || sku;
    // Use the SKU as the shared non-Multitrack id so old pages stop disagreeing on numeric ids.
    if (item.sku) item.id = item.sku;
    if (product) {
      item.name = product.name || item.name;
      item.type = product.type || product.category || item.type;
      item.img = product.img || item.img || 'dingloft';
      item.imageUrl = product.imageUrl || product.imagePath || item.imageUrl || '';
      if (Number.isFinite(Number(product.priceUsd ?? product.price))) item.price = Number(product.priceUsd ?? product.price);
    }
    return item;
  }

  function normalizeCart(source) {
    const rows = Array.isArray(source) ? source : [];
    const out = [];
    const seen = new Set();
    for (const raw of rows.slice(0, 50)) {
      const item = normalizeItem(raw || {});
      const key = keyOf(item);
      if (!key || key.endsWith(':') || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function read() {
    try { return normalizeCart(JSON.parse(localStorage.getItem(CART_KEY) || '[]')); }
    catch (_) { return []; }
  }

  function write(cart, notify = false) {
    const normalized = normalizeCart(cart);
    try { localStorage.setItem(CART_KEY, JSON.stringify(normalized)); } catch (_) {}
    if (notify) {
      window.dispatchEvent(new CustomEvent('dingloft:cart-sync', { detail:{ cart:normalized, version:VERSION } }));
    }
    return normalized;
  }

  function publicProducts(data) {
    if (Array.isArray(data)) return data;
    for (const key of ['products','catalog','items']) if (Array.isArray(data?.[key])) return data[key];
    return [];
  }

  function publicMultitracks(data) {
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.multitracks) ? data.multitracks : [];
  }

  function indexCatalog(products = [], multitracks = []) {
    const pMap = new Map();
    for (const p of products) {
      if (!p || p.active === false) continue;
      const sku = slugify(p.sku || p.slug || p.name || '');
      if (sku) pMap.set(sku, p);
      if (p.name) pMap.set(norm(p.name), p);
      for (const alias of Array.isArray(p.aliases) ? p.aliases : []) pMap.set(norm(alias), p);
    }
    catalogByKey = pMap;

    const mMap = new Map();
    for (const mt of multitracks) {
      if (!mt || mt.active === false) continue;
      const id = String(mt.id || '').trim().toUpperCase();
      const title = String(mt.title || mt.name || '').trim();
      const hydrated = {
        ...mt,
        id,
        title,
        type:'Multitrack digital',
        price:Number(mt.price ?? mt.priceUsd),
        commerceSku: mt.commerceSku || mt.sku || slugify(title),
        img: mt.img || 'dingloft'
      };
      if (id) mMap.set(id, hydrated);
      if (title) mMap.set(norm(title), hydrated);
      if (hydrated.commerceSku) mMap.set(slugify(hydrated.commerceSku), hydrated);
    }
    mtByKey = mMap;
  }

  async function refresh({ notify = true } = {}) {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        const [productsRes, mtRes] = await Promise.allSettled([
          fetch(`${WORKER}/products/public`, { cache:'no-store', headers:{Accept:'application/json'} }),
          fetch(`${WORKER}/multitracks/catalog`, { cache:'no-store', headers:{Accept:'application/json'} })
        ]);
        let products = [], multitracks = [];
        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          products = publicProducts(await productsRes.value.json().catch(() => ({})));
        }
        if (mtRes.status === 'fulfilled' && mtRes.value.ok) {
          multitracks = publicMultitracks(await mtRes.value.json().catch(() => ({})));
        }
        indexCatalog(products, multitracks);
      } catch (_) {
        // Local migration below still keeps old numeric ids from fragmenting the cart.
      }
      const cart = write(read(), notify);
      return cart;
    })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  function addOrMerge(cart, raw) {
    const list = normalizeCart(cart);
    const incoming = normalizeItem(raw || {});
    const key = keyOf(incoming);
    const existing = list.find(item => keyOf(item) === key);
    if (existing) {
      Object.assign(existing, incoming, {qty:1, quantity:1});
      return list;
    }
    list.push({...incoming, qty:1, quantity:1});
    return normalizeCart(list);
  }

  function injectUnifiedCartStyle() {
    const old = document.getElementById('dingloft-unified-cart-v89');
    if (old) old.remove();
    let style = document.getElementById('dingloft-unified-cart-v91');
    if (!style) {
      style = document.createElement('style');
      style.id = 'dingloft-unified-cart-v91';
    }
    style.textContent = `
      /* v91 · Lower mobile sheet + clean focus mode. */
      html.dl-cart-stage-lock,html.dl-cart-stage-lock body{overscroll-behavior:none!important}
      body.dl-cart-stage-open,body.dl-cart-stage-closing{overflow:hidden!important;overscroll-behavior:none!important}
      body.dl-cart-stage-open > :not(.cart-overlay):not(#cart-overlay):not(.cart-drawer):not(#cart-drawer):not(.cart-brand-watermark):not(script):not(style):not(link):not(template),
      body.dl-cart-stage-closing > :not(.cart-overlay):not(#cart-overlay):not(.cart-drawer):not(#cart-drawer):not(.cart-brand-watermark):not(script):not(style):not(link):not(template){pointer-events:none!important}

      .cart-overlay,#cart-overlay{
        position:fixed!important;inset:0!important;z-index:2147483000!important;
        background:
          radial-gradient(circle at 72% 42%,rgba(67,94,148,.10),transparent 31rem),
          linear-gradient(180deg,rgba(0,2,5,.76),rgba(0,1,3,.92))!important;
        backdrop-filter:blur(13px) saturate(118%)!important;-webkit-backdrop-filter:blur(13px) saturate(118%)!important;
        opacity:0!important;visibility:hidden!important;pointer-events:none!important;
        transition:opacity .42s cubic-bezier(.16,1,.3,1),visibility 0s linear .45s,backdrop-filter .42s ease!important;
      }
      .cart-overlay.active,#cart-overlay.active{
        opacity:1!important;visibility:visible!important;pointer-events:auto!important;
        transition:opacity .42s cubic-bezier(.16,1,.3,1),visibility 0s linear 0s!important;
      }

      .cart-drawer,#cart-drawer{
        position:fixed!important;z-index:2147483100!important;
        top:12px!important;right:12px!important;bottom:12px!important;left:auto!important;
        width:min(460px,calc(100vw - 24px))!important;max-width:calc(100vw - 24px)!important;
        height:auto!important;max-height:none!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;
        border-radius:25px!important;border:1px solid rgba(255,255,255,.12)!important;
        background:radial-gradient(circle at 82% 0,rgba(116,93,255,.11),transparent 22rem),linear-gradient(155deg,rgba(15,18,25,.992),rgba(5,7,11,.995))!important;
        box-shadow:0 38px 120px rgba(0,0,0,.74),inset 0 1px 0 rgba(255,255,255,.065)!important;
        backdrop-filter:blur(30px) saturate(150%)!important;-webkit-backdrop-filter:blur(30px) saturate(150%)!important;
        transform:translate3d(calc(100% + 46px),0,0) scale(.965)!important;transform-origin:right center!important;
        opacity:.15!important;visibility:hidden!important;pointer-events:none!important;
        transition:transform .58s cubic-bezier(.16,1,.3,1),opacity .34s ease,visibility 0s linear .60s!important;
      }
      .cart-drawer.active,#cart-drawer.active{
        right:12px!important;transform:translate3d(0,0,0) scale(1)!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;
        transition:transform .62s cubic-bezier(.16,1,.3,1),opacity .30s ease,visibility 0s linear 0s!important;
      }
      .cart-drawer::after,#cart-drawer::after{
        content:"";position:absolute!important;inset:-28% auto -28% -95px!important;width:155px!important;pointer-events:none!important;
        background:linear-gradient(90deg,transparent,rgba(118,184,255,.10),transparent)!important;filter:blur(18px)!important;
        opacity:0!important;transform:translate3d(-45px,0,0) skewX(-9deg)!important;transition:opacity .32s ease,transform .82s cubic-bezier(.16,1,.3,1)!important;
      }
      .cart-drawer.active::after,#cart-drawer.active::after{opacity:1!important;transform:translate3d(80px,0,0) skewX(-9deg)!important;transition-delay:.08s!important}

      .cart-drawer .cart-header,#cart-drawer .cart-header{flex:0 0 auto!important;padding:20px 20px 16px!important;border-bottom:1px solid rgba(255,255,255,.075)!important;background:rgba(255,255,255,.012)!important}
      .cart-drawer .cart-items-container,#cart-drawer .cart-items-container{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;padding:14px 16px!important;scrollbar-gutter:stable!important}
      .cart-drawer .cart-footer,#cart-drawer .cart-footer{flex:0 0 auto!important;max-height:min(47dvh,470px)!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;padding:16px 18px 18px!important;border-top:1px solid rgba(255,255,255,.075)!important;background:linear-gradient(180deg,rgba(7,9,13,.86),rgba(5,7,10,.98))!important}
      .cart-drawer .cart-item,#cart-drawer .cart-item{display:grid!important;grid-template-columns:64px minmax(0,1fr) 32px!important;gap:12px!important;align-items:center!important;padding:11px!important;margin-bottom:9px!important;border:1px solid rgba(255,255,255,.075)!important;border-radius:16px!important;background:rgba(255,255,255,.027)!important}
      .cart-drawer .cart-item-img,#cart-drawer .cart-item-img{width:64px!important;height:64px!important;display:grid!important;place-items:center!important;overflow:hidden!important;border-radius:13px!important;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))!important;border:1px solid rgba(255,255,255,.07)!important}
      .cart-drawer .cart-item-img img,#cart-drawer .cart-item-img img{display:block!important;width:82%!important;height:82%!important;object-fit:contain!important}
      .cart-drawer .cart-item-img.has-cover img,#cart-drawer .cart-item-img.has-cover img{width:100%!important;height:100%!important;object-fit:cover!important}
      .cart-drawer .cart-item-info,#cart-drawer .cart-item-info{min-width:0!important}
      .cart-drawer .cart-item-title,#cart-drawer .cart-item-title{overflow:hidden!important;text-overflow:ellipsis!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important}
      .cart-drawer .btn-close-cart,#cart-drawer .btn-close-cart{flex:0 0 auto!important;transition:transform .42s cubic-bezier(.16,1,.3,1),background .25s ease,border-color .25s ease!important}
      .cart-drawer .btn-close-cart:hover,#cart-drawer .btn-close-cart:hover{transform:rotate(90deg) scale(1.06)!important}

      /* One premium choreography on every page, not only Multitracks. */
      .cart-drawer .cart-header,#cart-drawer .cart-header,
      .cart-drawer .cart-items-container,#cart-drawer .cart-items-container,
      .cart-drawer .cart-footer,#cart-drawer .cart-footer{opacity:0!important;transform:translate3d(22px,0,0)!important;filter:blur(3px)!important;transition:opacity .30s ease,transform .50s cubic-bezier(.16,1,.3,1),filter .36s ease!important}
      .cart-drawer.active .cart-header,#cart-drawer.active .cart-header{opacity:1!important;transform:translate3d(0,0,0)!important;filter:blur(0)!important;transition-delay:.12s!important}
      .cart-drawer.active .cart-items-container,#cart-drawer.active .cart-items-container{opacity:1!important;transform:translate3d(0,0,0)!important;filter:blur(0)!important;transition-delay:.18s!important}
      .cart-drawer.active .cart-footer,#cart-drawer.active .cart-footer{opacity:1!important;transform:translate3d(0,0,0)!important;filter:blur(0)!important;transition-delay:.24s!important}
      .cart-drawer.active .cart-item,#cart-drawer.active .cart-item{animation:dlCartItemInV91 .48s cubic-bezier(.16,1,.3,1) both!important}
      .cart-drawer.active .cart-item:nth-child(1),#cart-drawer.active .cart-item:nth-child(1){animation-delay:.17s!important}
      .cart-drawer.active .cart-item:nth-child(2),#cart-drawer.active .cart-item:nth-child(2){animation-delay:.21s!important}
      .cart-drawer.active .cart-item:nth-child(3),#cart-drawer.active .cart-item:nth-child(3){animation-delay:.25s!important}
      .cart-drawer.active .cart-item:nth-child(4),#cart-drawer.active .cart-item:nth-child(4){animation-delay:.29s!important}
      @keyframes dlCartItemInV91{from{opacity:0;transform:translate3d(18px,5px,0) scale(.975)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}

      /* Tablet: side drawer with safe room for the shared mobile chrome. */
      @media (min-width:768px) and (max-width:1024px){
        .cart-drawer,#cart-drawer{top:calc(78px + env(safe-area-inset-top,0px))!important;bottom:calc(82px + env(safe-area-inset-bottom,0px))!important;left:auto!important;right:14px!important;width:min(480px,calc(100vw - 28px))!important;max-width:min(480px,calc(100vw - 28px))!important;height:auto!important;max-height:none!important;border-radius:22px!important;transform:translate3d(calc(100% + 42px),0,0) scale(.97)!important}
        .cart-drawer.active,#cart-drawer.active{right:14px!important;transform:translate3d(0,0,0) scale(1)!important}
        .cart-drawer .cart-footer,#cart-drawer .cart-footer{max-height:min(43dvh,410px)!important;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))!important}
      }

      /* Phone: EXACT Multitracks lower bottom-sheet measure on every page. */
      @media (max-width:767px){
        .cart-drawer,#cart-drawer{
          top:auto!important;right:0!important;bottom:0!important;left:0!important;width:100%!important;max-width:none!important;
          height:min(80dvh,720px)!important;max-height:min(80dvh,720px)!important;
          border-radius:28px 28px 0 0!important;border-left:0!important;border-right:0!important;border-bottom:0!important;border-top:1px solid rgba(255,255,255,.115)!important;
          transform:translate3d(0,calc(100% + 30px),0) scale(.972)!important;transform-origin:center bottom!important;
          box-shadow:0 -34px 100px rgba(0,0,0,.72),inset 0 1px 0 rgba(255,255,255,.055)!important;
        }
        .cart-drawer.active,#cart-drawer.active{right:0!important;transform:translate3d(0,0,0) scale(1)!important}
        .cart-drawer::after,#cart-drawer::after{display:none!important}
        .cart-drawer .cart-header,#cart-drawer .cart-header{position:relative!important;min-height:70px!important;padding:23px 58px 13px 17px!important}
        .cart-drawer .btn-close-cart,#cart-drawer .btn-close-cart{display:grid!important;place-items:center!important;position:absolute!important;top:15px!important;right:14px!important;width:40px!important;height:40px!important;padding:0!important;margin:0!important;border:1px solid rgba(255,255,255,.105)!important;border-radius:13px!important;background:rgba(255,255,255,.045)!important;color:#f6f9fc!important;z-index:8!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:none!important}
        .cart-drawer .btn-close-cart:hover,#cart-drawer .btn-close-cart:hover{background:rgba(255,255,255,.095)!important;border-color:rgba(255,255,255,.18)!important;transform:rotate(90deg) scale(1.04)!important}
        .cart-drawer .cart-header,#cart-drawer .cart-header,.cart-drawer .cart-items-container,#cart-drawer .cart-items-container,.cart-drawer .cart-footer,#cart-drawer .cart-footer{transform:translate3d(0,16px,0)!important}
        .cart-drawer.active .cart-header,#cart-drawer.active .cart-header,.cart-drawer.active .cart-items-container,#cart-drawer.active .cart-items-container,.cart-drawer.active .cart-footer,#cart-drawer.active .cart-footer{transform:translate3d(0,0,0)!important}
        .cart-drawer .cart-header::before,#cart-drawer .cart-header::before{content:""!important;position:absolute!important;top:8px!important;left:50%!important;width:40px!important;height:4px!important;border-radius:999px!important;transform:translateX(-50%)!important;background:rgba(255,255,255,.20)!important;box-shadow:0 0 18px rgba(121,184,255,.10)!important}
        .cart-drawer .cart-items-container,#cart-drawer .cart-items-container{padding:10px 12px!important}
        .cart-drawer .cart-footer,#cart-drawer .cart-footer{padding:13px 14px calc(18px + env(safe-area-inset-bottom,0px))!important;max-height:46dvh!important;scroll-padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))!important}
        .cart-drawer .cart-item,#cart-drawer .cart-item{grid-template-columns:58px minmax(0,1fr) 29px!important;gap:10px!important;padding:10px!important;border-radius:15px!important}
        .cart-drawer .cart-item-img,#cart-drawer .cart-item-img{width:58px!important;height:58px!important;border-radius:12px!important}
      }
      @media (max-width:480px){
        .cart-drawer,#cart-drawer{height:min(80dvh,720px)!important;max-height:min(80dvh,720px)!important;border-radius:25px 25px 0 0!important}
        .cart-drawer .cart-header,#cart-drawer .cart-header{padding:22px 52px 12px 15px!important}
        .cart-drawer .cart-items-container,#cart-drawer .cart-items-container{padding:9px 10px!important}
        .cart-drawer .cart-footer,#cart-drawer .cart-footer{padding:12px 12px calc(18px + env(safe-area-inset-bottom,0px))!important;max-height:47dvh!important}
        .cart-drawer .cart-item,#cart-drawer .cart-item{grid-template-columns:54px minmax(0,1fr) 28px!important;gap:9px!important;padding:9px!important;border-radius:14px!important}
        .cart-drawer .cart-item-img,#cart-drawer .cart-item-img{width:54px!important;height:54px!important;border-radius:11px!important}
      }
      @media (max-height:520px) and (pointer:coarse){
        .cart-drawer,#cart-drawer{top:8px!important;right:8px!important;bottom:8px!important;left:8px!important;width:auto!important;height:auto!important;max-height:none!important;border-radius:20px!important;transform:translate3d(0,calc(100% + 24px),0) scale(.98)!important}
        .cart-drawer.active,#cart-drawer.active{right:8px!important;transform:translate3d(0,0,0) scale(1)!important}
        .cart-drawer .cart-footer,#cart-drawer .cart-footer{max-height:52dvh!important;padding-bottom:14px!important}
      }
      @media (prefers-reduced-motion:reduce){.cart-drawer,#cart-drawer,.cart-overlay,#cart-overlay{transition:none!important}}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  let cartStageOpen = false;
  let cartStageCloseTimer = 0;
  const cartStageAnimations = new Map();
  const cartStageOriginals = new Map();

  function cartStageNodes() {
    if (!document.body) return [];
    const excluded = '.cart-overlay,#cart-overlay,.cart-drawer,#cart-drawer,.cart-brand-watermark,#dlMobileHeaderV71,#dlMobileDockV71,#dlMobileSearchV71,script,style,link,template';
    return Array.from(document.body.children).filter(el => {
      if (!(el instanceof HTMLElement) || el.matches(excluded)) return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    });
  }

  function stageDirection(el) {
    if (el.id === 'dlMobileHeaderV71' || /header/i.test(el.id || '')) return 'header';
    if (el.id === 'dlMobileDockV71' || /dock/i.test(el.id || '')) return 'dock';
    return 'surface';
  }

  function stopStageAnimation(el) {
    const running = cartStageAnimations.get(el);
    if (running) {
      try { running.cancel(); } catch (_) {}
      cartStageAnimations.delete(el);
    }
  }

  function setParentShellFocus(open){
    try{
      if(window.parent===window || !window.parent?.document) return;
      const doc=window.parent.document;
      const nav=doc.getElementById('shellNav') || doc.querySelector('.shell-nav');
      const search=doc.getElementById('desktopSearchOverlay');
      if(search?.classList.contains('show')) search.classList.remove('show');
      if(!nav) return;
      nav.style.setProperty('transition','transform .54s cubic-bezier(.16,1,.3,1), opacity .32s ease, filter .38s ease','important');
      nav.style.setProperty('transform',open?'translateX(-50%) translateY(-135%) scale(.97)':'translateX(-50%) translateY(0) scale(1)','important');
      nav.style.setProperty('opacity',open?'0':'1','important');
      nav.style.setProperty('filter',open?'blur(7px)':'none','important');
      nav.style.setProperty('pointer-events',open?'none':'auto','important');
    }catch(_){}
  }

  function animateStageOpen() {
    if (!document.body || cartStageOpen) return;
    cartStageOpen = true;
    clearTimeout(cartStageCloseTimer);
    document.documentElement.classList.add('dl-cart-stage-lock');
    document.body.classList.remove('dl-cart-stage-closing');
    document.body.classList.add('dl-cart-stage-open');
    setParentShellFocus(true);

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const el of cartStageNodes()) {
      stopStageAnimation(el);
      const cs = getComputedStyle(el);
      const original = {
        opacity: cs.opacity || '1',
        transform: cs.transform === 'none' ? 'none' : cs.transform,
        filter: cs.filter === 'none' ? 'none' : cs.filter
      };
      cartStageOriginals.set(el, original);
      const dir = stageDirection(el);
      const endTransform = dir === 'header'
        ? 'translate3d(0,-115%,0)'
        : dir === 'dock'
          ? 'translate3d(0,145%,0) scale(.94)'
          : 'translate3d(-22px,12px,0) scale(.955)';
      const animation = el.animate([
        {opacity:original.opacity, transform:original.transform, filter:original.filter},
        {opacity:'0', transform:endTransform, filter:dir === 'surface' ? 'blur(12px)' : 'blur(5px)'}
      ], {
        duration: dir === 'surface' ? 480 : 520,
        easing:'cubic-bezier(.16,1,.3,1)',
        fill:'forwards'
      });
      cartStageAnimations.set(el, animation);
    }
  }

  function animateStageClose() {
    if (!document.body || !cartStageOpen) return;
    cartStageOpen = false;
    clearTimeout(cartStageCloseTimer);
    document.body.classList.remove('dl-cart-stage-open');
    document.body.classList.add('dl-cart-stage-closing');
    setParentShellFocus(false);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const [el, original] of Array.from(cartStageOriginals.entries())) {
      if (!el.isConnected) { cartStageOriginals.delete(el); continue; }
      let current;
      try {
        const cs = getComputedStyle(el);
        current = {opacity:cs.opacity || '0', transform:cs.transform === 'none' ? 'none' : cs.transform, filter:cs.filter === 'none' ? 'none' : cs.filter};
      } catch (_) { current = {opacity:'0',transform:'none',filter:'none'}; }
      stopStageAnimation(el);
      if (reduced) continue;
      const animation = el.animate([
        current,
        {opacity:original.opacity, transform:original.transform, filter:original.filter}
      ], {
        duration:520,
        easing:'cubic-bezier(.16,1,.3,1)',
        fill:'none'
      });
      cartStageAnimations.set(el, animation);
      animation.finished.catch(()=>{}).finally(() => {
        if (cartStageAnimations.get(el) === animation) cartStageAnimations.delete(el);
      });
    }
    cartStageCloseTimer = setTimeout(() => {
      if (cartStageOpen) return;
      document.body?.classList.remove('dl-cart-stage-closing');
      document.documentElement.classList.remove('dl-cart-stage-lock');
      for (const [el] of cartStageAnimations) stopStageAnimation(el);
      cartStageOriginals.clear();
    }, reduced ? 20 : 560);
  }

  function syncCartStage() {
    const drawer = document.querySelector('.cart-drawer,#cart-drawer');
    const open = Boolean(drawer?.classList.contains('active'));
    if (open) animateStageOpen();
    else animateStageClose();
  }

  function installCartStageObserver() {
    const drawer = document.querySelector('.cart-drawer,#cart-drawer');
    if (!drawer || drawer.dataset.dlStageObserved === '1') { syncCartStage(); return Boolean(drawer); }
    drawer.dataset.dlStageObserved = '1';
    new MutationObserver(syncCartStage).observe(drawer,{attributes:true,attributeFilter:['class']});
    syncCartStage();
    return true;
  }

  function consumeOpenCartRequest() {
    let requested = false;
    try { requested = sessionStorage.getItem(OPEN_CART_KEY) === '1'; } catch (_) {}
    if (!requested) return;
    const tryOpen = () => {
      const btn = document.querySelector('.btn-floating-cart.cart-btn-global,#main-cart-btn,.cart-btn-global,[data-cart-open]');
      const drawer = document.querySelector('.cart-drawer,#cart-drawer');
      if (!btn && !drawer) return false;
      try { sessionStorage.removeItem(OPEN_CART_KEY); } catch (_) {}
      if (btn) btn.click();
      else {
        document.querySelector('.cart-overlay,#cart-overlay')?.classList.add('active');
        drawer?.classList.add('active');
      }
      return true;
    };
    if (tryOpen()) return;
    let attempts = 0;
    const timer = setInterval(() => { if (tryOpen() || ++attempts > 20) clearInterval(timer); }, 120);
  }

  // Synchronous migration happens before legacy DOMContentLoaded handlers read the cart.
  const initial = write(read(), false);
  injectUnifiedCartStyle();

  window.DingloftCartSync = {
    version:VERSION,
    key:CART_KEY,
    worker:WORKER,
    normalize:normalizeCart,
    normalizeItem,
    canonicalSku,
    keyOf,
    imageOf,
    read,
    write,
    addOrMerge,
    refresh,
    current:() => read()
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { injectUnifiedCartStyle(); installCartStageObserver(); consumeOpenCartRequest(); refresh({notify:true}); }, {once:true});
  } else {
    injectUnifiedCartStyle();
    installCartStageObserver();
    consumeOpenCartRequest();
    refresh({notify:true});
  }

  setTimeout(() => {
    injectUnifiedCartStyle();
    installCartStageObserver();
  }, 0);

  addEventListener('pageshow', () => refresh({notify:true}), {passive:true});
  addEventListener('focus', () => refresh({notify:true}), {passive:true});
  addEventListener('storage', event => {
    if (event.key !== CART_KEY) return;
    const cart = write(read(), false);
    window.dispatchEvent(new CustomEvent('dingloft:cart-sync', {detail:{cart,version:VERSION}}));
  });
})();
