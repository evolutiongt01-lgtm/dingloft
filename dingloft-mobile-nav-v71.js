/* Dingloft Mobile Nav v87 (served through the v71 filename for compatibility)
   Global mobile chrome + scroll-lock recovery.
   v87 prevents stale no-scroll/cart locks from freezing product pages after media/fullscreen. */
(() => {
  'use strict';

  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua) || iOS || (navigator.maxTouchPoints > 0 && matchMedia('(max-width:1024px)').matches);
  if (!mobile || window.self !== window.top) return;

  // Stop every older bootstrap from creating another mobile chrome later.
  window.__DINGLOFT_MOBILE_CHROME_V70__ = true;
  window.__DINGLOFT_MOBILE_CHROME_V71__ = true;
  window.__DINGLOFT_MOBILE_NAV_V71__ = true;
  window.__DINGLOFT_MOBILE_NAV_V72__ = true;

  const HEADER_ID = 'dlMobileHeaderV71';
  const DOCK_ID = 'dlMobileDockV71';
  const CART_KEY = 'dingloft_cart';
  const PRODUCT_FILES = new Set([
    'autocad','cinema4d','dual','esword','logic','mainstage',
    'nord','office','producto','rhodes','sketchup','yamahakeys'
  ]);

  // Apply this before body parsing finishes so legacy bars never flash on screen.
  const early = document.createElement('style');
  early.id = 'dingloft-mobile-nav-v71-early';
  early.textContent = `
    @media(max-width:1024px){
      #main-navbar,nav.navbar-glass,.navbar.navbar-glass,
      #mobileAppDock,nav.mobile-app-dock,.mobile-app-dock,
      .dingloft-direct-top,#dingloftDirectTop,#dlDirectTop,#dlDirectDock,
      #dlUniversalHeader,#dlUniversalDock,#dlGlobalChromeHost,
      body>.dock,body>.top{
        display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;
      }
      html.dl-mobile-nav-v71{height:auto!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-x:none!important;touch-action:pan-y!important}
      html.dl-mobile-nav-v71 body{position:relative!important;height:auto!important;min-height:100dvh!important;max-height:none!important;overflow-x:hidden!important;overflow-y:visible!important;overscroll-behavior-x:none!important;touch-action:pan-y!important;padding-top:calc(68px + env(safe-area-inset-top,0px))!important;padding-bottom:calc(90px + env(safe-area-inset-bottom,0px))!important}
      html.dl-mobile-nav-v71 body.cart-open,html.dl-mobile-nav-v71 body.no-scroll{height:100dvh!important;overflow:hidden!important;touch-action:none!important}
      html.dl-mobile-nav-v71 body>.btn-floating-cart{position:fixed!important;left:-9999px!important;right:auto!important;bottom:0!important;width:1px!important;height:1px!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:none!important}
      html.dl-mobile-nav-v71 .mt-quickbar{top:0!important}
      html.dl-mobile-nav-v71 #progress.progress{display:none!important;opacity:0!important;visibility:hidden!important}
      html.dl-mobile-nav-v71 #dlMobileHeaderV71,html.dl-mobile-nav-v71 #dlMobileDockV71{display:block!important;visibility:visible!important;opacity:1!important}
    }
  `;
  (document.head || document.documentElement).appendChild(early);
  document.documentElement.classList.add('dl-mobile-nav-v71');

  const pathKey = () => (location.pathname.split('/').filter(Boolean).pop() || 'ventas').toLowerCase().replace(/\.html$/,'');

  function activeRoute(){
    const file = pathKey();
    if (file === 'multitrack') return 'multitrack';
    if (PRODUCT_FILES.has(file) || file === 'tienda') return 'catalog';
    if (file === 'account' || file === 'login' || file === 'register') return 'account';
    if ((file === 'ventas' || file === 'index' || file === 'launch' || file === '') && /catalogo/i.test(location.hash || '')) return 'catalog';
    return 'home';
  }

  function countCart(){
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (!Array.isArray(cart)) return 0;
      return cart.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1) || 1), 0);
    } catch (_) { return 0; }
  }

  function legacyCartButton(){
    return document.querySelector('.btn-floating-cart.cart-btn-global,#main-cart-btn,.cart-btn-global,.floating-cart,.cart-fab,[data-cart-open]');
  }

  function openCart(){
    const btn = legacyCartButton();
    if (btn) {
      try { btn.click(); return; } catch (_) {}
    }
    const overlay = document.querySelector('.cart-overlay,#cart-overlay');
    const drawer = document.querySelector('.cart-drawer,#cart-drawer');
    if (overlay || drawer) {
      overlay?.classList.add('active');
      drawer?.classList.add('active');
      document.body?.classList.add('cart-open','no-scroll');
    }
  }

  const removeSelectors = [
    '#main-navbar','nav.navbar-glass','.navbar.navbar-glass',
    '#mobileAppDock','nav.mobile-app-dock','.mobile-app-dock',
    '.dingloft-direct-top','#dingloftDirectTop','#dlDirectTop','#dlDirectDock',
    '#dlUniversalHeader','#dlUniversalDock','#dlGlobalChromeHost'
  ];

  function isOurNode(node){ return node?.id === HEADER_ID || node?.id === DOCK_ID; }

  function removeLegacy(root = document){
    for (const selector of removeSelectors) {
      root.querySelectorAll?.(selector).forEach(el => { if (!isOurNode(el)) el.remove(); });
    }
  }

  function makeHost(id, where){
    document.getElementById(id)?.remove();
    const host = document.createElement('div');
    host.id = id;
    host.setAttribute('data-dingloft-mobile-nav','71');
    host.style.setProperty('position','fixed','important');
    host.style.setProperty('z-index', where === 'header' ? '2147483646' : '2147483647','important');
    host.style.setProperty('margin','0','important');
    host.style.setProperty('padding','0','important');
    host.style.setProperty('border','0','important');
    host.style.setProperty('box-sizing','border-box','important');
    host.style.setProperty('transform','translate3d(0,0,0)','important');
    host.style.setProperty('-webkit-transform','translate3d(0,0,0)','important');
    host.style.setProperty('backface-visibility','hidden','important');
    host.style.setProperty('-webkit-backface-visibility','hidden','important');
    host.style.setProperty('isolation','isolate','important');
    host.style.setProperty('pointer-events','auto','important');
    host.style.setProperty('display','block','important');
    host.style.setProperty('visibility','visible','important');
    host.style.setProperty('opacity','1','important');
    if (where === 'header') {
      host.style.setProperty('top','0','important');
      host.style.setProperty('left','0','important');
      host.style.setProperty('right','0','important');
      host.style.setProperty('bottom','auto','important');
      host.style.setProperty('width','100%','important');
      host.style.setProperty('height','calc(68px + env(safe-area-inset-top,0px))','important');
    } else {
      host.style.setProperty('top','auto','important');
      host.style.setProperty('left','max(10px,env(safe-area-inset-left,0px))','important');
      host.style.setProperty('right','max(10px,env(safe-area-inset-right,0px))','important');
      host.style.setProperty('bottom','calc(5px + env(safe-area-inset-bottom,0px))','important');
      host.style.setProperty('width','auto','important');
      host.style.setProperty('height','66px','important');
    }
    return host;
  }

  function headerMarkup(root){
    const style = document.createElement('style');
    style.textContent = `
      :host{display:block;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",sans-serif;color-scheme:dark}
      *,*::before,*::after{box-sizing:border-box}
      .bar{position:relative;width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;padding:env(safe-area-inset-top,0px) max(14px,env(safe-area-inset-right,0px)) 0 max(14px,env(safe-area-inset-left,0px));background:linear-gradient(180deg,#040609 0%,#05070a 100%);border-bottom:1px solid rgba(255,255,255,.075);box-shadow:0 8px 28px rgba(0,0,0,.24)}
      .bar::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent 4%,rgba(109,214,255,.42) 44%,rgba(141,115,255,.24) 62%,transparent 96%);opacity:.58;pointer-events:none}
      .spark-field{position:absolute;left:0;right:0;bottom:-34px;height:38px;overflow:visible;pointer-events:none;opacity:0;transition:opacity .12s ease}
      .bar.loading .spark-field{opacity:1}
      .spark{--x:50%;--dx:0px;--sz:3px;--delay:0s;position:absolute;left:var(--x);top:0;width:var(--sz);height:var(--sz);border-radius:50%;background:rgba(226,249,255,.96);box-shadow:0 0 8px rgba(108,220,255,.95),0 0 18px rgba(128,119,255,.45);opacity:0;transform:translate3d(0,-2px,0) scale(.4);animation:dlSparkFall .92s cubic-bezier(.18,.72,.22,1) var(--delay) infinite}
      .spark:nth-child(3n){background:rgba(255,255,255,.98);box-shadow:0 0 7px rgba(255,255,255,.92),0 0 17px rgba(116,212,255,.42)}
      .spark:nth-child(4n){border-radius:1px;transform:rotate(45deg)}
      .bar.loading::after{animation:dlHeaderSeam 1.1s ease-in-out infinite}
      @keyframes dlSparkFall{0%{opacity:0;transform:translate3d(0,-3px,0) scale(.35)}18%{opacity:1}64%{opacity:.82}100%{opacity:0;transform:translate3d(var(--dx),31px,0) scale(.08)}}
      @keyframes dlHeaderSeam{0%,100%{opacity:.36;filter:brightness(1)}50%{opacity:.88;filter:brightness(1.5)}}
      @media(prefers-reduced-motion:reduce){.spark{animation:none!important}.bar.loading .spark-field{opacity:.45}.bar.loading::after{animation:none!important}}
      .brand{height:68px;display:flex;align-items:center;justify-content:center;gap:11px;color:#fff;text-decoration:none;-webkit-tap-highlight-color:transparent}
      .brand img{width:36px;height:36px;border-radius:12px;object-fit:cover;display:block;box-shadow:0 7px 19px rgba(0,0,0,.30)}
      .copy{line-height:1}.copy strong{display:block;color:#f7fbff;font-size:.90rem;font-weight:850;letter-spacing:.18em;white-space:nowrap}.copy small{display:block;margin-top:6px;color:#66758a;font-size:.50rem;font-weight:750;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap}
      .admin{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:15px;height:38px;padding:0 10px;border:1px solid rgba(112,220,255,.18);border-radius:13px;background:#0b1117;color:#a8eaff;text-decoration:none;display:none;align-items:center;gap:6px;font-size:.54rem;font-weight:780}.admin.show{display:flex}.admin svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    `;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = `
      <a class="brand" href="/ventas?app=1#inicio" aria-label="Dingloft inicio">
        <img src="/img/pwa-liquid-rounded-192-v17.png" alt="Dingloft">
        <span class="copy"><strong>DINGLOFT</strong><small>Evolution Group</small></span>
      </a>
      <a class="admin" href="/admin" aria-label="Administración"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5.2-3.4 8.7-8 10-4.6-1.3-8-4.8-8-10V6z"></path><path d="m9.5 12 1.6 1.7 3.5-4"></path></svg><span>Admin</span></a>
      <span class="spark-field" aria-hidden="true">
        <i class="spark" style="--x:8%;--dx:-7px;--sz:2px;--delay:.03s"></i>
        <i class="spark" style="--x:17%;--dx:5px;--sz:3px;--delay:.28s"></i>
        <i class="spark" style="--x:29%;--dx:-3px;--sz:2px;--delay:.52s"></i>
        <i class="spark" style="--x:39%;--dx:8px;--sz:3px;--delay:.16s"></i>
        <i class="spark" style="--x:48%;--dx:-5px;--sz:4px;--delay:.42s"></i>
        <i class="spark" style="--x:57%;--dx:4px;--sz:2px;--delay:.67s"></i>
        <i class="spark" style="--x:67%;--dx:-8px;--sz:3px;--delay:.22s"></i>
        <i class="spark" style="--x:78%;--dx:6px;--sz:2px;--delay:.58s"></i>
        <i class="spark" style="--x:89%;--dx:-4px;--sz:3px;--delay:.10s"></i>
        <i class="spark" style="--x:95%;--dx:3px;--sz:2px;--delay:.74s"></i>
      </span>`;
    root.append(style, bar);
  }

  function dockMarkup(root){
    const style = document.createElement('style');
    style.textContent = `
      :host{display:block;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",sans-serif;color-scheme:dark}
      *,*::before,*::after{box-sizing:border-box}
      .dock{position:relative;width:100%;height:66px;padding:6px 7px;display:grid;grid-template-columns:1fr 1fr 76px 1fr 1fr;align-items:center;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:linear-gradient(180deg,rgba(18,22,29,.97),rgba(8,10,14,.985));box-shadow:0 18px 55px rgba(0,0,0,.56),inset 0 1px 0 rgba(255,255,255,.07);overflow:visible}
      .item{height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;border-radius:17px;background:transparent;color:#687384;text-decoration:none;font-size:.48rem;font-weight:760;line-height:1;-webkit-tap-highlight-color:transparent;transition:color .16s ease,background .16s ease,transform .10s ease}.item svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.item.active{color:#eaf5ff;background:rgba(255,255,255,.05)}.item.active svg{color:#79dcff;filter:drop-shadow(0 0 8px rgba(109,214,255,.25))}.item:active{transform:scale(.92)}
      .cart-slot{position:relative;height:52px;display:flex;align-items:center;justify-content:center}.cart{position:absolute;left:50%;top:-9px;width:60px;height:60px;margin:0;padding:0;border:1px solid rgba(255,255,255,.88);border-radius:20px;background:linear-gradient(145deg,#fbfdff,#eaf1f5);color:#080b0e;display:grid;place-items:center;transform:translateX(-50%);box-shadow:0 17px 43px rgba(0,0,0,.45);cursor:pointer;-webkit-tap-highlight-color:transparent}.cart:active{transform:translateX(-50%) scale(.92)}.cart svg{width:27px;height:27px;stroke:currentColor;fill:none;stroke-width:1.8}.count{position:absolute;top:-5px;right:-6px;min-width:25px;height:25px;padding:0 6px;border:2px solid #050608;border-radius:999px;background:#24aaf2;color:#fff;display:grid;place-items:center;font-size:.68rem;font-weight:850}.count.empty{display:none}
      @media(max-width:350px){.item span{display:none}}
    `;
    const dock = document.createElement('nav');
    dock.className = 'dock';
    dock.setAttribute('aria-label','Navegación Dingloft');
    dock.innerHTML = `
      <a class="item" href="/ventas?app=1#inicio" data-route="home" aria-label="Inicio"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V21h13V9.5"></path></svg><span>Inicio</span></a>
      <a class="item" href="/ventas?app=1#catalogo" data-route="catalog" aria-label="Catálogo"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg><span>Catálogo</span></a>
      <span class="cart-slot"><button class="cart" type="button" aria-label="Abrir carrito"><svg viewBox="0 0 24 24"><path d="M6 8h12l1 13H5z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg><span class="count empty">0</span></button></span>
      <a class="item" href="/multitrack?app=1" data-route="multitrack" aria-label="Multitrack"><svg viewBox="0 0 24 24"><path d="M4 13v-2M8 17V7M12 20V4M16 17V7M20 13v-2"></path></svg><span>Multitrack</span></a>
      <a class="item" href="/account?app=1" data-route="account" aria-label="Cuenta"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"></path></svg><span>Cuenta</span></a>`;
    root.append(style, dock);
  }

  let headerHost, dockHost, headerRoot, dockRoot;
  const LOAD_KEY = 'dingloft_mobile_header_loading_v72';
  let loadStopTimer = 0;

  function headerBar(){ return headerRoot?.querySelector('.bar') || null; }
  function setHeaderLoading(on){
    const bar = headerBar();
    if (!bar) return;
    bar.classList.toggle('loading', Boolean(on));
  }
  function rememberLoad(){ try { sessionStorage.setItem(LOAD_KEY, String(Date.now())); } catch(_) {} }
  function clearRememberedLoad(){ try { sessionStorage.removeItem(LOAD_KEY); } catch(_) {} }
  function hasRecentLoad(){
    try { const t=Number(sessionStorage.getItem(LOAD_KEY)||0); return t>0 && (Date.now()-t)<12000; } catch(_) { return false; }
  }
  function beginHeaderLoading(){ clearTimeout(loadStopTimer); rememberLoad(); setHeaderLoading(true); }
  function finishHeaderLoading(delay=260){
    clearTimeout(loadStopTimer);
    loadStopTimer=setTimeout(()=>{ setHeaderLoading(false); clearRememberedLoad(); }, delay);
  }

  function installRuntimeGuards(){
    if (document.getElementById('dingloft-mobile-nav-v72-runtime')) return;
    const style=document.createElement('style');
    style.id='dingloft-mobile-nav-v72-runtime';
    style.textContent=`
      @media(max-width:1024px){
        html.dl-mobile-nav-v71 #dlMobileHeaderV71,html.dl-mobile-nav-v71 #dlMobileDockV71{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
        html.dl-mobile-nav-v71 #progress.progress{display:none!important;visibility:hidden!important;opacity:0!important}
        html.dl-mobile-nav-v71 .cart-footer{padding-bottom:calc(106px + env(safe-area-inset-bottom,0px))!important;scroll-padding-bottom:calc(106px + env(safe-area-inset-bottom,0px))!important;-webkit-overflow-scrolling:touch!important}
        html.dl-mobile-nav-v71 .cart-footer #paypal-container-wrapper,html.dl-mobile-nav-v71 .cart-footer #free-checkout-btn,html.dl-mobile-nav-v71 .cart-footer #continue-shopping-box{position:relative!important;z-index:2!important}
        html.dl-mobile-nav-v71 .success-modal-box{padding-bottom:calc(104px + env(safe-area-inset-bottom,0px))!important;scroll-padding-bottom:calc(104px + env(safe-area-inset-bottom,0px))!important}
        html.dl-mobile-nav-v71 .checkout{margin-bottom:calc(18px + env(safe-area-inset-bottom,0px))!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function wireLoadingLinks(root){
    root?.querySelectorAll?.('a[href]').forEach(a=>{
      if (a.dataset.dlLoadBound==='1') return;
      a.dataset.dlLoadBound='1';
      a.addEventListener('click',()=>beginHeaderLoading(),{passive:true});
    });
  }

  function hasRealScrollBlocker(){
    if (document.fullscreenElement || document.webkitFullscreenElement) return true;
    if (document.documentElement.classList.contains('dl-video-modal-open')) return true;
    return Boolean(document.querySelector([
      '.cart-overlay.active','#cart-overlay.active','.cart-drawer.active','#cart-drawer.active',
      '.search-overlay-fullscreen.active','.side-menu-overlay.active','.side-menu-drawer.active',
      '.success-modal-overlay.active','.liquid-modal-overlay.active','.modal.show',
      '[data-dingloft-scroll-lock="1"]'
    ].join(',')));
  }

  function healStaleScrollLock(){
    const body=document.body;
    if (!body || hasRealScrollBlocker()) return;
    const hadLock=body.classList.contains('no-scroll') || body.classList.contains('cart-open');
    if (hadLock) body.classList.remove('no-scroll','cart-open');
    // Some browser/video flows leave inline lock styles even after the class is gone.
    if (body.style.overflow === 'hidden') body.style.removeProperty('overflow');
    if (body.style.touchAction === 'none') body.style.removeProperty('touch-action');
    if (body.style.height === '100vh' || body.style.height === '100dvh') body.style.removeProperty('height');
  }

  function sync(){
    if (!dockRoot) return;
    const route = activeRoute();
    dockRoot.querySelectorAll('.item[data-route]').forEach(el => el.classList.toggle('active', el.dataset.route === route));
    const count = countCart();
    const badge = dockRoot.querySelector('.count');
    if (badge) { badge.textContent = String(count); badge.classList.toggle('empty', count < 1); }
    const admin = headerRoot?.querySelector('.admin');
    if (admin) admin.classList.toggle('show', window.__dingloftAdminEligible === true && route === 'home');
  }

  function mount(){
    if (!document.body || document.getElementById(HEADER_ID) || document.getElementById(DOCK_ID)) return;
    document.body.classList.add('dl-mobile-nav-v71');
    installRuntimeGuards();
    removeLegacy(document);

    headerHost = makeHost(HEADER_ID, 'header');
    dockHost = makeHost(DOCK_ID, 'dock');
    headerRoot = headerHost.attachShadow({mode:'open'});
    dockRoot = dockHost.attachShadow({mode:'open'});
    headerMarkup(headerRoot);
    dockMarkup(dockRoot);

    // Append as direct body children. The HOSTS themselves are fixed; no full-screen parent is involved.
    document.body.append(headerHost, dockHost);
    dockRoot.querySelector('.cart')?.addEventListener('click', e => { e.preventDefault(); openCart(); });
    wireLoadingLinks(headerRoot);
    wireLoadingLinks(dockRoot);
    if (hasRecentLoad()) setHeaderLoading(true);
    sync();

    // Remove only newly-added legacy chrome nodes. No global high-frequency mutation loop.
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element) || isOurNode(node)) continue;
          if (removeSelectors.some(s => node.matches?.(s))) node.remove();
          else removeLegacy(node);
        }
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});

    // Same-tab cart writes do not emit a storage event. The same tiny timer also
    // heals stale scroll locks left by fullscreen/video/browser transitions.
    setInterval(()=>{ sync(); healStaleScrollLock(); }, 650);
    requestAnimationFrame(()=>healStaleScrollLock());
  }

  ['pushState','replaceState'].forEach(name => {
    try {
      const original = history[name];
      history[name] = function(...args){ const out = original.apply(this,args); queueMicrotask(sync); return out; };
    } catch (_) {}
  });
  addEventListener('popstate', sync, {passive:true});
  addEventListener('hashchange', sync, {passive:true});
  addEventListener('storage', e => { if (e.key === CART_KEY) sync(); });
  addEventListener('pageshow', sync, {passive:true});
  addEventListener('focus', sync, {passive:true});

  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a=e.target?.closest?.('a[href]');
    if (!a || a.target==='_blank' || a.hasAttribute('download')) return;
    let u; try { u=new URL(a.href, location.href); } catch(_) { return; }
    if (u.origin!==location.origin || !/^https?:$/.test(u.protocol)) return;
    const sameDoc=u.pathname===location.pathname && u.search===location.search;
    if (sameDoc && u.hash) return;
    beginHeaderLoading();
  }, true);
  addEventListener('load',()=>{ finishHeaderLoading(320); setTimeout(healStaleScrollLock,80); },{once:true});
  addEventListener('pageshow',()=>{ finishHeaderLoading(220); setTimeout(healStaleScrollLock,80); },{passive:true});
  addEventListener('focus',()=>setTimeout(healStaleScrollLock,80),{passive:true});
  addEventListener('fullscreenchange',()=>setTimeout(healStaleScrollLock,140),{passive:true});
  addEventListener('webkitfullscreenchange',()=>setTimeout(healStaleScrollLock,140),{passive:true});
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) setTimeout(healStaleScrollLock,100); },{passive:true});

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, {once:true});
})();
