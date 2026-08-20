/* Dingloft Mobile Chrome v36
   Universal mobile header + dock + cart bridge.
   Visual master: Inicio. Same geometry on Android and iPhone, on every customer page. */
(() => {
  'use strict';
  if (window.__DINGLOFT_MOBILE_CHROME_V36__) return;
  window.__DINGLOFT_MOBILE_CHROME_V36__ = true;

  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua) || iOS || (navigator.maxTouchPoints > 0 && matchMedia('(max-width:1024px)').matches);
  if (!mobile || window.self !== window.top) return;

  const pathKey = () => (location.pathname.split('/').filter(Boolean).pop() || 'index').toLowerCase().replace(/\.html$/,'');
  const PRODUCT_FILES = new Set([
    'autocad','cinema4d','dual','esword','logic','mainstage',
    'nord','office','producto','rhodes','sketchup','yamahakeys'
  ]);
  const CUSTOMER_FILES = new Set(['ventas','account','login','register','multitrack', ...PRODUCT_FILES]);
  const params = new URLSearchParams(location.search);
  const currentFile = pathKey();
  const isAppShell = currentFile === 'app';
  const isDirectApp = params.get('app') === '1' || CUSTOMER_FILES.has(currentFile);
  const customerPage = isAppShell || isDirectApp;
  if (!customerPage) return;
  const CART_KEY = 'dingloft_cart';
  const COVER_KEY = 'dingloft_multitrack_covers_v34';
  const CART_ANIM_MS = 360;
  let closeTimer = 0;

  document.documentElement.classList.add('dl-universal-mobile');
  document.body?.classList.add('dl-universal-mobile');

  const theme = document.querySelector('meta[name="theme-color"]') || (() => {
    const m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); return m;
  })();
  theme.content = '#040609';
  let status = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!status) { status = document.createElement('meta'); status.name = 'apple-mobile-web-app-status-bar-style'; document.head.appendChild(status); }
  status.content = 'black-translucent';

  const css = document.createElement('style');
  css.id = 'dingloft-mobile-chrome-v35-style';
  css.textContent = `
  :root{--dl-safe-top:env(safe-area-inset-top,0px);--dl-safe-right:env(safe-area-inset-right,0px);--dl-safe-bottom:env(safe-area-inset-bottom,0px);--dl-safe-left:env(safe-area-inset-left,0px);--dl-header-h:68px;--dl-dock-h:66px;--dl-dock-bottom:calc(5px + var(--dl-safe-bottom));}
  html.dl-universal-mobile,html.dl-universal-mobile body{background:#05070a!important;max-width:100%!important;overflow-x:hidden!important;overscroll-behavior-x:none!important}
  body.dl-universal-mobile{--dl-header-total:calc(var(--dl-header-h) + var(--dl-safe-top));}

  /* v34: there is ONE mobile chrome. Kill every legacy navbar/dock copy, even when nested in wrappers. */
  html.dl-universal-mobile #main-navbar,
  html.dl-universal-mobile nav.navbar-glass,
  html.dl-universal-mobile .navbar.navbar-glass,
  html.dl-universal-mobile #mobileAppDock,
  html.dl-universal-mobile nav.mobile-app-dock,
  html.dl-universal-mobile .mobile-app-dock,
  html.dl-universal-mobile .dingloft-direct-top,
  html.dl-universal-mobile #dingloftDirectTop,
  html.dl-universal-mobile #dlDirectTop,
  html.dl-universal-mobile #dlDirectDock,
  html.dl-universal-mobile .top,
  html.dl-universal-mobile .dock{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
  html.dl-universal-mobile #side-menu,html.dl-universal-mobile #side-menu-overlay{display:none!important;visibility:hidden!important;pointer-events:none!important}
  html.dl-universal-mobile body>.btn-floating-cart{display:block!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;left:-9999px!important;right:auto!important;bottom:0!important;transform:none!important;box-shadow:none!important}

  #dlUniversalHeader{position:fixed!important;z-index:2147483000!important;top:0!important;left:0!important;right:0!important;height:calc(var(--dl-header-h) + var(--dl-safe-top))!important;padding:var(--dl-safe-top) max(14px,var(--dl-safe-right)) 0 max(14px,var(--dl-safe-left))!important;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#040609 0%,rgba(5,7,10,.985) 70%,rgba(5,7,10,.94) 100%);border-bottom:1px solid rgba(255,255,255,.075);box-shadow:0 10px 34px rgba(0,0,0,.20);backdrop-filter:blur(26px) saturate(160%);-webkit-backdrop-filter:blur(26px) saturate(160%);transform:translateZ(0)}
  #dlUniversalHeader:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent 4%,rgba(109,214,255,.45) 44%,rgba(141,115,255,.28) 62%,transparent 96%);opacity:.55;pointer-events:none}
  #dlUniversalBrand{position:absolute;left:50%;top:calc(var(--dl-safe-top) + 8px);height:52px;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:11px;min-width:max-content;color:#fff;text-decoration:none;text-align:left;-webkit-tap-highlight-color:transparent}
  #dlUniversalBrand img{width:36px;height:36px;border-radius:12px;object-fit:cover;display:block;box-shadow:0 8px 20px rgba(0,0,0,.28)}
  #dlUniversalBrand .copy{line-height:1;min-width:0}
  #dlUniversalBrand strong{display:block;color:#f7fbff;font:850 .90rem/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,sans-serif;letter-spacing:.18em;white-space:nowrap}
  #dlUniversalBrand small{display:block;margin-top:6px;color:#66758a;font:750 .50rem/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,sans-serif;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap}
  #dlUniversalAdmin{position:absolute;right:max(12px,var(--dl-safe-right));top:calc(var(--dl-safe-top) + 15px);height:38px;padding:0 11px;border:1px solid rgba(112,220,255,.18);border-radius:13px;background:rgba(255,255,255,.035);color:#a8eaff;text-decoration:none;display:none;align-items:center;gap:6px;font:780 .54rem/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,sans-serif;letter-spacing:.025em;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
  #dlUniversalAdmin.show{display:flex}#dlUniversalAdmin svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

  #dlUniversalDock{position:fixed!important;z-index:2147483001!important;left:max(10px,var(--dl-safe-left))!important;right:max(10px,var(--dl-safe-right))!important;bottom:var(--dl-dock-bottom)!important;height:var(--dl-dock-h)!important;padding:6px 7px!important;display:grid;grid-template-columns:1fr 1fr 76px 1fr 1fr;align-items:center;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:linear-gradient(180deg,rgba(18,22,29,.84),rgba(8,10,14,.91));box-shadow:0 18px 55px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(24px) saturate(175%);-webkit-backdrop-filter:blur(24px) saturate(175%);transition:opacity .18s ease,transform .30s cubic-bezier(.22,1,.36,1),visibility 0s linear 0s;transform:translate3d(0,0,0);will-change:transform,opacity}

  /* v35: Inicio owns the navigation coordinates. No customer page may offset either bar. */
  body.dl-page-ventas #dlUniversalHeader,body.dl-page-multitrack #dlUniversalHeader,body.dl-page-account #dlUniversalHeader,body.dl-page-product #dlUniversalHeader{top:0!important;transform:translateZ(0)!important}
  body.dl-page-ventas #dlUniversalDock,body.dl-page-multitrack #dlUniversalDock,body.dl-page-account #dlUniversalDock,body.dl-page-product #dlUniversalDock{bottom:var(--dl-dock-bottom)!important;left:max(10px,var(--dl-safe-left))!important;right:max(10px,var(--dl-safe-right))!important;transform:translate3d(0,0,0)!important}
  #dlUniversalDock:before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(160px circle at 50% 0%,rgba(109,214,255,.10),transparent 70%)}
  .dl-u-item{position:relative;z-index:2;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;border-radius:17px;background:transparent;color:#687384;text-decoration:none;font:760 .48rem/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,sans-serif;letter-spacing:.015em;-webkit-tap-highlight-color:transparent;transition:color .18s ease,background .18s ease,transform .12s ease}
  .dl-u-item svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:color .18s ease,filter .18s ease}
  .dl-u-item.active{color:#eaf5ff;background:rgba(255,255,255,.045)}.dl-u-item.active svg{color:#79dcff;filter:drop-shadow(0 0 8px rgba(109,214,255,.28))}.dl-u-item:active{transform:scale(.92)}
  .dl-u-cart-slot{position:relative;z-index:4;height:52px;display:flex;align-items:center;justify-content:center}
  #dlUniversalCart{position:absolute;left:50%;top:-9px;width:60px;height:60px;margin:0;padding:0;border:1px solid rgba(255,255,255,.85);border-radius:20px;background:linear-gradient(145deg,#fbfdff,#eaf1f5);color:#080b0e;display:grid;place-items:center;transform:translateX(-50%);box-shadow:0 18px 45px rgba(0,0,0,.42);-webkit-tap-highlight-color:transparent;transition:transform .12s ease,box-shadow .18s ease}
  #dlUniversalCart:active{transform:translateX(-50%) scale(.92)}#dlUniversalCart svg{width:27px;height:27px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  #dlUniversalCount{position:absolute;top:-5px;right:-6px;min-width:25px;height:25px;padding:0 6px;border:2px solid #050608;border-radius:999px;background:#24aaf2;color:#fff;display:grid;place-items:center;font:850 .68rem/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;transition:transform .18s cubic-bezier(.22,1,.36,1),opacity .18s ease}
  #dlUniversalCount[data-empty="1"]{opacity:0;transform:scale(.72);pointer-events:none}#dlUniversalCount.bump{animation:dlCountBump .34s cubic-bezier(.22,1,.36,1)}@keyframes dlCountBump{50%{transform:scale(1.22)}}
  body.dl-cart-open #dlUniversalDock,body.cart-sheet-open #dlUniversalDock,body.keyboard-open #dlUniversalDock{opacity:0;visibility:hidden;pointer-events:none;transform:translate3d(0,calc(100% + 28px),0);transition:opacity .15s ease,transform .26s cubic-bezier(.4,0,.2,1),visibility 0s linear .26s}

  /* App shell reserves exactly the universal header/dock geometry. */
  body.dl-universal-mobile #stage{top:calc(var(--dl-header-h) + var(--dl-safe-top))!important;bottom:calc(78px + var(--dl-safe-bottom))!important}
  body.dl-universal-mobile.cart-sheet-open #stage,body.dl-universal-mobile.dl-cart-open #stage{bottom:0!important}
  body.dl-universal-mobile .progress{top:calc(var(--dl-header-h) + var(--dl-safe-top))!important}

  /* Direct pages: the DOCUMENT owns scrolling. No iframe/body scroll traps on iPhone. */
  html.dingloft-direct-app{height:auto!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-x pan-y!important;overscroll-behavior-x:none!important}
  html.dingloft-direct-app body.dl-universal-mobile{position:relative!important;padding-top:calc(var(--dl-header-h) + var(--dl-safe-top))!important;padding-bottom:calc(92px + var(--dl-safe-bottom))!important;height:auto!important;min-height:100dvh!important;max-height:none!important;overflow:visible!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-x pan-y!important}
  html.dingloft-direct-app body.dl-universal-mobile main,html.dingloft-direct-app body.dl-universal-mobile #page-wrapper,html.dingloft-direct-app body.dl-universal-mobile .page-wrapper{position:relative!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;touch-action:pan-x pan-y!important}
  html.dingloft-direct-app body.dl-page-product .product-detail-section{padding-top:24px!important}
  html.dingloft-direct-app body.dl-page-ventas .hero-section{padding-top:28px!important}
  html.dingloft-direct-app.dl-scroll-locked{height:100%!important;overflow:hidden!important}
  html.dingloft-direct-app.dl-scroll-locked body.dl-universal-mobile{height:100%!important;overflow:hidden!important;touch-action:none!important}

  /* ONE stable cart animation for every customer page. No nested/staggered motion. */
  html.dl-universal-mobile .cart-overlay{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;background:rgba(0,0,0,.60)!important;backdrop-filter:blur(11px)!important;-webkit-backdrop-filter:blur(11px)!important;z-index:2147483010!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;transition:opacity .22s ease,visibility 0s linear .24s!important}
  html.dl-universal-mobile .cart-overlay.active{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transition:opacity .22s ease,visibility 0s linear 0s!important}
  html.dl-universal-mobile .cart-drawer{position:fixed!important;z-index:2147483011!important;left:max(10px,var(--dl-safe-left))!important;right:max(10px,var(--dl-safe-right))!important;top:auto!important;bottom:max(10px,var(--dl-safe-bottom))!important;width:auto!important;max-width:none!important;height:min(82dvh,760px)!important;max-height:calc(100dvh - var(--dl-safe-top) - 24px)!important;margin:0!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:28px!important;background:linear-gradient(155deg,rgba(18,23,30,.99),rgba(7,10,14,.995))!important;box-shadow:0 28px 90px rgba(0,0,0,.68),inset 0 1px 0 rgba(255,255,255,.07)!important;backdrop-filter:blur(28px) saturate(150%)!important;-webkit-backdrop-filter:blur(28px) saturate(150%)!important;overflow:hidden!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:translate3d(0,calc(100% + 42px),0) scale(.988)!important;transform-origin:50% 100%!important;transition:transform .36s cubic-bezier(.22,1,.36,1),opacity .18s ease,visibility 0s linear .36s!important;will-change:transform,opacity!important}
  html.dl-universal-mobile .cart-drawer.active{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:translate3d(0,0,0) scale(1)!important;transition:transform .36s cubic-bezier(.22,1,.36,1),opacity .18s ease,visibility 0s linear 0s!important}
  html.dl-universal-mobile .cart-drawer:before{content:""!important;display:block!important;position:absolute!important;z-index:30!important;top:8px!important;left:50%!important;width:42px!important;height:4px!important;border-radius:999px!important;background:rgba(255,255,255,.18)!important;transform:translateX(-50%)!important;pointer-events:none!important}
  html.dl-universal-mobile .cart-drawer:after{display:none!important;content:none!important}
  html.dl-universal-mobile .cart-header,html.dl-universal-mobile .cart-items-container,html.dl-universal-mobile .cart-footer,html.dl-universal-mobile .cart-item{animation:none!important;transform:none!important;transition:none!important;opacity:1!important}
  html.dl-universal-mobile .cart-header{position:relative!important;padding-top:24px!important;background:rgba(255,255,255,.015)!important;border-bottom:1px solid rgba(255,255,255,.08)!important}
  html.dl-universal-mobile .cart-items-container{overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important}
  html.dl-universal-mobile .cart-footer{background:rgba(7,10,14,.97)!important;border-top:1px solid rgba(255,255,255,.08)!important;padding-bottom:max(16px,var(--dl-safe-bottom))!important}
  html.dl-universal-mobile .btn-close-cart,#dlUniversalCartX{position:absolute!important;z-index:40!important;top:14px!important;right:14px!important;width:38px!important;height:38px!important;padding:0!important;border-radius:14px!important;border:1px solid rgba(255,255,255,.12)!important;background:rgba(8,11,15,.82)!important;color:#f5f8fb!important;display:grid!important;place-items:center!important;font-size:0!important;line-height:1!important;box-shadow:0 10px 28px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.06)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;cursor:pointer!important;transition:transform .12s ease,background .16s ease!important}
  html.dl-universal-mobile .btn-close-cart:before,#dlUniversalCartX:before{content:"×";font:400 25px/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;color:#fff}
  html.dl-universal-mobile .btn-close-cart i{display:none!important}html.dl-universal-mobile .btn-close-cart:active,#dlUniversalCartX:active{transform:scale(.92)!important;background:rgba(255,255,255,.10)!important}
  html.dl-universal-mobile .cart-item-img.has-cover{padding:0!important;overflow:hidden!important;border-radius:15px!important;background:#090b0e!important;border:1px solid rgba(255,255,255,.12)!important;box-shadow:0 9px 24px rgba(0,0,0,.30)!important}
  html.dl-universal-mobile .cart-item-img.has-cover img{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:cover!important;display:block!important;border-radius:inherit!important}
  @media(max-width:350px){.dl-u-item span{display:none!important}}
  @media(prefers-reduced-motion:reduce){#dlUniversalDock,.cart-overlay,.cart-drawer{transition-duration:.01ms!important}.cart-item{animation:none!important}}
  `;
  document.head.appendChild(css);

  function removeLegacyChrome(doc=document){
    doc.querySelectorAll('#main-navbar,nav.navbar-glass,.navbar.navbar-glass,#mobileAppDock,nav.mobile-app-dock,.mobile-app-dock,.dingloft-direct-top,#dingloftDirectTop,#dlDirectTop,#dlDirectDock').forEach(el=>el.remove());
    if (currentFile === 'producto') doc.querySelector('body > header')?.remove();
  }

  function blockingOverlayOpen(doc=document){
    return !!doc.querySelector('.cart-drawer.active,#cart-drawer.active,.search-overlay-fullscreen.active,#search-overlay-fullscreen.active,.side-menu.active,#side-menu.active,.site-install-guide.show');
  }

  function setScrollLocked(locked){
    if (isAppShell) return;
    document.documentElement.classList.toggle('dl-scroll-locked', !!locked);
    if (!locked && document.body) {
      document.body.classList.remove('no-scroll','cart-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('height');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('touch-action');
    }
  }

  function healScrollLock(){
    if (isAppShell) return;
    setScrollLocked(blockingOverlayOpen(document));
  }

  function setDirectClass(){
    if (!isAppShell) {
      document.documentElement.classList.add('dingloft-direct-app');
      document.body?.classList.add('dingloft-direct-app');
      if (PRODUCT_FILES.has(currentFile)) document.body?.classList.add('dl-page-product');
      if (currentFile === 'ventas') document.body?.classList.add('dl-page-ventas');
      if (currentFile === 'multitrack') document.body?.classList.add('dl-page-multitrack');
      if (currentFile === 'account' || currentFile === 'login' || currentFile === 'register') document.body?.classList.add('dl-page-account');
      removeLegacyChrome();
      healScrollLock();
    }
  }

  function buildChrome(){
    if (document.getElementById('dlUniversalHeader')) return;
    setDirectClass();
    const header = document.createElement('header');
    header.id = 'dlUniversalHeader';
    header.innerHTML = `
      <a id="dlUniversalBrand" href="/ventas?app=1#inicio" data-route="home" aria-label="Dingloft inicio">
        <img src="/img/pwa-liquid-rounded-192-v17.png?v=34" alt="Dingloft">
        <span class="copy"><strong>DINGLOFT</strong><small>Evolution Group</small></span>
      </a>
      <a id="dlUniversalAdmin" href="/admin.html" aria-label="Abrir administración">
        <svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5.2-3.4 8.7-8 10-4.6-1.3-8-4.8-8-10V6z"></path><path d="m9.5 12 1.6 1.7 3.5-4"></path></svg><span>Admin</span>
      </a>`;
    document.body.appendChild(header);

    const dock = document.createElement('nav');
    dock.id = 'dlUniversalDock';
    dock.setAttribute('aria-label','Navegación Dingloft');
    dock.innerHTML = `
      <a class="dl-u-item" href="/ventas?app=1#inicio" data-route="home" aria-label="Inicio"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V21h13V9.5"></path></svg><span>Inicio</span></a>
      <a class="dl-u-item" href="/ventas?app=1#catalogo" data-route="catalog" aria-label="Catálogo"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg><span>Catálogo</span></a>
      <span class="dl-u-cart-slot"><button id="dlUniversalCart" type="button" aria-label="Abrir carrito"><svg viewBox="0 0 24 24"><path d="M6 8h12l1 13H5z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg><span id="dlUniversalCount" data-empty="1">0</span></button></span>
      <a class="dl-u-item" href="/multitrack?app=1" data-route="multitrack" aria-label="Multitrack"><svg viewBox="0 0 24 24"><path d="M4 13v-2M8 17V7M12 20V4M16 17V7M20 13v-2"></path></svg><span>Multitrack</span></a>
      <a class="dl-u-item" href="/account?app=1" data-route="account" aria-label="Cuenta"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"></path></svg><span>Cuenta</span></a>`;
    document.body.appendChild(dock);
    document.body.classList.add('dl-chrome-ready');

    document.getElementById('dlUniversalCart')?.addEventListener('click', e => {
      e.preventDefault();
      openLegacyCart();
    });
    syncRoute();
    syncCount(true);
    syncAdmin();
  }

  function activeRoute(){
    const file = pathKey();
    if (file === 'app') {
      const r = new URLSearchParams(location.search).get('route') || document.body?.dataset?.appRoute || 'home';
      return r === 'page' ? 'catalog' : r;
    }
    if (file === 'multitrack') return 'multitrack';
    if (PRODUCT_FILES.has(file)) return 'catalog';
    if (file === 'account' || file === 'login' || file === 'register') return 'account';
    return 'home';
  }

  function syncRoute(){
    const r = activeRoute();
    document.querySelectorAll('#dlUniversalDock .dl-u-item[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === r));
    syncAdmin();
  }

  function syncAdmin(){
    const admin = document.getElementById('dlUniversalAdmin');
    if (!admin) return;
    const eligible = window.__dingloftAdminEligible === true;
    admin.classList.toggle('show', eligible && activeRoute() === 'home');
  }

  function readCart(){
    try { const c = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(c) ? c : []; }
    catch (_) { return []; }
  }
  function writeCart(cart){ try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) {} }
  function readCoverMap(){ try { const m = JSON.parse(localStorage.getItem(COVER_KEY)||'{}'); return m && typeof m === 'object' ? m : {}; } catch (_) { return {}; } }
  function writeCoverMap(map){ try { localStorage.setItem(COVER_KEY, JSON.stringify(map)); } catch (_) {} }

  function rememberCurrentMultitrackCovers(){
    const map = readCoverMap();
    let changed = false;
    document.querySelectorAll('[data-id][data-cover]').forEach(el => {
      const id = String(el.getAttribute('data-id') || '').trim();
      const cover = String(el.getAttribute('data-cover') || '').trim();
      if (id && cover && map[id] !== cover) { map[id] = cover; changed = true; }
    });
    if (Array.isArray(window.DINGLOFT_MULTITRACKS)) {
      window.DINGLOFT_MULTITRACKS.forEach(mt => {
        const id = String(mt?.id || '').trim(), cover = String(mt?.cover || '').trim();
        if (id && cover && map[id] !== cover) { map[id] = cover; changed = true; }
      });
    }
    if (changed) writeCoverMap(map);
    repairCartCoverData(map);
  }

  function repairCartCoverData(map = readCoverMap()){
    const cart = readCart();
    let changed = false;
    cart.forEach(item => {
      const id = String(item?.id || '').trim();
      const type = String(item?.type || '').toLowerCase();
      const multi = id.startsWith('MT-') || type.includes('multitrack');
      if (multi && !item.cover && map[id]) { item.cover = map[id]; changed = true; }
    });
    if (changed) writeCart(cart);
    return cart;
  }

  let lastCount = -1;
  function syncCount(force = false){
    const cart = repairCartCoverData();
    const n = cart.reduce((sum,x)=>sum + Math.max(0,Number(x?.qty || 1)),0);
    const badge = document.getElementById('dlUniversalCount');
    if (badge) {
      badge.textContent = String(n);
      badge.dataset.empty = n ? '0' : '1';
      if (!force && n !== lastCount) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
    }
    lastCount = n;
    return cart;
  }

  function cartImageFor(item){
    if (item?.cover) return String(item.cover);
    const img = String(item?.img || 'dingloft').trim() || 'dingloft';
    if (/^(https?:)?\/\//i.test(img) || img.startsWith('/') || img.includes('/')) return img;
    return `/img/${img}.png`;
  }

  function patchCartCovers(doc){
    try {
      const cart = repairCartCoverData();
      const items = [...doc.querySelectorAll('.cart-items-container .cart-item,#cart-items-container .cart-item')];
      items.forEach((row,index) => {
        const item = cart[index]; if (!item) return;
        const wrap = row.querySelector('.cart-item-img');
        const img = wrap?.querySelector('img');
        if (!wrap || !img) return;
        const src = cartImageFor(item);
        if (item.cover) wrap.classList.add('has-cover'); else wrap.classList.remove('has-cover');
        if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
        img.onerror = () => { img.onerror = null; img.src = '/img/dingloft.png'; wrap.classList.remove('has-cover'); };
      });
    } catch (_) {}
  }

  function cartStyleText(){
    return css.textContent.split('/* ONE stable cart animation for every customer page. No nested/staggered motion. */')[1] || '';
  }

  function enhanceCartDocument(doc){
    if (!doc || !doc.documentElement) return;
    doc.documentElement.classList.add('dl-universal-mobile');
    doc.body?.classList.add('dl-universal-mobile');
    if (!doc.getElementById('dlUniversalCartChildStyle')) {
      const style = doc.createElement('style'); style.id='dlUniversalCartChildStyle'; style.textContent = `:root{--dl-safe-top:env(safe-area-inset-top,0px);--dl-safe-bottom:env(safe-area-inset-bottom,0px);--dl-safe-left:env(safe-area-inset-left,0px);--dl-safe-right:env(safe-area-inset-right,0px)}${cartStyleText()}`; doc.head.appendChild(style);
    }
    const drawer = doc.querySelector('.cart-drawer,#cart-drawer');
    const container = doc.querySelector('.cart-items-container,#cart-items-container');
    if (container && !container.__dlUniversalCoverObserver) {
      container.__dlUniversalCoverObserver = true;
      new MutationObserver(() => patchCartCovers(doc)).observe(container,{childList:true,subtree:true});
    }
    patchCartCovers(doc);
    if (drawer && !drawer.__dlUniversalDrawerObserver) {
      drawer.__dlUniversalDrawerObserver = true;
      new MutationObserver(() => syncDrawerFrom(drawer)).observe(drawer,{attributes:true,attributeFilter:['class','style']});
      if (!doc.querySelector('#close-cart-btn,.btn-close-cart,#dlUniversalCartX')) {
        const x = doc.createElement('button'); x.id='dlUniversalCartX'; x.type='button'; x.setAttribute('aria-label','Cerrar carrito'); drawer.appendChild(x);
        x.addEventListener('click', ev => { ev.preventDefault(); closeDrawer(doc, drawer); });
      }
      syncDrawerFrom(drawer);
    }
  }

  function syncDrawerFrom(drawer){
    const open = !!drawer?.classList?.contains('active');
    clearTimeout(closeTimer);
    if (open) {
      document.body.classList.add('dl-cart-open');
      if (!isAppShell) document.documentElement.classList.add('dl-scroll-locked');
      patchCartCovers(drawer.ownerDocument);
    } else {
      closeTimer = setTimeout(() => {
        document.body.classList.remove('dl-cart-open');
        healScrollLock();
      }, CART_ANIM_MS - 30);
    }
  }

  function closeDrawer(doc, drawer){
    const close = doc.querySelector('#close-cart-btn,.btn-close-cart');
    if (close) { close.click(); return; }
    drawer?.classList.remove('active');
    doc.querySelector('.cart-overlay,#cart-overlay')?.classList.remove('active');
    doc.body?.classList.remove('no-scroll','cart-open');
    syncDrawerFrom(drawer);
  }

  function directLegacyButton(){
    return document.querySelector('.btn-floating-cart.cart-btn-global,#main-cart-btn,.cart-btn-global,.floating-cart,.cart-fab');
  }

  function currentAppFrame(){
    return document.querySelector('#stage iframe.active') || [...document.querySelectorAll('#stage iframe')].at(-1) || null;
  }

  function openLegacyCart(){
    rememberCurrentMultitrackCovers();
    syncCount();
    if (isAppShell) {
      const hidden = document.getElementById('cart');
      if (hidden) { hidden.click(); setTimeout(enhanceActiveFrame,70); return; }
    }
    const btn = directLegacyButton();
    if (btn) {
      btn.click();
      setTimeout(() => { enhanceCartDocument(document); const drawer=document.querySelector('.cart-drawer,#cart-drawer'); syncDrawerFrom(drawer); },40);
    }
  }

  function enhanceActiveFrame(){
    const frame = currentAppFrame();
    try { if (frame?.contentDocument) enhanceCartDocument(frame.contentDocument); } catch (_) {}
  }

  function installScrollGuard(){
    if (isAppShell || !document.body) return;
    const schedule = () => requestAnimationFrame(healScrollLock);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    document.querySelectorAll('.cart-drawer,#cart-drawer,.cart-overlay,#cart-overlay,.search-overlay-fullscreen,#search-overlay-fullscreen,.side-menu,#side-menu,.site-install-guide').forEach(el=>{
      try{observer.observe(el,{attributes:true,attributeFilter:['class']});}catch(_){}
    });
    addEventListener('pageshow',schedule,{passive:true});
    addEventListener('focus',schedule,{passive:true});
    addEventListener('orientationchange',schedule,{passive:true});
    document.addEventListener('touchstart',schedule,{passive:true});
    setTimeout(schedule,0);
    setTimeout(schedule,250);
  }

  function watchFrames(){
    if (!isAppShell) { enhanceCartDocument(document); return; }
    const stage = document.getElementById('stage'); if (!stage) return;
    const attach = frame => {
      if (!(frame instanceof HTMLIFrameElement) || frame.__dlUniversalFrame) return;
      frame.__dlUniversalFrame = true;
      frame.addEventListener('load', () => setTimeout(() => { try { enhanceCartDocument(frame.contentDocument); } catch (_) {} },20));
      try { if (frame.contentDocument?.readyState === 'complete') enhanceCartDocument(frame.contentDocument); } catch (_) {}
    };
    stage.querySelectorAll('iframe').forEach(attach);
    new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if (n instanceof HTMLIFrameElement) attach(n); }))).observe(stage,{childList:true});
  }

  function installHistorySync(){
    ['pushState','replaceState'].forEach(name => {
      const original = history[name];
      if (original.__dlUniversalWrapped) return;
      const wrapped = function(...args){ const out = original.apply(this,args); queueMicrotask(syncRoute); return out; };
      wrapped.__dlUniversalWrapped = true; history[name] = wrapped;
    });
    addEventListener('popstate',syncRoute);
  }

  // Multitrack add buttons: persist the real album art even if the legacy page code is old.
  document.addEventListener('click', e => {
    const btn = e.target?.closest?.('.btn-add-cart[data-id]');
    if (!btn) return;
    const id = String(btn.getAttribute('data-id') || '').trim();
    const cover = String(btn.getAttribute('data-cover') || '').trim();
    if (id && cover) {
      const map = readCoverMap(); map[id] = cover; writeCoverMap(map);
      setTimeout(() => {
        const cart = readCart(); let changed=false;
        cart.forEach(item => { if (String(item?.id||'') === id && item.cover !== cover) { item.cover=cover; changed=true; } });
        if (changed) writeCart(cart);
        syncCount(); patchCartCovers(document); enhanceActiveFrame();
      },0);
    } else {
      setTimeout(() => { syncCount(); patchCartCovers(document); enhanceActiveFrame(); },0);
    }
  }, true);

  buildChrome();
  installScrollGuard();
  rememberCurrentMultitrackCovers();
  watchFrames();
  installHistorySync();
  enhanceCartDocument(document);

  addEventListener('storage', e => { if (e.key === CART_KEY || e.key === COVER_KEY) { syncCount(); patchCartCovers(document); enhanceActiveFrame(); } });
  addEventListener('pageshow', () => { syncRoute(); syncCount(); rememberCurrentMultitrackCovers(); enhanceActiveFrame(); });
  addEventListener('focus', () => { syncRoute(); syncCount(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { syncRoute(); syncCount(); } });
  setTimeout(() => { rememberCurrentMultitrackCovers(); syncCount(true); enhanceActiveFrame(); },700);

  window.DingloftMobileChrome = { sync: () => { syncRoute(); syncCount(); syncAdmin(); }, patchCartCovers, version:'36' };
})();
