(() => {
  'use strict';
  const ua = navigator.userAgent || '';
  const isiOS = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isiOS;
  const isMobile = isiOS || isAndroid || (navigator.maxTouchPoints > 0 && matchMedia('(max-width:1024px)').matches);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  if (isiOS) document.documentElement.classList.add('dingloft-ios-fixed');

  const markInstalled = () => {
    const installed = standalone() || Boolean(localStorage.getItem('dingloft_installed_at'));
    document.documentElement.classList.toggle('dingloft-installed', installed);
    document.body?.classList.toggle('dingloft-installed', installed);
    if (standalone()) localStorage.setItem('dingloft_installed_at', String(Date.now()));
    if (installed) {
      document.querySelectorAll('#navInstall,#installAppBtn,#installCard,.site-install-banner,.install-shell,[data-install-cta],.install-cta').forEach(el => {
        el.style.setProperty('display','none','important');
        el.setAttribute('aria-hidden','true');
      });
    }
  };

  // Prevent accidental page zoom on touch devices and macOS while keeping normal scrolling.
  if (isMobile || isMac) {
    ['gesturestart','gesturechange','gestureend'].forEach(type => {
      document.addEventListener(type, e => e.preventDefault(), { passive:false });
    });
    addEventListener('wheel', e => {
      if (e.ctrlKey) e.preventDefault(); // trackpad pinch in Chromium/macOS
    }, { passive:false });
    addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && ['+','=','-','0'].includes(e.key)) e.preventDefault();
    }, { passive:false });
    if (isMobile) {
      let lastTouchEnd = 0;
      document.addEventListener('touchend', e => {
        const now = Date.now();
        if (now - lastTouchEnd <= 280 && e.target?.closest?.('button,a,input,textarea,select') == null) e.preventDefault();
        lastTouchEnd = now;
      }, { passive:false });
    }
  }

  // iPhone/iPad: keep the PAGE fixed, but allow intentional horizontal rails/carousels.
  if (isiOS) {
    let sx = 0, sy = 0, rail = null;
    const getRail = target => {
      const el = target instanceof Element ? target : null;
      let candidate = el?.closest?.(horizontalSelectors) || null;
      if (candidate && candidate.scrollWidth > candidate.clientWidth + 3) return candidate;
      let node = el;
      while (node && node !== document.body) {
        if (node.dataset?.horizontalScroll === 'true' && node.scrollWidth > node.clientWidth + 3) return node;
        node = node.parentElement;
      }
      return null;
    };
    document.addEventListener('touchstart', e => {
      if (e.touches?.length === 1) {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY; rail = getRail(e.target);
      }
    }, { passive:true });
    document.addEventListener('touchmove', e => {
      if (e.touches?.length !== 1) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      if (Math.abs(dx) <= Math.abs(dy) + 3) return;
      if (rail && rail.scrollWidth > rail.clientWidth + 3) return; // native carousel swipe
      e.preventDefault(); // stop only the viewport/rubber-band motion
    }, { passive:false });
    document.addEventListener('touchend', () => { rail = null; }, { passive:true });
    document.addEventListener('touchcancel', () => { rail = null; }, { passive:true });
  }

  // Horizontal trackpad scrolling for wide UI rails in the macOS app/desktop shell.
  const horizontalSelectors = [
    '[data-horizontal-scroll]','.hero-proof','.trust-bar','.category-grid','.category-section > .row','.steps',
    '.mt-filter-row','.mt-seo-artists','.tabs-header','.mt-filters','.mt-chip-row','.filter-row','.category-scroll',
    '.product-tabs','.nav-pills','.shortcut-row','.horizontal-scroll','.table-scroll','.cards-scroll','.similar-carousel-wrapper','.reels-scroll','.video-carousel'
  ].join(',');
  if (isMac) {
    document.addEventListener('wheel', e => {
      if (e.ctrlKey) return;
      let rail = e.target?.closest?.(horizontalSelectors);
      if (!rail) {
        let node = e.target instanceof Element ? e.target : null;
        while (node && node !== document.body) {
          if (node.scrollWidth > node.clientWidth + 4) { rail = node; break; }
          node = node.parentElement;
        }
      }
      if (!rail || rail.scrollWidth <= rail.clientWidth + 4) return;
      const horizontalIntent = Math.abs(e.deltaX) > 1 || (e.shiftKey && Math.abs(e.deltaY) > 1);
      if (!horizontalIntent) return;
      const delta = Math.abs(e.deltaX) > 1 ? e.deltaX : e.deltaY;
      const before = rail.scrollLeft;
      rail.scrollLeft += delta;
      if (rail.scrollLeft !== before) e.preventDefault();
    }, { passive:false });
  }

  const addBaseStyle = () => {
    if (document.getElementById('dingloft-ui-guard-style')) return;
    const s = document.createElement('style');
    s.id = 'dingloft-ui-guard-style';
    s.textContent = `
      html,body{touch-action:pan-y;}
      html.dingloft-ios-fixed,html.dingloft-ios-fixed body{width:100%!important;max-width:100%!important;overflow-x:hidden!important;overscroll-behavior-x:none!important;touch-action:pan-y!important;}
      html.dingloft-ios-fixed body{position:relative!important;}
      
      html.dingloft-ios-fixed body:not(.no-scroll):not(.cart-open){overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;}
      html.dingloft-ios-fixed main,html.dingloft-ios-fixed #page-wrapper,html.dingloft-ios-fixed .page-wrapper{touch-action:pan-y!important;}

      html.dingloft-installed #navInstall,
      html.dingloft-installed #installAppBtn,
      html.dingloft-installed #installCard,
      html.dingloft-installed .site-install-banner,
      html.dingloft-installed .install-shell,
      html.dingloft-installed [data-install-cta],
      html.dingloft-installed .install-cta{display:none!important}
      ${horizontalSelectors}{-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:thin;touch-action:pan-x pan-y!important}
      @media(display-mode:standalone){#navInstall,#installAppBtn,#installCard,.site-install-banner,.install-shell,[data-install-cta],.install-cta{display:none!important}}
    `;
    document.head.appendChild(s);
  };



  const directProductFiles = new Set([
    'autocad.html','cinema4d.html','dual.html','esword.html','logic.html','mainstage.html',
    'nord.html','office.html','producto.html','rhodes.html','sketchup.html','yamahakeys.html'
  ]);

  function setupDirectMobileProduct(){
    if (!isMobile || window.self !== window.top) return;
    const params = new URLSearchParams(location.search);
    if (params.get('app') !== '1') return;
    const file = (location.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
    if (!directProductFiles.has(file)) return;
    if (document.getElementById('dlDirectDock')) return;

    document.documentElement.classList.add('dingloft-direct-app');
    document.body?.classList.add('dingloft-direct-app');
    // A stale no-scroll class from a hidden menu/cart must never freeze a freshly opened product.
    const drawerOpen = !!document.querySelector('.cart-drawer.active,#cart-drawer.active,.search-overlay-fullscreen.active,#search-overlay-fullscreen.active,.side-menu.active,#side-menu.active');
    if (!drawerOpen) document.body?.classList.remove('no-scroll','cart-open');

    if(!document.getElementById('dlDockMasterCss')){const l=document.createElement('link');l.id='dlDockMasterCss';l.rel='stylesheet';l.href='/dingloft-mobile-dock.css?v=28';document.head.appendChild(l);}

    const style=document.createElement('style');
    style.id='dl-direct-app-style';
    style.textContent=`
      html.dingloft-direct-app,html.dingloft-direct-app body{
        width:100%!important;max-width:100%!important;height:auto!important;min-height:100dvh!important;
        overflow-x:hidden!important;overflow-y:auto!important;position:relative!important;
        -webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;overscroll-behavior-x:none!important;
      }
      html.dingloft-direct-app body{padding-top:calc(70px + env(safe-area-inset-top))!important;padding-bottom:calc(94px + env(safe-area-inset-bottom))!important}
      html.dingloft-direct-app body:not(.no-scroll):not(.cart-open){overflow-y:auto!important;height:auto!important;touch-action:pan-y!important}
      html.dingloft-direct-app .page-wrapper,html.dingloft-direct-app main{height:auto!important;min-height:0!important;overflow:visible!important;touch-action:pan-y!important}
      html.dingloft-direct-app .navbar-glass,html.dingloft-direct-app .navbar.fixed-top,html.dingloft-direct-app #main-navbar,
      html.dingloft-direct-app .mobile-app-dock,html.dingloft-direct-app #mobileAppDock,
      html.dingloft-direct-app .btn-floating-cart,html.dingloft-direct-app .floating-cart,html.dingloft-direct-app .cart-fab,
      html.dingloft-direct-app [data-floating-cart]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      #dlDirectTop{position:fixed;z-index:2147481000;top:0;left:0;right:0;height:calc(62px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 16px 0;display:flex;align-items:center;gap:11px;border-bottom:1px solid rgba(255,255,255,.075);background:linear-gradient(180deg,rgba(4,6,9,.99),rgba(5,7,10,.95));backdrop-filter:blur(26px) saturate(160%);-webkit-backdrop-filter:blur(26px) saturate(160%);box-shadow:0 10px 34px rgba(0,0,0,.26)}
      #dlDirectTop img{width:36px;height:36px;border-radius:11px;object-fit:contain}#dlDirectTop .dt-copy{min-width:0;line-height:1}#dlDirectTop strong{display:block;color:#f5f8fb;font:850 .92rem/1 -apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;letter-spacing:.16em}#dlDirectTop small{display:block;margin-top:6px;color:#718094;font:700 .52rem/1 -apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;letter-spacing:.11em;text-transform:uppercase}#dlDirectTop .dt-online{margin-left:auto;color:#728092;font:750 .54rem/1 -apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;letter-spacing:.10em;text-transform:uppercase;display:flex;align-items:center;gap:7px}#dlDirectTop .dt-dot{width:7px;height:7px;border-radius:99px;background:#69e2ad;box-shadow:0 0 0 5px rgba(105,226,173,.07)}
      #dlDirectDock{position:fixed;z-index:2147481001;left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));bottom:calc(5px + env(safe-area-inset-bottom));height:66px;padding:6px 7px;display:grid;grid-template-columns:1fr 1fr 76px 1fr 1fr;align-items:center;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:linear-gradient(180deg,rgba(18,22,29,.84),rgba(8,10,14,.91));box-shadow:0 18px 55px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(24px) saturate(175%);-webkit-backdrop-filter:blur(24px) saturate(175%)}
      #dlDirectDock .dd-item{height:52px;border:0;background:transparent;color:#687384;text-decoration:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:17px;font:760 .48rem/1 -apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;-webkit-tap-highlight-color:transparent}#dlDirectDock .dd-item svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#dlDirectDock .dd-item.active,#dlDirectDock .dd-item.catalog{color:#eaf5ff;background:rgba(255,255,255,.045)}#dlDirectDock .dd-item.active svg,#dlDirectDock .dd-item.catalog svg{color:#79dcff;filter:drop-shadow(0 0 8px rgba(109,214,255,.28))}#dlDirectDock .dd-cart-slot{position:relative;height:52px;display:flex;align-items:center;justify-content:center}#dlDirectDock .dd-cart{position:absolute;left:50%;top:-9px;width:60px;height:60px;border-radius:20px;border:1px solid rgba(255,255,255,.85);background:linear-gradient(145deg,#fbfdff,#eaf1f5);color:#080b0e;display:grid;place-items:center;transform:translateX(-50%);box-shadow:0 18px 45px rgba(0,0,0,.42);-webkit-tap-highlight-color:transparent}#dlDirectDock .dd-cart svg{width:27px;height:27px;stroke:currentColor;fill:none;stroke-width:1.8}#dlDirectDock .dd-count{position:absolute;top:-5px;right:-6px;min-width:25px;height:25px;padding:0 6px;border:2px solid #050608;border-radius:999px;background:#24aaf2;color:#fff;display:grid;place-items:center;font:850 .68rem/1 -apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif}#dlDirectDock .dd-count[data-empty="1"]{display:none}#dlDirectDock .dd-cart-label{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);color:#788394;font:760 .44rem/1 -apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif}
      body.dl-direct-cart-open #dlDirectDock{opacity:0;visibility:hidden;pointer-events:none;transform:translateY(15px);transition:.18s}
      html.dingloft-direct-app .cart-items-container{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important}
      @media(max-width:350px){#dlDirectDock .dd-item span,#dlDirectDock .dd-cart-label{display:none!important}}
    `;
    document.head.appendChild(style);

    const top=document.createElement('div');top.id='dlDirectTop';top.innerHTML=`<img src="/img/pwa-liquid-rounded-192-v17.png" alt="Dingloft"><div class="dt-copy"><strong>DINGLOFT</strong><small>Evolution Group</small></div><div class="dt-online"><span class="dt-dot"></span><span>${navigator.onLine?'Store online':'Sin conexión'}</span></div>`;document.body.appendChild(top);
    const dock=document.createElement('nav');dock.id='dlDirectDock';dock.setAttribute('aria-label','Navegación Dingloft');dock.innerHTML=`
      <a class="dd-item" href="/app.html?route=home" aria-label="Inicio"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V21h13V9.5"></path></svg><span>Inicio</span></a>
      <a class="dd-item active catalog" href="/app.html?route=catalog" aria-label="Catálogo"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"></path><path d="M8 9h8M8 13h8M8 17h5"></path></svg><span>Catálogo</span></a>
      <span class="dd-cart-slot"><button class="dd-cart" id="dlDirectCart" type="button" aria-label="Abrir carrito"><svg viewBox="0 0 24 24"><path d="M6.5 8.5h11l-1 11h-9z"></path><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"></path></svg><span class="dd-count" id="dlDirectCount" data-empty="1">0</span></button><span class="dd-cart-label">Carrito</span></span>
      <a class="dd-item" href="/multitrack.html?app=1" aria-label="Multitrack"><svg viewBox="0 0 24 24"><path d="M4 14v-4M8 18V6M12 15V9M16 20V4M20 13v-2"></path></svg><span>Multitrack</span></a>
      <a class="dd-item" href="/app.html?route=account" aria-label="Cuenta"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path></svg><span>Cuenta</span></a>`;document.body.appendChild(dock);

    const syncOnline=()=>{const label=top.querySelector('.dt-online span:last-child');if(label)label.textContent=navigator.onLine?'Store online':'Sin conexión'};addEventListener('online',syncOnline);addEventListener('offline',syncOnline);
    const localCart=()=>document.querySelector('.btn-floating-cart.cart-btn-global,.cart-btn-global,#main-cart-btn,.floating-cart,.cart-fab');
    const syncDirectCount=()=>{let n=0;try{const c=JSON.parse(localStorage.getItem('dingloft_cart')||'[]');if(Array.isArray(c))n=c.reduce((sum,x)=>sum+Math.max(0,Number(x?.qty||1)),0)}catch(_){}const badge=document.getElementById('dlDirectCount');if(badge){badge.textContent=String(n);badge.dataset.empty=n?'0':'1'}};syncDirectCount();addEventListener('storage',e=>{if(e.key==='dingloft_cart')syncDirectCount()});setInterval(syncDirectCount,1200);
    document.getElementById('dlDirectCart')?.addEventListener('click',e=>{e.preventDefault();const btn=localCart();if(btn){btn.click();setTimeout(syncDrawer,35)}});
    const syncDrawer=()=>{const drawer=document.querySelector('.cart-drawer,#cart-drawer');const open=!!drawer?.classList.contains('active');document.body.classList.toggle('dl-direct-cart-open',open);if(!open && !document.querySelector('.search-overlay-fullscreen.active,#search-overlay-fullscreen.active,.side-menu.active,#side-menu.active')) document.body.classList.remove('no-scroll','cart-open')};
    const drawer=document.querySelector('.cart-drawer,#cart-drawer');if(drawer){new MutationObserver(syncDrawer).observe(drawer,{attributes:true,attributeFilter:['class','style']});syncDrawer();if(!document.getElementById('dlDirectCartX')){const x=document.createElement('button');x.id='dlDirectCartX';x.type='button';x.setAttribute('aria-label','Cerrar carrito');x.textContent='×';x.style.cssText='position:absolute;z-index:20;top:14px;right:14px;width:38px;height:38px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(8,11,15,.82);color:#fff;font-size:25px;line-height:1;display:grid;place-items:center;';drawer.appendChild(x);x.addEventListener('click',ev=>{ev.preventDefault();const close=document.querySelector('#close-cart-btn,.btn-close-cart');if(close)close.click();else{drawer.classList.remove('active');document.querySelector('.cart-overlay,#cart-overlay')?.classList.remove('active');document.body.classList.remove('no-scroll','cart-open')}setTimeout(syncDrawer,30)})}}
  }

  addBaseStyle();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { markInstalled(); setupDirectMobileProduct(); }, {once:true});
  else { markInstalled(); setupDirectMobileProduct(); }
  addEventListener('appinstalled', () => { localStorage.setItem('dingloft_installed_at', String(Date.now())); markInstalled(); });
  matchMedia('(display-mode: standalone)').addEventListener?.('change', markInstalled);
})();
