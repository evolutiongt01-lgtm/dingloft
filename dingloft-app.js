/* Dingloft Persistent Mobile/Tablet App Shell · v97 · Product Scroll Repair
   The shell never reloads between internal pages. Only the content iframe changes.
   Header/search/bottom nav/cart live in the top document and remain mounted. */
const DINGLOFT_BOOT_STARTED = performance.now();
let DINGLOFT_BOOT_DONE = false;
function dingloftSplashReady(){
  if(DINGLOFT_BOOT_DONE) return;
  DINGLOFT_BOOT_DONE = true;
  const splash=document.getElementById('appSplash');
  const status=document.getElementById('splashStatus');
  const elapsed=performance.now()-DINGLOFT_BOOT_STARTED;
  const wait=Math.max(0,720-elapsed);
  if(status) status.textContent='Listo';
  setTimeout(()=>{
    if(!splash) return;
    splash.classList.add('hide');
    document.body.classList.add('app-booted');
    setTimeout(()=>splash.remove(),650);
  },wait);
}
setTimeout(dingloftSplashReady,5200);

(() => {
'use strict';
const ua=navigator.userAgent||'';
const IOS=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const MOBILE=/Android|iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)||(navigator.maxTouchPoints>0&&matchMedia('(max-width:1024px)').matches);
const q=new URLSearchParams(location.search);
if(!MOBILE){
  const route=q.get('route')||'home',src=q.get('src')||'';
  const dest=src||(route==='catalog'?'ventas.html#catalogo':route==='multitrack'?'multitrack.html':route==='account'?'account.html':'ventas.html');
  const shell=new URL('/desktop-shell.html',location.origin);shell.searchParams.set('src',dest);location.replace(`${shell.pathname}${shell.search}`);return;
}

const stage=document.getElementById('stage');
const SHELL_PRODUCT_FILES=new Set(['autocad','cinema4d','dual','esword','logic','mainstage','nord','office','producto','rhodes','sketchup','yamahakeys']);
const progress=document.getElementById('progress');
const count=document.getElementById('count');
let active=null, token=0, activeKey='home';

const sanitizeSrc=(raw)=>{try{
  const u=new URL(raw||'',location.href);
  if(u.origin!==location.origin)return'';
  let file=u.pathname.split('/').filter(Boolean).pop()||'index.html';
  if(!/\./.test(file))file+='.html';
  if(!/^[A-Za-z0-9_.-]+\.html$/i.test(file))return'';
  u.searchParams.delete('app');u.searchParams.delete('direct');u.searchParams.set('embed','1');
  return `${file}${u.search}${u.hash}`;
}catch(_){return'';}};

function info(route,params={}){
  if(route==='catalog')return{key:'catalog',src:'ventas.html?embed=1#catalogo'};
  if(route==='multitrack')return{key:'multitrack',src:'multitrack.html?embed=1'};
  if(route==='account')return{key:'account',src:'account.html?embed=1'};
  if(route==='page'){
    const src=sanitizeSrc(params.src||'');
    return src?{key:'page',src}:{key:'catalog',src:'ventas.html?embed=1#catalogo'};
  }
  return{key:'home',src:'ventas.html?embed=1#inicio'};
}
function qRoute(){return new URLSearchParams(location.search).get('route')||'home'}
function cleanPublicSrc(src=''){
  return String(src).replace(/([?&])embed=1&?/,'$1').replace(/[?&]embed=1(?=#|$)/,'').replace(/\?$/,'');
}
function appUrl(i){
  const u=new URL('/app',location.origin);u.searchParams.set('route',i.key);
  if(i.key==='page')u.searchParams.set('src',cleanPublicSrc(i.src));
  return `${u.pathname}${u.search}`;
}
function activeDock(key){
  const visual=key==='page'?'catalog':key;
  activeKey=key;
  document.body.dataset.appRoute=visual;
  document.querySelectorAll('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===visual));
  window.__dingloftRefreshAdminButton?.();
  window.dispatchEvent(new CustomEvent('dingloft:shell-route',{detail:{key,visual,version:97}}));
}
function cartCount(){
  let n=0;try{const c=JSON.parse(localStorage.getItem('dingloft_cart')||'[]');if(Array.isArray(c))n=c.reduce((s,x)=>s+Math.max(1,Number(x?.qty??x?.quantity??1)||1),0)}catch(_){}
  if(count)count.textContent=String(n);
}
function mapHref(href,base){
  let u;try{u=new URL(href,base)}catch(_){return null}
  if(u.origin!==location.origin)return null;
  let file=(u.pathname.split('/').filter(Boolean).pop()||'index').toLowerCase().replace(/\.html$/,'');
  if(file==='app'){
    const route=u.searchParams.get('route')||'home';
    return{route,src:u.searchParams.get('src')||''};
  }
  if(file==='admin'||file==='commerce-admin')return{external:true,url:u.href};
  if(file==='index'||file==='ventas'||file==='tienda'||file===''){
    if((u.hash||'').toLowerCase()==='#catalogo')return{route:'catalog'};
    if((u.hash||'').toLowerCase()==='#multitrack')return{route:'multitrack'};
    return{route:'home'};
  }
  if(file==='multitrack'||file==='multitracks')return{route:'multitrack'};
  if(file==='account'||file==='cuenta')return{route:'account'};
  return{route:'page',src:`${file}.html${u.search}${u.hash}`};
}

function shellNavigateHref(href,{push=true}={}){
  const m=mapHref(href,location.href);
  if(!m)return false;
  if(m.external){location.href=m.url;return true;}
  navigate(m.route,m,{push});
  return true;
}

function child(frame){try{
  const w=frame.contentWindow,d=w.document;
  if(!d||!d.documentElement)return;
  const childFile=((w.location.pathname.split('/').filter(Boolean).pop()||'').toLowerCase().replace(/\.html$/,''));
  const productView=SHELL_PRODUCT_FILES.has(childFile);
  d.documentElement.classList.add('dingloft-shell-view');
  d.documentElement.classList.toggle('dingloft-shell-product-view',productView);
  // Keep the legacy value exactly "mobile": every program page already ships
  // with an iOS/mobile scroll repair keyed to this attribute. v93 used
  // "mobile-v93", so that repair never matched inside the persistent shell.
  d.documentElement.dataset.dingloftShell='mobile';
  d.documentElement.dataset.dingloftShellVersion='100';
  if(d.body){d.body.classList.add('dingloft-shell-view');d.body.classList.toggle('dingloft-shell-product-view',productView);d.body.dataset.dingloftShell='mobile';d.body.dataset.dingloftShellVersion='100'}
  if(d.scrollingElement)d.scrollingElement.style.webkitOverflowScrolling='touch';
  const unlockProductScroll=()=>{
    if(!productView||!d.body)return;
    // Local product drawers/search are hidden by the persistent shell. They must
    // never be allowed to leave the embedded document with a stale scroll lock.
    d.body.classList.remove('no-scroll','cart-open');
    const html=d.documentElement,body=d.body;
    // v100: ONE scrolling root only. The iframe/document viewport stays fixed
    // and the product body owns the vertical scroll. This removes the double
    // iOS scroll indicators (outer document + inner body) seen on program pages.
    html.style.setProperty('height','100%','important');
    html.style.setProperty('min-height','100%','important');
    html.style.setProperty('max-height','100%','important');
    html.style.setProperty('overflow-x','hidden','important');
    html.style.setProperty('overflow-y','hidden','important');
    html.style.setProperty('touch-action','pan-y','important');
    body.style.setProperty('position','relative','important');
    body.style.setProperty('top','auto','important');
    body.style.setProperty('height','100%','important');
    body.style.setProperty('min-height','100%','important');
    body.style.setProperty('max-height','100%','important');
    body.style.setProperty('overflow-x','hidden','important');
    body.style.setProperty('overflow-y','auto','important');
    body.style.setProperty('overscroll-behavior-y','contain','important');
    body.style.setProperty('touch-action','pan-y','important');
    body.style.setProperty('-webkit-overflow-scrolling','touch','important');
  };
  unlockProductScroll();
  if(!d.getElementById('dl-shell-style-v100')){
    const s=d.createElement('style');s.id='dl-shell-style-v100';s.textContent=`
      @media(max-width:1024px){
        html.dingloft-shell-view,html.dingloft-shell-view body{background:#05070a!important;width:100%!important;max-width:100%!important;overflow-x:hidden!important;overscroll-behavior-x:none!important}
        html.dingloft-shell-view body{position:relative!important;top:auto!important;padding-top:0!important;padding-bottom:24px!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
        /* v100 · Product pages have exactly one vertical scroll owner: body. */
        html.dingloft-shell-view.dingloft-shell-product-view{height:100%!important;min-height:100%!important;max-height:100%!important;overflow-y:hidden!important;overscroll-behavior-y:none!important}
        html.dingloft-shell-view.dingloft-shell-product-view body.dingloft-shell-product-view{height:100%!important;min-height:100%!important;max-height:100%!important;overflow-y:auto!important;overscroll-behavior-y:contain!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
        /* v97: program pages must never inherit a hidden local-cart/search lock. */
        html.dingloft-shell-view.dingloft-shell-product-view[data-dingloft-shell="mobile"] body.dingloft-shell-view.no-scroll,
        html.dingloft-shell-view.dingloft-shell-product-view[data-dingloft-shell="mobile"] body.dingloft-shell-view.cart-open,
        html.dingloft-shell-view.dingloft-shell-product-view[data-dingloft-shell="mobile"] body.dingloft-shell-view.no-scroll.cart-open{position:relative!important;top:auto!important;height:100%!important;min-height:100%!important;max-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-y:contain!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
        html.dingloft-shell-view #main-navbar,html.dingloft-shell-view nav.navbar-glass,html.dingloft-shell-view .navbar.navbar-glass,html.dingloft-shell-view nav.navbar.fixed-top,html.dingloft-shell-view .topbar,
        html.dingloft-shell-view #mobileAppDock,html.dingloft-shell-view nav.mobile-app-dock,html.dingloft-shell-view .mobile-app-dock,html.dingloft-shell-view .dingloft-direct-top,html.dingloft-shell-view #dingloftDirectTop,html.dingloft-shell-view #dlDirectTop,html.dingloft-shell-view #dlDirectDock,
        html.dingloft-shell-view #dlUniversalHeader,html.dingloft-shell-view #dlUniversalDock,html.dingloft-shell-view #dlGlobalChromeHost,
        html.dingloft-shell-view .btn-floating-cart,html.dingloft-shell-view .floating-cart,html.dingloft-shell-view .cart-fab,html.dingloft-shell-view [data-floating-cart],
        html.dingloft-shell-view .cart-overlay,html.dingloft-shell-view #cart-overlay,html.dingloft-shell-view .cart-drawer,html.dingloft-shell-view #cart-drawer,html.dingloft-shell-view .cart-brand-watermark{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
        html.dingloft-shell-view .hero-section,html.dingloft-shell-view .mt-hero{padding-top:18px!important}
        html.dingloft-shell-view .mt-quickbar{top:0!important}
        html.dingloft-shell-view main{padding-top:0!important}
        html.dingloft-shell-view .premium-footer{padding-bottom:26px!important}
        html.dingloft-shell-view .hero-proof,html.dingloft-shell-view .trust-bar,html.dingloft-shell-view .category-grid,html.dingloft-shell-view .category-section>.row,html.dingloft-shell-view .steps,html.dingloft-shell-view .mt-filter-row,html.dingloft-shell-view .mt-seo-artists,html.dingloft-shell-view [data-horizontal-scroll]{touch-action:pan-x pan-y!important;overscroll-behavior-x:contain!important;-webkit-overflow-scrolling:touch!important}
        html.dingloft-shell-view .auth-page,html.dingloft-shell-view .login-page{min-height:calc(100dvh - 110px)!important}
      }`;
    d.head.appendChild(s);
  }
  const killLegacy=()=>{
    d.querySelectorAll('#main-navbar,nav.navbar-glass,.navbar.navbar-glass,#mobileAppDock,nav.mobile-app-dock,.mobile-app-dock,.dingloft-direct-top,#dingloftDirectTop,#dlDirectTop,#dlDirectDock,#dlUniversalHeader,#dlUniversalDock,#dlGlobalChromeHost,.btn-floating-cart,.floating-cart,.cart-fab,[data-floating-cart]').forEach(el=>{el.style.setProperty('display','none','important');el.style.setProperty('pointer-events','none','important')});
    unlockProductScroll();
  };
  killLegacy();
  // v99: never observe every style/class in the whole product document.
  // v97 did that and killLegacy() itself writes styles, which could create a
  // self-sustaining mutation loop while program pages were booting.
  if(d.body&&!d.__dlShellV100Observer){
    const chromeSelector='#main-navbar,nav.navbar-glass,.navbar.navbar-glass,#mobileAppDock,nav.mobile-app-dock,.mobile-app-dock,.dingloft-direct-top,#dingloftDirectTop,#dlDirectTop,#dlDirectDock,#dlUniversalHeader,#dlUniversalDock,#dlGlobalChromeHost,.btn-floating-cart,.floating-cart,.cart-fab,[data-floating-cart]';
    const hideNode=node=>{
      if(!(node instanceof w.Element))return;
      const matches=[];
      if(node.matches?.(chromeSelector))matches.push(node);
      node.querySelectorAll?.(chromeSelector).forEach(el=>matches.push(el));
      matches.forEach(el=>{
        el.style.setProperty('display','none','important');
        el.style.setProperty('pointer-events','none','important');
      });
    };
    d.__dlShellV100Observer=new w.MutationObserver(records=>{
      for(const rec of records){
        for(const node of rec.addedNodes||[])hideNode(node);
      }
    });
    d.__dlShellV100Observer.observe(d.body,{childList:true,subtree:true});
  }
  if(productView&&d.body&&!d.__dlShellV100BodyLockObserver){
    d.__dlShellV100BodyLockObserver=new w.MutationObserver(()=>{
      if(d.body.classList.contains('no-scroll')||d.body.classList.contains('cart-open')){
        d.body.classList.remove('no-scroll','cart-open');
      }
      unlockProductScroll();
    });
    d.__dlShellV100BodyLockObserver.observe(d.body,{attributes:true,attributeFilter:['class']});
  }
  if(!d.__dlPersistentBridgeV93){
    d.__dlPersistentBridgeV93=1;
    d.addEventListener('click',e=>{
      const a=e.target instanceof w.Element?e.target.closest('a[href]'):null;
      if(!a||a.target==='_blank'||a.hasAttribute('download')||a.getAttribute('href')?.startsWith('mailto:')||a.getAttribute('href')?.startsWith('tel:'))return;
      const m=mapHref(a.getAttribute('href'),w.location.href);if(!m)return;
      const current=new URL(w.location.href);
      let target;try{target=new URL(a.getAttribute('href'),w.location.href)}catch(_){return}
      if(target.pathname===current.pathname&&target.search===current.search&&target.hash&&target.hash!==current.hash)return;
      e.preventDefault();e.stopPropagation();
      if(m.external){window.top.location.href=m.url;return;}
      navigate(m.route,m,{push:true});
    },true);
  }
  if(productView&&!d.__dlProductCartBridgeV97){
    d.__dlProductCartBridgeV97=1;
    d.addEventListener('click',e=>{
      const btn=e.target instanceof w.Element?e.target.closest('.btn-add-cart,[data-add-cart]'):null;
      if(!btn)return;
      // Let the page write the SKU to localStorage first, then release its old
      // hidden drawer lock and open the one persistent cart owned by the shell.
      setTimeout(()=>{
        unlockProductScroll();
        try{window.__dingloftOpenGlobalCart?.()}catch(_){}
      },0);
    },false);
  }
  if(IOS&&!w.__dlHorizontalLockV93){
    w.__dlHorizontalLockV93=1;let sx=0,sy=0,rail=null;
    const rails='[data-horizontal-scroll],.hero-proof,.trust-bar,.category-grid,.category-section > .row,.steps,.mt-filter-row,.mt-seo-artists,.tabs-header,.mt-filters,.mt-chip-row,.filter-row,.category-scroll,.product-tabs,.nav-pills,.shortcut-row,.horizontal-scroll,.table-scroll,.cards-scroll';
    const getRail=t=>{const el=t instanceof w.Element?t:null;const r=el?.closest?.(rails)||null;return r&&r.scrollWidth>r.clientWidth+3?r:null};
    d.addEventListener('touchstart',e=>{if(e.touches?.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY;rail=getRail(e.target)}},{passive:true});
    d.addEventListener('touchmove',e=>{if(e.touches?.length!==1)return;const dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;if(Math.abs(dx)<=Math.abs(dy)+3)return;if(rail&&rail.scrollWidth>rail.clientWidth+3)return;e.preventDefault()},{passive:false});
    d.addEventListener('touchend',()=>rail=null,{passive:true});d.addEventListener('touchcancel',()=>rail=null,{passive:true});
  }
}catch(_){}}

function navigate(route,params={},opt={}){
  const i=info(route,params);const id=++token;
  if(progress)progress.classList.add('show');
  activeDock(i.key);
  const f=document.createElement('iframe');
  f.className='frame in';f.allow='autoplay *; payment *; clipboard-read; clipboard-write';f.setAttribute('scrolling','no');f.style.overflow='hidden';f.style.touchAction='pan-y';f.style.overscrollBehavior='none';f.src=i.src;
  stage.appendChild(f);
  let firstLoad=true;
  f.addEventListener('load',()=>{
    if(id!==token){f.remove();return;}
    child(f);
    let loadedInfo=i;
    try {
      const currentHref=f.contentWindow?.location?.href||'';
      const mapped=mapHref(currentHref,currentHref);
      if(mapped&&!mapped.external) loadedInfo=info(mapped.route,mapped);
    } catch (_) {}
    activeDock(loadedInfo.key);
    if(firstLoad){
      firstLoad=false;
      requestAnimationFrame(()=>{f.classList.remove('in');f.classList.add('active')});
      const old=active;active=f;
      if(old&&old!==f){old.classList.add('out');setTimeout(()=>old.remove(),240)}
    }
    const state={route:loadedInfo.key,src:loadedInfo.key==='page'?cleanPublicSrc(loadedInfo.src):''};
    history.replaceState(state,'',appUrl(loadedInfo));
    if(progress)progress.classList.remove('show');
    cartCount();dingloftSplashReady();
    window.dispatchEvent(new CustomEvent('dingloft:shell-ready',{detail:{key:loadedInfo.key,version:100}}));
  });
  if(!opt.pop){const url=appUrl(i);if(opt.replace)history.replaceState({route:i.key,src:i.key==='page'?cleanPublicSrc(i.src):''},'',url);else if(opt.push!==false)history.pushState({route:i.key,src:i.key==='page'?cleanPublicSrc(i.src):''},'',url)}
}

window.DingloftPersistentShellV93={
  version:99,
  navigate:(route,params={})=>navigate(route,params,{push:true}),
  navigateHref:(href)=>shellNavigateHref(href,{push:true}),
  get activeKey(){return activeKey;},
  get activeFrame(){return active;}
};
window.DingloftPersistentShellV97=window.DingloftPersistentShellV93;
window.__DINGLOFT_PERSISTENT_SHELL_V93__=true;
window.__DINGLOFT_PERSISTENT_SHELL_V97__=true;

if(IOS){let sx=0,sy=0;document.addEventListener('touchstart',e=>{if(e.touches?.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}},{passive:true});document.addEventListener('touchmove',e=>{if(e.touches?.length!==1)return;const dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;if(Math.abs(dx)>Math.abs(dy)+3)e.preventDefault()},{passive:false})}
addEventListener('message',e=>{if(e.origin!==location.origin||!e.data||e.data.type!=='dingloft:navigate')return;navigate(e.data.route||'page',{src:e.data.src||''},{push:true})});
addEventListener('popstate',e=>{const state=e.state||{};const p=new URLSearchParams(location.search);navigate(state.route||p.get('route')||'home',{src:state.src||p.get('src')||''},{pop:true,push:false})});
addEventListener('storage',e=>{if(e.key==='dingloft_cart')cartCount()});
addEventListener('dingloft:cart-sync',cartCount);addEventListener('dingloft:mobile-cart-updated',cartCount);
setInterval(cartCount,1200);

const initial=info(qRoute(),{src:q.get('src')||''});
history.replaceState({route:initial.key,src:initial.key==='page'?cleanPublicSrc(initial.src):''},'',appUrl(initial));
navigate(initial.key,{src:q.get('src')||''},{replace:true,push:false});
cartCount();
})();

(() => {
  const online=document.getElementById('onlineState');
  const paint=()=>{if(!online)return;const span=online.querySelector('span:last-child');if(span)span.textContent=navigator.onLine?'Store online':'Sin conexión';online.style.opacity=navigator.onLine?'1':'.55'};
  addEventListener('online',paint);addEventListener('offline',paint);paint();
  const vv=visualViewport;if(vv){let base=Math.max(vv.height,innerHeight);const keyboard=()=>{base=Math.max(base,innerHeight);document.body.classList.toggle('keyboard-open',vv.height<base*.72)};vv.addEventListener('resize',keyboard);vv.addEventListener('scroll',keyboard);addEventListener('orientationchange',()=>setTimeout(()=>{base=Math.max(vv.height,innerHeight);keyboard()},250))}
})();
