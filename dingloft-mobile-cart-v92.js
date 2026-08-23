/* Dingloft Mobile Cart · v93 persistent-shell build
   One independent cart UI for phones + tablets only.
   Desktop keeps every existing page/cart untouched. */
(() => {
  'use strict';

  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mobileTablet = /Android|iPhone|iPad|iPod/i.test(ua) || iOS || (navigator.maxTouchPoints > 0 && matchMedia('(max-width:1024px)').matches);
  if (!mobileTablet || !matchMedia('(max-width:1024px)').matches || window.self !== window.top) return;
  if (window.DingloftMobileCartV92) return;

  const VERSION = 93;
  const CART_KEY = 'dingloft_cart';
  const HOST_ID = 'dlMobileCartV92';
  const WORKER = String(
    window.DINGLOFT_WORKER_BASE ||
    document.querySelector('meta[name="dingloft-worker-base"]')?.content ||
    'https://autumn-breeze-dfa0.evolutiongt01.workers.dev'
  ).replace(/\/$/, '');

  let host = null;
  let overlay = null;
  let panel = null;
  let itemsBox = null;
  let countText = null;
  let mounted = false;
  let openState = false;
  let paypalPromise = null;
  let commercePromise = null;
  let catalogPromise = null;
  let catalogProducts = new Map();
  let catalogMultitracks = new Map();

  const norm = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const slugify = value => norm(value).replace(/\s+/g, '-');
  const money = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function imageOf(item = {}) {
    if (window.DingloftCartSync?.imageOf) return window.DingloftCartSync.imageOf(item);
    const raw = String(item.cover || item.imageUrl || item.imagePath || item.img || 'dingloft').trim();
    if (/^(?:https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
    if (raw.startsWith('/')) return raw;
    if (raw.startsWith('img/')) return `/${raw}`;
    return `/img/${raw || 'dingloft'}.png`;
  }

  function rawRead() {
    try {
      const rows = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch (_) { return []; }
  }

  function hydrateFallback(raw = {}) {
    const item = {...raw, qty:1, quantity:1};
    const mtId = String(item.id || item.multitrackId || '').trim().toUpperCase();
    const mt = catalogMultitracks.get(mtId) || catalogMultitracks.get(norm(item.name || item.title || ''));
    if (mt) {
      item.id = mt.id || item.id;
      item.sku = mt.commerceSku || mt.sku || item.sku || slugify(mt.title || item.name || '');
      item.name = mt.title || mt.name || item.name;
      item.type = 'Multitrack digital';
      item.cover = mt.cover || item.cover || '';
      item.imageUrl = item.cover || item.imageUrl || '';
      item.img = mt.img || item.img || 'dingloft';
      item.price = money(mt.price ?? mt.priceUsd ?? item.price);
      return item;
    }
    const sku = slugify(item.sku || item.productSku || item.workerSku || item.id || item.name || '');
    const product = catalogProducts.get(sku) || catalogProducts.get(norm(item.name || ''));
    if (product) {
      item.id = product.sku || sku;
      item.sku = product.sku || sku;
      item.name = product.name || item.name;
      item.type = product.type || product.category || item.type || 'Producto digital';
      item.img = product.img || item.img || 'dingloft';
      item.imageUrl = product.imageUrl || product.imagePath || item.imageUrl || '';
      item.price = money(product.priceUsd ?? product.price ?? item.price);
    }
    return item;
  }

  function readCart() {
    if (window.DingloftCartSync?.current) return window.DingloftCartSync.current();
    const out = [], seen = new Set();
    for (const raw of rawRead().slice(0,50)) {
      const item = hydrateFallback(raw || {});
      const id = String(item.id || '').toUpperCase();
      const key = /^MT-\d+$/.test(id) ? `mt:${id}` : `sku:${slugify(item.sku || item.name || item.id || '')}`;
      if (!key || key.endsWith(':') || seen.has(key)) continue;
      seen.add(key); out.push(item);
    }
    return out;
  }

  function writeCart(rows, notify = true) {
    let cart;
    if (window.DingloftCartSync?.write) cart = window.DingloftCartSync.write(rows, notify);
    else {
      cart = Array.isArray(rows) ? rows.map(x => ({...x, qty:1, quantity:1})) : [];
      try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) {}
      if (notify) window.dispatchEvent(new CustomEvent('dingloft:cart-sync', {detail:{cart,version:VERSION}}));
    }
    window.dispatchEvent(new CustomEvent('dingloft:mobile-cart-updated', {detail:{cart,version:VERSION}}));
    return cart;
  }

  async function hydrateCatalog() {
    if (window.DingloftCartSync?.refresh) {
      await window.DingloftCartSync.refresh({notify:false}).catch(()=>{});
      return;
    }
    if (catalogPromise) return catalogPromise;
    catalogPromise = (async () => {
      try {
        const [pr,mr] = await Promise.allSettled([
          fetch(`${WORKER}/products/public`,{cache:'no-store',headers:{Accept:'application/json'}}),
          fetch(`${WORKER}/multitracks/catalog`,{cache:'no-store',headers:{Accept:'application/json'}})
        ]);
        const pJson = pr.status === 'fulfilled' && pr.value.ok ? await pr.value.json().catch(()=>({})) : {};
        const mJson = mr.status === 'fulfilled' && mr.value.ok ? await mr.value.json().catch(()=>({})) : {};
        const products = Array.isArray(pJson?.products) ? pJson.products : [];
        const mts = Array.isArray(mJson?.multitracks) ? mJson.multitracks : [];
        const pMap = new Map(), mMap = new Map();
        for (const p of products) {
          if (!p || p.active === false) continue;
          const sku = slugify(p.sku || p.slug || p.name || '');
          if (sku) pMap.set(sku,p);
          if (p.name) pMap.set(norm(p.name),p);
        }
        for (const mt of mts) {
          if (!mt || mt.active === false) continue;
          const id = String(mt.id || '').trim().toUpperCase();
          const title = String(mt.title || mt.name || '').trim();
          if (id) mMap.set(id,mt);
          if (title) mMap.set(norm(title),mt);
        }
        catalogProducts = pMap; catalogMultitracks = mMap;
      } catch (_) {}
    })().finally(()=>{ catalogPromise = null; });
    return catalogPromise;
  }

  function removeLegacyCart() {
    const selectors = [
      '.cart-overlay','#cart-overlay','.cart-brand-watermark',
      '.cart-drawer','#cart-drawer',
      'body>.btn-floating-cart','.btn-floating-cart.cart-btn-global'
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        if (host && host.contains(el)) return;
        try { el.remove(); } catch (_) {}
      });
    }
    document.body?.classList.remove('no-scroll','cart-open');
  }

  function styleText() {
    return `
      #${HOST_ID}{position:fixed;inset:0;z-index:2147483300;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",sans-serif;color-scheme:dark}
      #${HOST_ID},#${HOST_ID} *{box-sizing:border-box}
      #${HOST_ID} .dlmc-overlay{position:absolute;inset:0;background:radial-gradient(circle at 50% 20%,rgba(89,111,175,.12),transparent 28rem),rgba(0,2,5,.78);backdrop-filter:blur(15px) saturate(118%);-webkit-backdrop-filter:blur(15px) saturate(118%);opacity:0;visibility:hidden;transition:opacity .38s cubic-bezier(.16,1,.3,1),visibility 0s linear .4s}
      #${HOST_ID} .dlmc-panel{position:absolute;display:flex;flex-direction:column;overflow:hidden;background:radial-gradient(circle at 82% 0,rgba(107,89,255,.12),transparent 23rem),linear-gradient(155deg,rgba(16,19,27,.995),rgba(5,7,11,.998));border:1px solid rgba(255,255,255,.115);box-shadow:0 36px 120px rgba(0,0,0,.76),inset 0 1px 0 rgba(255,255,255,.055);opacity:0;visibility:hidden;pointer-events:none;transition:transform .58s cubic-bezier(.16,1,.3,1),opacity .30s ease,visibility 0s linear .6s}
      #${HOST_ID}.open{pointer-events:auto}
      #${HOST_ID}.open .dlmc-overlay{opacity:1;visibility:visible;transition-delay:0s}
      #${HOST_ID}.open .dlmc-panel{opacity:1;visibility:visible;pointer-events:auto;transition-delay:0s}
      #${HOST_ID} .dlmc-head{position:relative;flex:0 0 auto;min-height:76px;padding:25px 60px 14px 18px;border-bottom:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.012)}
      #${HOST_ID} .dlmc-grab{position:absolute;top:9px;left:50%;width:42px;height:4px;border-radius:999px;transform:translateX(-50%);background:rgba(255,255,255,.20)}
      #${HOST_ID} .dlmc-title{margin:0;color:#f5f8fb;font-size:1.08rem;font-weight:780;letter-spacing:-.02em}
      #${HOST_ID} .dlmc-sub{margin:5px 0 0;color:#738093;font-size:.70rem}
      #${HOST_ID} .dlmc-close{position:absolute;top:16px;right:14px;width:42px;height:42px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(255,255,255,.045);color:#f5f8fb;display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .35s cubic-bezier(.16,1,.3,1),background .2s ease}
      #${HOST_ID} .dlmc-close:active{transform:scale(.90)} #${HOST_ID} .dlmc-close svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round}
      #${HOST_ID} .dlmc-items{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:11px 12px;scrollbar-width:none} #${HOST_ID} .dlmc-items::-webkit-scrollbar{display:none}
      #${HOST_ID} .dlmc-empty{padding:38px 16px;text-align:center;color:#728093;font-size:.72rem;line-height:1.65} #${HOST_ID} .dlmc-empty b{display:block;color:#e6eef5;font-size:.92rem;margin-bottom:5px}
      #${HOST_ID} .dlmc-item{display:grid;grid-template-columns:58px minmax(0,1fr) 38px;gap:11px;align-items:center;margin-bottom:10px;padding:10px;border:1px solid rgba(255,255,255,.075);border-radius:16px;background:rgba(255,255,255,.026);animation:dlmcItem .46s cubic-bezier(.16,1,.3,1) both}
      #${HOST_ID} .dlmc-art{width:58px;height:58px;overflow:hidden;display:grid;place-items:center;border:1px solid rgba(255,255,255,.075);border-radius:13px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))} #${HOST_ID} .dlmc-art img{width:82%;height:82%;object-fit:contain;display:block} #${HOST_ID} .dlmc-art.cover img{width:100%;height:100%;object-fit:cover}
      #${HOST_ID} .dlmc-copy{min-width:0} #${HOST_ID} .dlmc-copy strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#f0f5f9;font-size:.79rem;line-height:1.25} #${HOST_ID} .dlmc-copy small{display:block;margin-top:4px;color:#768396;font-size:.59rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #${HOST_ID} .dlmc-price{display:block;margin-top:8px;color:#6bd6ff;font-size:.86rem;font-weight:850}
      #${HOST_ID} .dlmc-remove{width:36px;height:36px;border:0;border-radius:12px;background:transparent;color:#788494;display:grid;place-items:center;cursor:pointer} #${HOST_ID} .dlmc-remove:active{background:rgba(255,255,255,.055);color:#ff8592} #${HOST_ID} .dlmc-remove svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:1.7}
      #${HOST_ID} .dlmc-footer{flex:0 0 auto;max-height:48dvh;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:13px 14px calc(17px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,255,255,.075);background:linear-gradient(180deg,rgba(7,9,13,.88),rgba(4,6,9,.99));scrollbar-width:none} #${HOST_ID} .dlmc-footer::-webkit-scrollbar{display:none}
      #${HOST_ID} .dlmc-coupon{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-bottom:13px} #${HOST_ID} .dlmc-coupon input{height:46px;min-width:0;padding:0 13px;border:1px solid rgba(255,255,255,.105);border-radius:14px;background:rgba(0,0,0,.22);color:#eef4f8;outline:0;font-size:16px} #${HOST_ID} .dlmc-coupon input::placeholder{color:#667384} #${HOST_ID} .dlmc-coupon button{height:46px;padding:0 17px;border:1px solid rgba(255,255,255,.105);border-radius:14px;background:rgba(255,255,255,.045);color:#eef4f8;font-weight:760}
      #${HOST_ID} #coupon-msg{display:none;margin:-4px 2px 11px;font-size:.62rem;line-height:1.45}
      #${HOST_ID} .dlmc-totalrow{display:flex;align-items:center;justify-content:space-between;gap:15px;margin:7px 1px;color:#dce5ec;font-size:.78rem} #${HOST_ID} .dlmc-totalrow.total{margin-top:9px;color:#fff;font-size:1rem;font-weight:800} #${HOST_ID} .dlmc-totalrow.total strong{color:#6bd6ff;font-size:1.28rem}
      #${HOST_ID} .dlmc-security{display:flex;align-items:center;justify-content:center;gap:7px;margin:15px 0 10px;color:#d8e2e9;font-size:.68rem} #${HOST_ID} .dlmc-security svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.8}
      #${HOST_ID} .paypal-white-card{background:#f7f7f7;padding:12px;border-radius:16px;box-shadow:0 13px 35px rgba(0,0,0,.34);margin-top:8px} #${HOST_ID} .btn-free-checkout{width:100%;border:0;border-radius:13px;background:#79e9ad;color:#05110b;padding:14px;font-weight:850;font-size:.86rem} #${HOST_ID} #paypal-button-container{min-height:44px}
      #${HOST_ID} .dlmc-note{margin:10px 3px 0;text-align:center;color:#5f6c7b;font-size:.54rem;line-height:1.55}
      html.dl-mobile-cart-focus,html.dl-mobile-cart-focus body{overflow:hidden!important;overscroll-behavior:none!important;touch-action:none!important}
      body.dl-mobile-cart-focus> :not(#${HOST_ID}):not(#dlMobileHeaderV71):not(#dlMobileDockV71):not(#dlMobileSearchV89):not(script):not(style):not(link):not(template){opacity:0!important;transform:translate3d(-16px,10px,0) scale(.965)!important;filter:blur(11px)!important;pointer-events:none!important;transition:opacity .34s ease,transform .52s cubic-bezier(.16,1,.3,1),filter .38s ease!important}
      @keyframes dlmcItem{from{opacity:0;transform:translate3d(14px,5px,0) scale(.98)}to{opacity:1;transform:none}}
      @media(min-width:768px) and (max-width:1024px){#${HOST_ID} .dlmc-panel{top:calc(76px + env(safe-area-inset-top,0px));right:13px;bottom:calc(80px + env(safe-area-inset-bottom,0px));width:min(480px,calc(100vw - 26px));border-radius:24px;transform:translate3d(calc(100% + 40px),0,0) scale(.97)} #${HOST_ID}.open .dlmc-panel{transform:none}}
      @media(max-width:767px){#${HOST_ID} .dlmc-panel{left:0;right:0;bottom:0;width:100%;height:min(80dvh,720px);max-height:min(80dvh,720px);border-radius:27px 27px 0 0;border-left:0;border-right:0;border-bottom:0;transform:translate3d(0,calc(100% + 32px),0) scale(.982);transform-origin:center bottom} #${HOST_ID}.open .dlmc-panel{transform:translate3d(0,0,0) scale(1)}}
      @media(max-width:390px){#${HOST_ID} .dlmc-head{padding-left:15px} #${HOST_ID} .dlmc-items{padding:9px 10px} #${HOST_ID} .dlmc-footer{padding-left:12px;padding-right:12px} #${HOST_ID} .dlmc-item{grid-template-columns:54px minmax(0,1fr) 34px;gap:9px;padding:9px} #${HOST_ID} .dlmc-art{width:54px;height:54px}}
      @media(max-height:520px) and (pointer:coarse){#${HOST_ID} .dlmc-panel{top:8px;right:8px;bottom:8px;left:8px;width:auto;height:auto;max-height:none;border-radius:20px;transform:translate3d(0,calc(100% + 24px),0) scale(.98)} #${HOST_ID}.open .dlmc-panel{transform:none} #${HOST_ID} .dlmc-footer{max-height:54dvh}}
      @media(prefers-reduced-motion:reduce){#${HOST_ID} .dlmc-overlay,#${HOST_ID} .dlmc-panel,body.dl-mobile-cart-focus>*{transition:none!important;animation:none!important}}
    `;
  }

  function markup() {
    return `
      <div class="dlmc-overlay" aria-hidden="true"></div>
      <section class="dlmc-panel" role="dialog" aria-modal="true" aria-label="Tu carrito Dingloft">
        <header class="dlmc-head">
          <span class="dlmc-grab" aria-hidden="true"></span>
          <h2 class="dlmc-title">🛒 Tu carrito</h2>
          <p class="dlmc-sub" id="cart-item-count-text">0 productos</p>
          <button class="dlmc-close" type="button" aria-label="Cerrar carrito"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
        </header>
        <div class="dlmc-items" id="cart-items-container"></div>
        <footer class="dlmc-footer">
          <div class="dlmc-coupon"><input id="coupon-input" type="text" autocomplete="off" placeholder="Código de descuento"><button id="apply-coupon-btn" type="button">Aplicar</button></div>
          <div id="coupon-msg"></div>
          <div class="dlmc-totalrow"><span>Subtotal</span><strong id="cart-subtotal">$0.00</strong></div>
          <div class="dlmc-totalrow total"><span>Total</span><strong id="cart-total">$0.00</strong></div>
          <div class="dlmc-security" id="security-badge-box"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5.2-3.4 8.7-8 10-4.6-1.3-8-4.8-8-10V6z"></path><path d="m9.5 12 1.6 1.7 3.5-4"></path></svg><span>Pago 100% seguro con PayPal</span></div>
          <div class="paypal-white-card" id="paypal-container-wrapper" style="display:none"><div id="paypal-button-container"></div></div>
          <button id="free-checkout-btn" class="btn-free-checkout" type="button" style="display:none">Obtener gratis</button>
          <div class="dlmc-note">Compra digital protegida · La entrega se habilita desde Mi cuenta después de confirmar el pago.</div>
        </footer>
      </section>`;
  }

  function setChromeFocused(focused) {
    window.dispatchEvent(new CustomEvent('dingloft:mobile-cart-state',{detail:{open:focused,version:VERSION}}));
  }

  function render() {
    if (!mounted || !itemsBox) return [];
    const cart = readCart();
    window.cartItemsList = cart.map(item => ({
      id:item.id,
      sku:item.sku || item.id,
      name:item.name || item.title || '',
      img:item.img || 'dingloft',
      imageUrl:item.imageUrl || '',
      cover:item.cover || '',
      type:item.type || 'Producto digital',
      price:money(item.price ?? item.priceUsd)
    }));
    const total = cart.reduce((sum,item)=>sum + money(item.price ?? item.priceUsd),0);
    if (countText) countText.textContent = `${cart.length} producto${cart.length === 1 ? '' : 's'}`;
    const subtotal = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    if (subtotal) subtotal.textContent = `$${total.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    window.cartFinalTotal = total;

    if (!cart.length) {
      itemsBox.innerHTML = `<div class="dlmc-empty"><b>Tu carrito está vacío</b>Explora el catálogo y agrega tus productos. Se sincronizarán aquí automáticamente.</div>`;
      document.getElementById('paypal-container-wrapper')?.style.setProperty('display','none');
      document.getElementById('security-badge-box')?.style.setProperty('display','none');
      document.getElementById('free-checkout-btn')?.style.setProperty('display','none');
      return cart;
    }

    itemsBox.innerHTML = cart.map((item,index) => {
      const cover = Boolean(item.cover || /multitrack/i.test(String(item.type || '')));
      return `<article class="dlmc-item" style="animation-delay:${Math.min(index,7)*.035 + .08}s">
        <div class="dlmc-art ${cover?'cover':''}"><img src="${esc(imageOf(item))}" alt="${esc(item.name || item.title || 'Producto')}" loading="lazy"></div>
        <div class="dlmc-copy"><strong>${esc(item.name || item.title || 'Producto')}</strong><small>${esc(item.type || 'Producto digital')}</small><span class="dlmc-price">$${money(item.price ?? item.priceUsd).toFixed(2)}</span></div>
        <button class="dlmc-remove" type="button" data-remove-index="${index}" aria-label="Eliminar ${esc(item.name || 'producto')}"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"></path></svg></button>
      </article>`;
    }).join('');
    return cart;
  }

  async function ensurePayPal() {
    if (window.paypal?.Buttons) return true;
    if (paypalPromise) return paypalPromise;
    paypalPromise = (async () => {
      let clientId = '';
      try {
        const res = await fetch(`${WORKER}/paypal/config`,{cache:'no-store',headers:{Accept:'application/json'}});
        const data = await res.json().catch(()=>({}));
        if (res.ok && data?.ok !== false) clientId = String(data.clientId || '').trim();
      } catch (_) {}
      if (!clientId) return false;
      const existing = Array.from(document.scripts).find(s => /paypal\.com\/sdk\/js/i.test(s.src || ''));
      if (existing) {
        for (let i=0;i<50;i++) { if (window.paypal?.Buttons) return true; await new Promise(r=>setTimeout(r,100)); }
        return Boolean(window.paypal?.Buttons);
      }
      await new Promise(resolve => {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
        script.async = true; script.onload = resolve; script.onerror = resolve;
        document.head.appendChild(script);
      });
      return Boolean(window.paypal?.Buttons);
    })().finally(()=>{ paypalPromise = null; });
    return paypalPromise;
  }

  async function ensureCommerce() {
    if (typeof window.renderPayPalStable === 'function') return true;
    if (commercePromise) return commercePromise;
    commercePromise = import('/dingloft-commerce.js?v=2.2.1-shell93').then(()=>true).catch(()=>false).finally(()=>{commercePromise=null});
    return commercePromise;
  }

  async function prepareCheckout() {
    if (!openState) return;
    const cart = render();
    if (!cart.length) return;
    const [paypalReady, commerceReady] = await Promise.all([ensurePayPal(), ensureCommerce()]);
    if (!openState) return;
    render();
    if (commerceReady && typeof window.renderPayPalStable === 'function') {
      if (!paypalReady) {
        const msg = document.getElementById('coupon-msg');
        if (msg) { msg.style.display='block'; msg.style.color='#ff8c96'; msg.textContent='PayPal no pudo cargar. Revisa tu conexión e inténtalo nuevamente.'; }
        return;
      }
      try { await window.renderPayPalStable(); } catch (_) {}
    }
  }

  async function open() {
    if (!mounted) mount();
    if (!mounted || openState) return;
    removeLegacyCart();
    openState = true;
    document.documentElement.classList.add('dl-mobile-cart-focus');
    document.body?.classList.add('dl-mobile-cart-focus');
    host.classList.add('open');
    setChromeFocused(true);
    await hydrateCatalog().catch(()=>{});
    if (!openState) return;
    render();
    prepareCheckout();
  }

  function close() {
    if (!mounted || !openState) return;
    openState = false;
    host.classList.remove('open');
    setChromeFocused(false);
    document.documentElement.classList.remove('dl-mobile-cart-focus');
    document.body?.classList.remove('dl-mobile-cart-focus','no-scroll','cart-open');
    setTimeout(()=>{ if (!openState) removeLegacyCart(); },420);
  }

  function removeAt(index) {
    const cart = readCart();
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
    cart.splice(index,1);
    writeCart(cart,true);
    render();
    prepareCheckout();
  }

  function clear() {
    writeCart([],true);
    render();
  }

  function mount() {
    if (mounted || !document.body) return;
    removeLegacyCart();
    document.getElementById(HOST_ID)?.remove();
    const style = document.createElement('style');
    style.id = 'dingloft-mobile-cart-v92-style';
    style.textContent = styleText();
    (document.head || document.documentElement).appendChild(style);

    host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('data-dingloft-mobile-cart','92');
    host.innerHTML = markup();
    document.body.appendChild(host);
    overlay = host.querySelector('.dlmc-overlay');
    panel = host.querySelector('.dlmc-panel');
    itemsBox = host.querySelector('#cart-items-container');
    countText = host.querySelector('#cart-item-count-text');
    mounted = true;

    host.querySelector('.dlmc-close')?.addEventListener('click',close);
    overlay?.addEventListener('click',close);
    itemsBox?.addEventListener('click',event=>{
      const btn = event.target.closest('[data-remove-index]');
      if (!btn) return;
      removeAt(Number(btn.dataset.removeIndex));
    });

    document.addEventListener('keydown',event=>{ if (event.key === 'Escape' && openState) close(); });
    document.addEventListener('click',event=>{
      const add = event.target.closest?.('.btn-add-cart,[data-dingloft-add-cart]');
      if (!add) return;
      setTimeout(async()=>{ await hydrateCatalog().catch(()=>{}); render(); open(); },40);
    },false);

    window.addEventListener('dingloft:cart-sync',()=>{ render(); if (openState) prepareCheckout(); });
    window.addEventListener('storage',event=>{ if (event.key === CART_KEY) { render(); if (openState) prepareCheckout(); } });
    window.addEventListener('pageshow',()=>{ removeLegacyCart(); render(); },{passive:true});

    // Secure commerce bridge calls this after a completed checkout.
    window.clearCart = clear;
    render();
  }

  window.DingloftMobileCartV92 = {version:VERSION,open,close,render,clear,isOpen:()=>openState};
  window.DingloftMobileCart = window.DingloftMobileCartV92;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,0),{once:true});
  } else setTimeout(mount,0);
})();
