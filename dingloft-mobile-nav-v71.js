/* Dingloft Persistent Mobile Shell v97 (served through the v71 filename for compatibility)
   Header + search + bottom nav remain mounted while only the content frame changes.
   The independent mobile cart is loaded once and also remains mounted. Desktop stays on its persistent desktop shell. */
(() => {
  'use strict';

  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua) || iOS || (navigator.maxTouchPoints > 0 && matchMedia('(max-width:1024px)').matches);
  if (!mobile || window.self !== window.top) return;

  // v93: direct mobile/tablet pages enter the persistent App Shell immediately.
  // Once inside /app, navigation swaps only the content iframe; this script/header never remounts.
  try {
    const bootParams = new URLSearchParams(location.search);
    const bootPart = (location.pathname.split('/').filter(Boolean).pop() || 'index').toLowerCase().replace(/\.html$/,'');
    if (bootParams.get('embed') !== '1' && !['app','admin','commerce-admin','launch'].includes(bootPart)) {
      let route='page', src='';
      const hash=location.hash||'';
      if (['index','tienda','ventas',''].includes(bootPart)) route=/#catalogo/i.test(hash)?'catalog':'home';
      else if (bootPart==='multitrack'||bootPart==='multitracks') route='multitrack';
      else if (bootPart==='account'||bootPart==='cuenta') route='account';
      else {
        const u=new URL(location.href);u.searchParams.delete('app');u.searchParams.delete('direct');u.searchParams.delete('embed');
        src=`${bootPart}.html${u.search}${u.hash}`;
      }
      const shell=new URL('/app',location.origin);shell.searchParams.set('route',route);if(route==='page'&&src)shell.searchParams.set('src',src);
      document.documentElement.style.visibility='hidden';
      location.replace(`${shell.pathname}${shell.search}`);
      return;
    }
  } catch (_) {}

  // Stop every older bootstrap from creating another mobile chrome later.
  window.__DINGLOFT_MOBILE_CHROME_V70__ = true;
  window.__DINGLOFT_MOBILE_CHROME_V71__ = true;
  window.__DINGLOFT_MOBILE_NAV_V71__ = true;
  window.__DINGLOFT_MOBILE_NAV_V72__ = true;
  window.__DINGLOFT_MOBILE_NAV_V88__ = true;
  window.__DINGLOFT_MOBILE_SHELL_V92__ = true;
  window.__DINGLOFT_MOBILE_SHELL_V93__ = true;

  const HEADER_ID = 'dlMobileHeaderV71';
  const DOCK_ID = 'dlMobileDockV71';
  const SEARCH_ID = 'dlMobileSearchV89';
  const CART_KEY = 'dingloft_cart';
  const OPEN_CART_KEY = 'dingloft_open_cart';
  const MOBILE_CART_SRC = '/dingloft-mobile-cart-v92.js?v=94';
  let mobileCartLoadPromise = null;
  const WORKER = String(window.DINGLOFT_WORKER_BASE || 'https://autumn-breeze-dfa0.evolutiongt01.workers.dev').replace(/\/$/, '');
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
      html.dl-mobile-nav-v71 body.cart-open,html.dl-mobile-nav-v71 body.no-scroll,html.dl-mobile-nav-v71 body.cart-open.no-scroll{position:relative!important;height:auto!important;min-height:100dvh!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
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
    if (file === 'app') {
      const q = new URLSearchParams(location.search);
      const route = String(q.get('route') || document.body?.dataset?.appRoute || 'home').toLowerCase();
      if (route === 'multitrack') return 'multitrack';
      if (route === 'account') return 'account';
      if (route === 'catalog') return 'catalog';
      if (route === 'page') {
        const src = String(q.get('src') || '');
        let page = '';
        try { page = (new URL(src, location.origin).pathname.split('/').filter(Boolean).pop() || '').toLowerCase().replace(/\.html$/,''); } catch (_) {}
        if (page === 'multitrack') return 'multitrack';
        if (page === 'account' || page === 'login' || page === 'register') return 'account';
        return 'catalog';
      }
      return 'home';
    }
    if (file === 'multitrack') return 'multitrack';
    if (PRODUCT_FILES.has(file) || file === 'tienda') return 'catalog';
    if (file === 'account' || file === 'login' || file === 'register') return 'account';
    if ((file === 'ventas' || file === 'index' || file === 'launch' || file === '') && /catalogo/i.test(location.hash || '')) return 'catalog';
    return 'home';
  }

  function persistentNavigate(href){
    const shell = window.DingloftPersistentShellV93;
    if (!shell?.navigateHref) return false;
    try { return shell.navigateHref(href) !== false; } catch (_) { return false; }
  }

  function interceptPersistentLink(event, {closeSearchFirst=false}={}){
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    const a = event.target?.closest?.('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    let u; try { u = new URL(a.href, location.href); } catch (_) { return false; }
    if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return false;
    const part=(u.pathname.split('/').filter(Boolean).pop()||'').toLowerCase().replace(/\.html$/,'');
    if (part === 'admin' || part === 'commerce-admin') return false;
    if (!window.DingloftPersistentShellV93?.navigateHref) return false;
    event.preventDefault();event.stopPropagation();
    if (closeSearchFirst) closeSearch();
    beginHeaderLoading();
    persistentNavigate(u.href);
    return true;
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

  function loadMobileCart(){
    if (window.DingloftMobileCartV92?.open) return Promise.resolve(window.DingloftMobileCartV92);
    if (mobileCartLoadPromise) return mobileCartLoadPromise;
    mobileCartLoadPromise = new Promise(resolve => {
      const existing = document.querySelector('script[data-dingloft-mobile-cart-v92]');
      if (existing) {
        let tries = 0;
        const timer = setInterval(() => {
          if (window.DingloftMobileCartV92?.open || ++tries > 80) {
            clearInterval(timer);
            resolve(window.DingloftMobileCartV92 || null);
          }
        }, 50);
        return;
      }
      const script = document.createElement('script');
      script.src = MOBILE_CART_SRC;
      script.async = true;
      script.dataset.dingloftMobileCartV92 = '1';
      script.onload = () => resolve(window.DingloftMobileCartV92 || null);
      script.onerror = () => resolve(null);
      (document.head || document.documentElement).appendChild(script);
    }).finally(() => { mobileCartLoadPromise = null; });
    return mobileCartLoadPromise;
  }

  async function openCart(){
    const globalCart = await loadMobileCart();
    if (globalCart?.open) { globalCart.open(); return; }
    // Fail-safe only: old page cart is used if the independent component cannot load.
    const btn = legacyCartButton();
    if (btn) { try { btn.click(); return; } catch (_) {} }
    try { sessionStorage.setItem(OPEN_CART_KEY, '1'); } catch (_) {}
    location.href = '/ventas?app=1#catalogo';
  }

  // Used by embedded product pages: one cart lives in the persistent shell.
  window.__dingloftOpenGlobalCart = openCart;

  const removeSelectors = [
    '#main-navbar','nav.navbar-glass','.navbar.navbar-glass',
    '#mobileAppDock','nav.mobile-app-dock','.mobile-app-dock',
    '.dingloft-direct-top','#dingloftDirectTop','#dlDirectTop','#dlDirectDock',
    '#dlUniversalHeader','#dlUniversalDock','#dlGlobalChromeHost'
  ];

  function isOurNode(node){ return node?.id === HEADER_ID || node?.id === DOCK_ID || node?.id === SEARCH_ID; }

  function removeLegacy(root = document){
    for (const selector of removeSelectors) {
      root.querySelectorAll?.(selector).forEach(el => { if (!isOurNode(el)) el.remove(); });
    }
  }

  function makeHost(id, where){
    document.getElementById(id)?.remove();
    const host = document.createElement('div');
    host.id = id;
    host.setAttribute('data-dingloft-mobile-nav','71-liquid-v98');
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
    host.style.setProperty('transition','transform .52s cubic-bezier(.16,1,.3,1), opacity .32s ease, filter .38s ease','important');
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
      host.style.setProperty('bottom','max(4px,calc(env(safe-area-inset-bottom,0px) - 22px))','important');
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
      .search{position:absolute;left:max(12px,env(safe-area-inset-left,0px));bottom:15px;width:38px;height:38px;padding:0;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:#0b1016;color:#d9e8f4;display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent}.search:active{transform:scale(.92)}.search svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .admin{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:15px;height:38px;padding:0 10px;border:1px solid rgba(112,220,255,.18);border-radius:13px;background:#0b1117;color:#a8eaff;text-decoration:none;display:none;align-items:center;gap:6px;font-size:.54rem;font-weight:780}.admin.show{display:flex}.admin svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    `;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = `
      <button class="search" type="button" aria-label="Buscar en Dingloft"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg></button>
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

  function searchMarkup(root){
    const style=document.createElement('style');
    style.textContent=`
      :host{display:block;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",sans-serif;color-scheme:dark}
      *,*::before,*::after{box-sizing:border-box}
      .overlay{position:absolute;inset:0;padding:calc(76px + env(safe-area-inset-top,0px)) 10px calc(84px + env(safe-area-inset-bottom,0px));display:flex;align-items:flex-start;justify-content:center;background:rgba(1,3,6,.76);backdrop-filter:blur(18px) saturate(135%);-webkit-backdrop-filter:blur(18px) saturate(135%);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .22s ease,visibility .22s ease}
      .overlay.show{opacity:1;visibility:visible;pointer-events:auto}
      .panel{width:min(680px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.115);border-radius:24px;background:radial-gradient(circle at 86% -4%,rgba(112,94,255,.12),transparent 20rem),linear-gradient(155deg,rgba(15,19,25,.985),rgba(6,8,12,.99));box-shadow:0 34px 100px rgba(0,0,0,.62),inset 0 1px 0 rgba(255,255,255,.055);transform:translateY(-10px) scale(.985);transition:transform .30s cubic-bezier(.16,1,.3,1)}
      .overlay.show .panel{transform:none}
      .head{padding:13px;display:grid;grid-template-columns:1fr 42px;gap:9px;border-bottom:1px solid rgba(255,255,255,.07)}
      .inputbox{height:48px;display:flex;align-items:center;gap:10px;padding:0 14px;border:1px solid rgba(112,220,255,.16);border-radius:15px;background:rgba(255,255,255,.035)}.inputbox svg{width:18px;height:18px;stroke:#7cdfff;fill:none;stroke-width:1.8}.inputbox input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#f4f8fb;font-size:16px;font-weight:650}.inputbox input::placeholder{color:#657282}
      .close{width:42px;height:42px;align-self:center;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.025);color:#a7b2bf;display:grid;place-items:center}.close svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8}
      .meta{padding:10px 15px 7px;color:#687688;font-size:.55rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
      .results{min-height:120px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:5px 10px 13px;scrollbar-width:none}.results::-webkit-scrollbar{display:none}
      .result{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:12px;align-items:center;padding:9px;border:1px solid transparent;border-radius:16px;color:#eef5fa;text-decoration:none;-webkit-tap-highlight-color:transparent}.result:active{background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.07)}
      .art{width:58px;height:58px;overflow:hidden;display:grid;place-items:center;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(255,255,255,.035)}.art img{width:78%;height:78%;object-fit:contain}.art.cover img{width:100%;height:100%;object-fit:cover}.copy{min-width:0}.copy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.76rem}.copy small{display:block;margin-top:5px;color:#748295;font-size:.57rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.price{color:#9be8ff;font-size:.68rem;font-weight:850;white-space:nowrap}.empty{padding:28px 18px 34px;text-align:center;color:#718093;font-size:.72rem;line-height:1.6}.empty b{display:block;color:#d6e0e8;font-size:.82rem;margin-bottom:5px}
      @media(max-width:380px){.panel{border-radius:20px}.result{grid-template-columns:52px minmax(0,1fr)}.art{width:52px;height:52px}.price{grid-column:2;justify-self:start}.meta{padding-left:13px}}
      @media(prefers-reduced-motion:reduce){.overlay,.panel{transition:none!important}}
    `;
    const overlay=document.createElement('div');
    overlay.className='overlay';
    overlay.innerHTML=`<section class="panel" role="dialog" aria-modal="true" aria-label="Buscar productos Dingloft"><div class="head"><label class="inputbox"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg><input type="search" inputmode="search" autocomplete="off" placeholder="Buscar productos, software o Multitracks…" aria-label="Buscar"></label><button class="close" type="button" aria-label="Cerrar búsqueda"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button></div><div class="meta">Catálogo en vivo · Admin sincronizado</div><div class="results"><div class="empty"><b>Busca en todo Dingloft</b>Los productos nuevos del Admin aparecen aquí automáticamente.</div></div></section>`;
    root.append(style,overlay);
  }

  const searchNorm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const searchSlug=value=>searchNorm(value).replace(/\s+/g,'-');
  const searchImage=item=>{
    const raw=String(item.cover||item.imageUrl||item.imagePath||item.img||'dingloft').trim();
    if(/^(?:https?:)?\/\//i.test(raw)||raw.startsWith('data:')||raw.startsWith('blob:'))return raw;
    if(raw.startsWith('/'))return raw;
    if(raw.startsWith('img/'))return `/${raw}`;
    return `/img/${raw||'dingloft'}.png`;
  };
  const searchList=data=>Array.isArray(data)?data:(Array.isArray(data?.products)?data.products:(Array.isArray(data?.catalog)?data.catalog:(Array.isArray(data?.items)?data.items:[])));
  let searchCatalog=[];
  let searchLoading=null;

  async function loadSearchCatalog(){
    if(searchLoading)return searchLoading;
    searchLoading=(async()=>{
      const [pr,mr]=await Promise.allSettled([
        fetch(`${WORKER}/products/public`,{cache:'no-store',headers:{Accept:'application/json'}}),
        fetch(`${WORKER}/multitracks/catalog`,{cache:'no-store',headers:{Accept:'application/json'}})
      ]);
      const products=pr.status==='fulfilled'&&pr.value.ok?searchList(await pr.value.json().catch(()=>({}))):[];
      const md=mr.status==='fulfilled'&&mr.value.ok?await mr.value.json().catch(()=>({})):{};
      const multitracks=Array.isArray(md?.multitracks)?md.multitracks:[];
      const out=[],seen=new Set();
      for(const p of products){
        if(!p||p.active===false||String(p.type||'').toLowerCase().includes('multitrack'))continue;
        const sku=String(p.sku||p.slug||searchSlug(p.name)).trim();
        const key=`p:${searchSlug(sku||p.name)}`;if(!sku||seen.has(key))continue;seen.add(key);
        out.push({kind:'product',sku,name:String(p.name||sku),type:String(p.category||p.type||'Producto digital'),price:Number(p.priceUsd??p.price),img:searchImage(p),aliases:Array.isArray(p.aliases)?p.aliases:[]});
      }
      for(const mt of multitracks){
        if(!mt||mt.active===false||!Number.isFinite(Number(mt.price??mt.priceUsd)))continue;
        const id=String(mt.id||'').trim();const name=String(mt.title||mt.name||id).trim();if(!id||!name)continue;
        const key=`m:${id.toUpperCase()}`;if(seen.has(key))continue;seen.add(key);
        out.push({kind:'multitrack',id,sku:String(mt.commerceSku||mt.sku||searchSlug(name)),name,type:`${mt.artist||'Dingloft'} · Multitrack`,price:Number(mt.price??mt.priceUsd),img:searchImage({...mt,cover:mt.cover||''}),cover:Boolean(mt.cover),artist:String(mt.artist||'')});
      }
      searchCatalog=out.sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
      return searchCatalog;
    })().finally(()=>{searchLoading=null});
    return searchLoading;
  }

  function renderSearch(term=''){
    const results=searchRoot?.querySelector('.results');if(!results)return;
    const q=searchNorm(term);
    let rows=searchCatalog;
    if(q)rows=rows.filter(item=>searchNorm([item.name,item.sku,item.type,item.artist,...(item.aliases||[])].join(' ')).includes(q));
    rows=rows.slice(0,q?24:10);
    if(!rows.length){results.innerHTML=`<div class="empty"><b>${q?'Sin resultados':'Catálogo listo'}</b>${q?'Prueba con otro nombre, categoría o artista.':'Escribe para buscar en todos los productos.'}</div>`;return;}
    results.innerHTML=rows.map(item=>{
      const href=item.kind==='multitrack'?`/multitrack?app=1#mt-${encodeURIComponent(item.id)}`:`/producto?slug=${encodeURIComponent(item.sku)}&app=1`;
      const price=Number.isFinite(item.price)?(item.price===0?'Gratis':`$${item.price.toFixed(2)}`):'';
      return `<a class="result" href="${href}"><span class="art ${item.cover?'cover':''}"><img src="${item.img}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/img/dingloft.png'"></span><span class="copy"><strong>${item.name.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong><small>${item.type.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</small></span><span class="price">${price}</span></a>`;
    }).join('');
  }

  async function openSearch(){
    const overlay=searchRoot?.querySelector('.overlay');const input=searchRoot?.querySelector('input');const results=searchRoot?.querySelector('.results');if(!overlay)return;
    overlay.classList.add('show');
    if(results)results.innerHTML='<div class="empty"><b>Actualizando catálogo…</b>Buscando productos disponibles.</div>';
    setTimeout(()=>input?.focus(),80);
    try{await loadSearchCatalog();renderSearch(input?.value||'')}catch(_){if(results)results.innerHTML='<div class="empty"><b>No pudimos cargar el catálogo</b>Revisa tu conexión e inténtalo otra vez.</div>'}
  }
  function closeSearch(){searchRoot?.querySelector('.overlay')?.classList.remove('show')}

  function dockMarkup(root){
    const style = document.createElement('style');
    style.textContent = `
      :host{display:block;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",sans-serif;color-scheme:dark}
      *,*::before,*::after{box-sizing:border-box}
      .dock{--liquid-x:7px;--liquid-w:64px;--liquid-glint:50%;position:relative;width:100%;height:66px;padding:6px 7px;display:grid;grid-template-columns:1fr 1fr 76px 1fr 1fr;align-items:center;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:linear-gradient(180deg,rgba(18,22,29,.88),rgba(8,10,14,.94));box-shadow:0 18px 55px rgba(0,0,0,.56),inset 0 1px 0 rgba(255,255,255,.075);backdrop-filter:blur(28px) saturate(175%);-webkit-backdrop-filter:blur(28px) saturate(175%);overflow:visible;isolation:isolate;touch-action:pan-y}
      .dock::before{content:"";position:absolute;inset:1px;border-radius:21px;pointer-events:none;z-index:0;background:linear-gradient(115deg,rgba(255,255,255,.055),transparent 32%,rgba(91,210,255,.035) 58%,transparent 76%),radial-gradient(180px 62px at 50% -12%,rgba(255,255,255,.09),transparent 72%)}
      .liquid-lens{position:absolute;z-index:1;left:0;top:6px;width:var(--liquid-w);height:52px;border-radius:19px;pointer-events:none;overflow:hidden;opacity:.88;transform:translate3d(var(--liquid-x),0,0) scale(.985);transform-origin:center;transition:transform .58s cubic-bezier(.16,1,.22,1),width .48s cubic-bezier(.16,1,.22,1),opacity .24s ease,filter .24s ease;background:linear-gradient(145deg,rgba(255,255,255,.135),rgba(255,255,255,.025) 44%,rgba(97,218,255,.095) 100%);border:1px solid rgba(255,255,255,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -1px 0 rgba(91,211,255,.07),0 10px 26px rgba(0,0,0,.24),0 0 22px rgba(92,208,255,.055);backdrop-filter:blur(15px) saturate(205%) brightness(1.13);-webkit-backdrop-filter:blur(15px) saturate(205%) brightness(1.13)}
      .liquid-lens::before{content:"";position:absolute;inset:-34% -18%;background:radial-gradient(circle at var(--liquid-glint) 24%,rgba(255,255,255,.76) 0 3%,rgba(255,255,255,.22) 8%,transparent 24%),radial-gradient(circle at calc(var(--liquid-glint) + 18%) 84%,rgba(100,222,255,.26),transparent 31%),linear-gradient(108deg,transparent 22%,rgba(255,255,255,.13) 43%,transparent 63%);filter:blur(.2px);transform:skewX(-8deg);opacity:.72;transition:opacity .2s ease}
      .liquid-lens::after{content:"";position:absolute;inset:1px;border-radius:18px;border:1px solid rgba(255,255,255,.09);box-shadow:inset 7px 5px 16px rgba(255,255,255,.045),inset -7px -5px 14px rgba(0,0,0,.10)}
      .dock.liquid-tracking .liquid-lens{opacity:1;transform:translate3d(var(--liquid-x),0,0) scale(1.055,1.035);transition:transform .055s linear,width .09s linear,opacity .12s ease;filter:brightness(1.08)}
      .dock.liquid-tracking .liquid-lens::before{opacity:.96}
      .item{position:relative;z-index:2;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;border-radius:17px;background:transparent;color:#687384;text-decoration:none;font-size:.48rem;font-weight:760;line-height:1;-webkit-tap-highlight-color:transparent;transition:color .18s ease,background .18s ease,transform .18s cubic-bezier(.16,1,.3,1),text-shadow .18s ease}.item svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:filter .18s ease,transform .18s cubic-bezier(.16,1,.3,1)}.item.active{color:#edf8ff;background:rgba(255,255,255,.018)}.item.active svg{color:#79dcff;filter:drop-shadow(0 0 8px rgba(109,214,255,.25))}.item.liquid-hover{color:#f6fbff;text-shadow:0 0 14px rgba(197,239,255,.16);transform:translateY(-1px) scale(1.035)}.item.liquid-hover svg{filter:drop-shadow(0 0 10px rgba(111,220,255,.38));transform:scale(1.06)}.item:active{transform:scale(.92)}
      .cart-slot{position:relative;z-index:3;height:52px;display:flex;align-items:center;justify-content:center}.cart{position:absolute;z-index:4;left:50%;top:-9px;width:60px;height:60px;margin:0;padding:0;border:1px solid rgba(255,255,255,.88);border-radius:20px;background:linear-gradient(145deg,#fbfdff,#eaf1f5);color:#080b0e;display:grid;place-items:center;transform:translateX(-50%);box-shadow:0 17px 43px rgba(0,0,0,.45);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .18s cubic-bezier(.16,1,.3,1),box-shadow .18s ease}.cart.liquid-hover{transform:translateX(-50%) translateY(-1px) scale(1.045);box-shadow:0 19px 48px rgba(0,0,0,.46),0 0 24px rgba(111,220,255,.18)}.cart:active{transform:translateX(-50%) scale(.92)}.cart svg{width:27px;height:27px;stroke:currentColor;fill:none;stroke-width:1.8}.count{position:absolute;top:-5px;right:-6px;min-width:25px;height:25px;padding:0 6px;border:2px solid #050608;border-radius:999px;background:#24aaf2;color:#fff;display:grid;place-items:center;font-size:.68rem;font-weight:850}.count.empty{display:none}
      @media(prefers-reduced-motion:reduce){.liquid-lens,.item,.item svg,.cart{transition:none!important}.dock.liquid-tracking .liquid-lens{transform:translate3d(var(--liquid-x),0,0)!important}}
      @media(max-width:350px){.item span{display:none}}
    `;
    const dock = document.createElement('nav');
    dock.className = 'dock';
    dock.setAttribute('aria-label','Navegación Dingloft');
    dock.innerHTML = `
      <span class="liquid-lens" aria-hidden="true"></span>
      <a class="item" href="/ventas?app=1#inicio" data-route="home" aria-label="Inicio"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V21h13V9.5"></path></svg><span>Inicio</span></a>
      <a class="item" href="/ventas?app=1#catalogo" data-route="catalog" aria-label="Catálogo"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg><span>Catálogo</span></a>
      <span class="cart-slot"><button class="cart" type="button" aria-label="Abrir carrito"><svg viewBox="0 0 24 24"><path d="M6 8h12l1 13H5z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg><span class="count empty">0</span></button></span>
      <a class="item" href="/multitrack?app=1" data-route="multitrack" aria-label="Multitrack"><svg viewBox="0 0 24 24"><path d="M4 13v-2M8 17V7M12 20V4M16 17V7M20 13v-2"></path></svg><span>Multitrack</span></a>
      <a class="item" href="/account?app=1" data-route="account" aria-label="Cuenta"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"></path></svg><span>Cuenta</span></a>`;
    root.append(style, dock);
  }

  let headerHost, dockHost, searchHost, headerRoot, dockRoot, searchRoot;
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
    style.id='dingloft-mobile-nav-v88-runtime';
    style.textContent=`
      @media(max-width:1024px){
        html.dl-mobile-nav-v71 #dlMobileHeaderV71,html.dl-mobile-nav-v71 #dlMobileDockV71{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
        html.dl-mobile-nav-v71 #progress.progress{display:none!important;visibility:hidden!important;opacity:0!important}
        html.dl-mobile-nav-v71,html.dl-mobile-nav-v71 body,html.dl-mobile-nav-v71 body.no-scroll,html.dl-mobile-nav-v71 body.cart-open,html.dl-mobile-nav-v71 body.no-scroll.cart-open{height:auto!important;min-height:100%!important;max-height:none!important;overflow-y:auto!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
        html.dl-mobile-nav-v71 body{min-height:100dvh!important;overflow-x:hidden!important}
        html.dl-mobile-nav-v71.dl-cart-stage-lock,html.dl-mobile-nav-v71.dl-cart-stage-lock body{overflow:hidden!important;overscroll-behavior:none!important;touch-action:none!important}
        html.dl-mobile-nav-v71 .cart-footer{padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))!important;scroll-padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))!important;-webkit-overflow-scrolling:touch!important}
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

  function syncCartFocusChrome(){
    const focused = document.documentElement.classList.contains('dl-mobile-cart-focus') || document.body?.classList.contains('dl-mobile-cart-focus') || document.documentElement.classList.contains('dl-cart-stage-lock') || document.body?.classList.contains('dl-cart-stage-open');
    if (headerHost) {
      headerHost.style.setProperty('transform', focused ? 'translate3d(0,-125%,0)' : 'translate3d(0,0,0)','important');
      headerHost.style.setProperty('-webkit-transform', focused ? 'translate3d(0,-125%,0)' : 'translate3d(0,0,0)','important');
      headerHost.style.setProperty('opacity', focused ? '0' : '1','important');
      headerHost.style.setProperty('filter', focused ? 'blur(6px)' : 'none','important');
      headerHost.style.setProperty('pointer-events', focused ? 'none' : 'auto','important');
      headerHost.style.setProperty('z-index', focused ? '2147482000' : '2147483646','important');
    }
    if (dockHost) {
      dockHost.style.setProperty('transform', focused ? 'translate3d(0,calc(100% + 42px),0) scale(.94)' : 'translate3d(0,0,0)','important');
      dockHost.style.setProperty('-webkit-transform', focused ? 'translate3d(0,calc(100% + 42px),0) scale(.94)' : 'translate3d(0,0,0)','important');
      dockHost.style.setProperty('opacity', focused ? '0' : '1','important');
      dockHost.style.setProperty('filter', focused ? 'blur(5px)' : 'none','important');
      dockHost.style.setProperty('pointer-events', focused ? 'none' : 'auto','important');
      dockHost.style.setProperty('z-index', focused ? '2147482000' : '2147483647','important');
    }
    if (searchHost && focused) searchHost.style.pointerEvents='none';
  }

  const liquidDockState={tracking:false,pointerId:null,startX:0,startY:0,moved:false,suppressClick:false,hover:null};
  function liquidDock(){return dockRoot?.querySelector('.dock')||null}
  function liquidTargets(){const d=liquidDock();return d?[...d.querySelectorAll('.item[data-route],.cart')]:[]}
  function liquidTargetMetrics(el){
    const d=liquidDock();if(!d||!el)return null;
    const dr=d.getBoundingClientRect(),r=el.getBoundingClientRect();
    const isCart=el.classList.contains('cart');
    const w=Math.max(58,Math.min(isCart?70:r.width-5,104));
    const x=Math.max(4,Math.min(dr.width-w-4,(r.left-dr.left)+(r.width-w)/2));
    return{x,w,center:r.left+r.width/2,dr};
  }
  function setLiquidHover(el){
    if(liquidDockState.hover===el)return;
    liquidDockState.hover?.classList.remove('liquid-hover');
    liquidDockState.hover=el||null;
    liquidDockState.hover?.classList.add('liquid-hover');
  }
  function placeLiquidOn(el,{tracking=false,clientX=null}={}){
    const d=liquidDock(),m=liquidTargetMetrics(el);if(!d||!m)return;
    let x=m.x,glint=50;
    if(tracking&&Number.isFinite(clientX)){
      x=Math.max(4,Math.min(m.dr.width-m.w-4,clientX-m.dr.left-m.w/2));
      glint=Math.max(10,Math.min(90,50+((clientX-m.center)/Math.max(1,m.w))*72));
    }
    d.style.setProperty('--liquid-x',`${x.toFixed(2)}px`);
    d.style.setProperty('--liquid-w',`${m.w.toFixed(2)}px`);
    d.style.setProperty('--liquid-glint',`${glint.toFixed(1)}%`);
  }
  function nearestLiquidTarget(clientX){
    const list=liquidTargets();let best=null,dist=Infinity;
    for(const el of list){const r=el.getBoundingClientRect(),d=Math.abs(clientX-(r.left+r.width/2));if(d<dist){dist=d;best=el}}
    return best;
  }
  function activeLiquidTarget(){
    const d=liquidDock();if(!d)return null;
    const route=activeRoute();return d.querySelector(`.item[data-route="${route}"]`)||d.querySelector('.item[data-route="home"]');
  }
  function snapLiquidToActive(){
    if(liquidDockState.tracking)return;
    const d=liquidDock(),target=activeLiquidTarget();if(!d||!target)return;
    d.classList.remove('liquid-tracking');setLiquidHover(null);placeLiquidOn(target);
  }
  function setupLiquidDock(){
    const d=liquidDock();if(!d||d.dataset.liquidReady==='1')return;
    d.dataset.liquidReady='1';
    const endTracking=()=>{
      if(!liquidDockState.tracking)return;
      liquidDockState.tracking=false;liquidDockState.pointerId=null;
      d.classList.remove('liquid-tracking');setLiquidHover(null);
      requestAnimationFrame(()=>snapLiquidToActive());
    };
    d.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      const target=e.target.closest?.('.item[data-route],.cart');if(!target)return;
      liquidDockState.tracking=true;liquidDockState.pointerId=e.pointerId;liquidDockState.startX=e.clientX;liquidDockState.startY=e.clientY;liquidDockState.moved=false;
      try{d.setPointerCapture(e.pointerId)}catch(_){}
      d.classList.add('liquid-tracking');setLiquidHover(target);placeLiquidOn(target,{tracking:true,clientX:e.clientX});
    },{passive:true});
    d.addEventListener('pointermove',e=>{
      if(!liquidDockState.tracking||e.pointerId!==liquidDockState.pointerId)return;
      const dx=e.clientX-liquidDockState.startX,dy=e.clientY-liquidDockState.startY;
      if(Math.abs(dx)>7&&Math.abs(dx)>Math.abs(dy)*.65)liquidDockState.moved=true;
      const target=nearestLiquidTarget(e.clientX)||activeLiquidTarget();setLiquidHover(target);placeLiquidOn(target,{tracking:true,clientX:e.clientX});
    },{passive:true});
    d.addEventListener('pointerup',e=>{
      if(e.pointerId!==liquidDockState.pointerId)return;
      if(liquidDockState.moved){liquidDockState.suppressClick=true;setTimeout(()=>{liquidDockState.suppressClick=false},90)}
      endTracking();
    },{passive:true});
    d.addEventListener('pointercancel',endTracking,{passive:true});
    d.addEventListener('lostpointercapture',endTracking,{passive:true});
    d.addEventListener('click',e=>{
      if(!liquidDockState.suppressClick)return;
      e.preventDefault();e.stopImmediatePropagation();liquidDockState.suppressClick=false;
    },true);
    requestAnimationFrame(()=>snapLiquidToActive());
    window.addEventListener('resize',()=>requestAnimationFrame(snapLiquidToActive),{passive:true});
  }

  function sync(){
    syncCartFocusChrome();
    if (!dockRoot) return;
    const route = activeRoute();
    dockRoot.querySelectorAll('.item[data-route]').forEach(el => el.classList.toggle('active', el.dataset.route === route));
    snapLiquidToActive();
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
    // v88: clear only stale inline scroll locks left by older Dingloft versions.
    ['overflow','overflow-y','height','max-height','touch-action','position','top'].forEach(prop=>{
      const value=document.body.style.getPropertyValue(prop);
      if ((prop==='overflow' && value==='hidden') || (prop==='overflow-y' && value==='hidden') ||
          (prop==='touch-action' && value==='none') || (prop==='position' && value==='fixed') ||
          (prop==='height' && /100(vh|dvh)/.test(value)) || (prop==='top' && /^-?\d+px$/.test(value))) {
        document.body.style.removeProperty(prop);
      }
    });
    removeLegacy(document);

    headerHost = makeHost(HEADER_ID, 'header');
    dockHost = makeHost(DOCK_ID, 'dock');
    searchHost = document.createElement('div');
    searchHost.id = SEARCH_ID;
    searchHost.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block;';
    headerRoot = headerHost.attachShadow({mode:'open'});
    dockRoot = dockHost.attachShadow({mode:'open'});
    searchRoot = searchHost.attachShadow({mode:'open'});
    headerMarkup(headerRoot);
    dockMarkup(dockRoot);
    setupLiquidDock();
    searchMarkup(searchRoot);

    // Append as direct body children. Search is last so it can sit above the dock while open.
    document.body.append(headerHost, dockHost, searchHost);
    const searchOverlay = searchRoot.querySelector('.overlay');
    const searchObserver = new MutationObserver(() => { searchHost.style.pointerEvents = searchOverlay?.classList.contains('show') ? 'auto' : 'none'; });
    if(searchOverlay) searchObserver.observe(searchOverlay,{attributes:true,attributeFilter:['class']});
    headerRoot.querySelector('.search')?.addEventListener('click', e => { e.preventDefault(); openSearch(); });
    searchRoot.querySelector('.close')?.addEventListener('click', e => { e.preventDefault(); closeSearch(); });
    searchRoot.querySelector('.overlay')?.addEventListener('click', e => { if(e.target===searchRoot.querySelector('.overlay')) closeSearch(); });
    searchRoot.querySelector('input')?.addEventListener('input', e => renderSearch(e.target.value));
    searchRoot.querySelector('.results')?.addEventListener('click', e => {
      const a=e.target.closest('a[href]');if(!a)return;
      if (!interceptPersistentLink(e,{closeSearchFirst:true})) { closeSearch();beginHeaderLoading(); }
    });
    headerRoot.addEventListener('click', e => { interceptPersistentLink(e); });
    dockRoot.addEventListener('click', e => { interceptPersistentLink(e); });
    dockRoot.querySelector('.cart')?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openCart(); });
    // Preload the single global cart after the shell is visible so the first tap is instant.
    if ('requestIdleCallback' in window) requestIdleCallback(() => loadMobileCart(), {timeout:1200});
    else setTimeout(() => loadMobileCart(), 350);
    wireLoadingLinks(headerRoot);
    wireLoadingLinks(dockRoot);
    if (hasRecentLoad()) setHeaderLoading(true);
    sync();
    const cartFocusObserver = new MutationObserver(syncCartFocusChrome);
    cartFocusObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    cartFocusObserver.observe(document.body,{attributes:true,attributeFilter:['class']});

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

    // Same-tab cart writes do not emit a storage event, so keep this tiny sync timer.
    setInterval(sync, 650);
  }

  ['pushState','replaceState'].forEach(name => {
    try {
      const original = history[name];
      history[name] = function(...args){ const out = original.apply(this,args); queueMicrotask(sync); return out; };
    } catch (_) {}
  });
  addEventListener('keydown', event => { if (event.key === 'Escape') closeSearch(); });
  addEventListener('popstate', sync, {passive:true});
  addEventListener('hashchange', sync, {passive:true});
  addEventListener('storage', e => { if (e.key === CART_KEY) sync(); });
  addEventListener('dingloft:cart-sync', sync);
  addEventListener('dingloft:mobile-cart-updated', sync);
  addEventListener('dingloft:mobile-cart-state', syncCartFocusChrome);
  addEventListener('dingloft:shell-route', sync);
  addEventListener('dingloft:shell-ready', ()=>{ sync(); finishHeaderLoading(180); });
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
  addEventListener('load',()=>finishHeaderLoading(320),{once:true});
  addEventListener('pageshow',()=>finishHeaderLoading(220),{passive:true});

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, {once:true});
})();
