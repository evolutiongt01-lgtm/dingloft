(() => {
'use strict';
const DESKTOP=matchMedia('(min-width:900px) and (pointer:fine)').matches;
const q=new URLSearchParams(location.search);
if(!DESKTOP){const src=q.get('src')||'index.html';location.replace(src);return;}
const stage=document.getElementById('stage'),progress=document.getElementById('progress'),desktopSplash=document.getElementById('desktopSplash'),shellNav=document.getElementById('shellNav');let active=null,seq=0,firstFrameReady=false,navLoadSeq=0,navLoadTimer=0;const hideDesktopSplash=()=>{if(firstFrameReady)return;firstFrameReady=true;desktopSplash?.classList.add('hide');setTimeout(()=>desktopSplash?.remove(),600)};setTimeout(hideDesktopSplash,6500);const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||Boolean(localStorage.getItem('dingloft_installed_at'));document.documentElement.classList.toggle('dingloft-installed',installed);if(installed)document.getElementById('navInstall')?.remove();addEventListener('appinstalled',()=>{localStorage.setItem('dingloft_installed_at',String(Date.now()));document.getElementById('navInstall')?.remove()});
const homeFiles=new Set(['index.html','ventas.html','tienda.html','autocad.html','cinema4d.html','dual.html','esword.html','logic.html','mainstage.html','nord.html','office.html','producto.html','rhodes.html','sketchup.html','yamahakeys.html']);
const PRETTY_TO_FILE=new Map([
  ['/', 'ventas.html'],
  ['/multitracks','multitrack.html'],
  ['/multitrack','multitrack.html'],
  ['/cuenta','account.html'],
  ['/account','account.html'],
  ['/admin','admin.html']
]);
const FILE_TO_PRETTY=new Map([
  ['index.html','/'],['ventas.html','/'],['tienda.html','/'],
  ['multitrack.html','/multitracks'],['account.html','/cuenta'],['admin.html','/admin']
]);
function fileFromPublicPath(pathname){
  const path=(pathname||'/').replace(/\/+$/,'')||'/';
  if(PRETTY_TO_FILE.has(path))return PRETTY_TO_FILE.get(path);
  const part=path.split('/').filter(Boolean).pop()||'';
  if(!part||part==='desktop-shell')return 'ventas.html';
  if(/^[A-Za-z0-9_.-]+$/.test(part))return part.endsWith('.html')?part:`${part}.html`;
  return '';
}
function prettyPathForSrc(src){
  try{
    const u=new URL(publicSrc(src),location.origin);
    const file=(u.pathname.split('/').filter(Boolean).pop()||'ventas.html').toLowerCase();
    const base=FILE_TO_PRETTY.get(file)||`/${file.replace(/\.html$/i,'')}`;
    u.searchParams.delete('embed');
    const qs=u.searchParams.toString();
    return `${base}${qs?`?${qs}`:''}${u.hash||''}`;
  }catch(_){return '/'}
}
function cleanSrc(raw){try{const u=new URL(raw||'/',location.origin);if(u.origin!==location.origin)return'';let file=fileFromPublicPath(u.pathname);if(!file)return'';if(file.toLowerCase()==='desktop-shell.html')file='ventas.html';u.searchParams.set('embed','desktop');const qs=u.searchParams.toString();return `${file}${qs?`?${qs}`:''}${u.hash||''}`;}catch(_){return''}}
function publicSrc(src){return src.replace(/([?&])embed=desktop&?/,'$1').replace(/[?&]embed=desktop(?=#|$)/,'').replace(/\?$/,'')}
function shellUrl(src){return prettyPathForSrc(src)}
function classify(src){try{const u=new URL(src,location.origin);const file=(u.pathname.split('/').pop()||'index.html').toLowerCase();return{home:homeFiles.has(file),multitracks:file==='multitrack.html',account:file==='account.html'};}catch(_){return{}}}
const navActions=document.getElementById('desktopNavActions'),navGlider=document.getElementById('navGlider');
const navAdmin=document.getElementById('navAdmin'),navSearch=document.getElementById('navSearch');let adminSession=false,currentSrc='';const navButtons=[document.getElementById('navHome'),navSearch,navAdmin,document.getElementById('navMultitracks'),document.getElementById('navAccount')].filter(Boolean);
function moveNavGlider(el){if(!navGlider||!el)return;navGlider.style.width=`${el.offsetWidth}px`;navGlider.style.transform=`translateX(${el.offsetLeft}px)`;navGlider.style.opacity='1'}
function syncNavGlider(){const activeBtn=navButtons.find(btn=>btn.classList.contains('active'))||document.getElementById('navHome');requestAnimationFrame(()=>moveNavGlider(activeBtn))}
navButtons.forEach(btn=>btn.addEventListener('pointerenter',()=>moveNavGlider(btn)));
navActions?.addEventListener('pointerleave',syncNavGlider);
addEventListener('resize',syncNavGlider,{passive:true});
function isTrueHome(src){try{const u=new URL(src,location.origin),file=(u.pathname.split('/').pop()||'index.html').toLowerCase();return file==='ventas.html'||file==='index.html'||file==='tienda.html'}catch(_){return false}}function syncAdminNav(){if(!navAdmin)return;navAdmin.hidden=!(adminSession&&isTrueHome(currentSrc));requestAnimationFrame(syncNavGlider)}function paint(src){currentSrc=src;const c=classify(src);document.getElementById('navHome')?.classList.toggle('active',!!c.home);document.getElementById('navMultitracks')?.classList.toggle('active',!!c.multitracks);document.getElementById('navAccount')?.classList.toggle('active',!!c.account);syncAdminNav()}
function setNavLoadOrigin(){if(!shellNav)return;const activeBtn=navButtons.find(btn=>btn.classList.contains('active'))||document.getElementById('navHome');if(!activeBtn)return;const navRect=shellNav.getBoundingClientRect(),btnRect=activeBtn.getBoundingClientRect();const x=Math.max(24,Math.min(navRect.width-24,btnRect.left-navRect.left+btnRect.width/2));shellNav.style.setProperty('--load-x',`${x}px`)}
function beginNavLoad(){if(!shellNav)return null;const token=++navLoadSeq;clearTimeout(navLoadTimer);setNavLoadOrigin();shellNav.classList.remove('loading','load-complete');void shellNav.offsetWidth;shellNav.classList.add('loading');return{token,started:performance.now()}}
function endNavLoad(state){if(!shellNav||!state||state.token!==navLoadSeq)return;const delay=Math.max(0,380-(performance.now()-state.started));clearTimeout(navLoadTimer);navLoadTimer=setTimeout(()=>{if(state.token!==navLoadSeq)return;shellNav.classList.remove('loading');shellNav.classList.add('load-complete');setTimeout(()=>{if(state.token===navLoadSeq)shellNav.classList.remove('load-complete')},480)},delay)}
function mapHref(href,base){let u;try{u=new URL(href,base)}catch(_){return null}if(u.origin!==location.origin)return null;const current=new URL(base);if(u.pathname===current.pathname&&u.search===current.search&&u.hash&&u.hash!==current.hash)return{hashOnly:true,url:u.href};let file=fileFromPublicPath(u.pathname);if(!file)return null;if(file.toLowerCase()==='desktop-shell.html')file='ventas.html';return{src:`${file}${u.search}${u.hash}`}}
function prepare(frame){try{const w=frame.contentWindow,d=w.document;d.documentElement.classList.add('dingloft-desktop-shell-view');d.body?.classList.add('dingloft-desktop-shell-view');if(!d.getElementById('dl-desktop-shell-style')){const s=d.createElement('style');s.id='dl-desktop-shell-style';s.textContent=`@media(min-width:900px) and (pointer:fine){html.dingloft-desktop-shell-view,html.dingloft-desktop-shell-view body{overscroll-behavior-x:auto!important}html.dingloft-desktop-shell-view body{padding-top:82px!important}html.dingloft-desktop-shell-view #dingloftDesktopGlobalNav,html.dingloft-desktop-shell-view .topbar,html.dingloft-desktop-shell-view .navbar-glass,html.dingloft-desktop-shell-view nav.navbar.fixed-top{display:none!important}html.dingloft-desktop-shell-view body.dgn-offset-page{padding-top:82px!important}html.dingloft-desktop-shell-view body.dgn-offset-page .sidebar{top:82px!important;height:calc(100vh - 82px)!important}html.dingloft-desktop-shell-view body.dgn-offset-page .app,html.dingloft-desktop-shell-view body.dgn-offset-page .content{min-height:calc(100vh - 82px)!important}.tabs-header,.mt-filters,.mt-chip-row,.filter-row,.category-scroll,.product-tabs,.nav-pills,.horizontal-scroll,.table-scroll,.cards-scroll{overscroll-behavior-x:contain!important;-webkit-overflow-scrolling:touch!important}html.dingloft-desktop-shell-view .mt-quickbar{top:82px!important}html.dingloft-desktop-shell-view .btn-floating-cart{width:58px!important;height:58px!important;right:24px!important;bottom:24px!important;border-radius:18px!important;background:linear-gradient(145deg,#fbfdff,#eaf1f5)!important;color:#080b0e!important;border:1px solid rgba(255,255,255,.82)!important;box-shadow:0 18px 45px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.95)!important;transform:none!important;filter:none!important}html.dingloft-desktop-shell-view .btn-floating-cart:hover{transform:translateY(-3px)!important;background:#fff!important;box-shadow:0 24px 54px rgba(0,0,0,.5)!important}html.dingloft-desktop-shell-view .btn-floating-cart i{color:#080b0e!important;text-shadow:none!important;filter:none!important}html.dingloft-desktop-shell-view .btn-floating-cart .badge-floating{top:-6px!important;right:-6px!important;min-width:23px!important;height:23px!important;padding:0 6px!important;display:grid!important;place-items:center!important;border-radius:999px!important;background:#1da5ee!important;color:#fff!important;border:3px solid #06080b!important;box-shadow:none!important;font-size:.65rem!important}html.dingloft-desktop-shell-view body.cart-open .btn-floating-cart{background:#fff!important;color:#080b0e!important;transform:none!important}html.dingloft-desktop-shell-view body.cart-open .btn-floating-cart:hover{transform:translateY(-2px)!important}}`;d.head.appendChild(s)}
const normalizeCart=()=>{d.querySelectorAll('.btn-floating-cart').forEach(btn=>{btn.querySelectorAll('i.bi-cart3,i.bi-cart4,i.bi-cart,i.bi-basket,i.bi-basket2,i.bi-basket3').forEach(i=>{i.className='bi bi-bag'});btn.setAttribute('aria-label','Abrir carrito');btn.setAttribute('title','Ver carrito')})};normalizeCart();if(d.body&&!d.__dlCartNormalizeObserver){d.__dlCartNormalizeObserver=new w.MutationObserver(normalizeCart);d.__dlCartNormalizeObserver.observe(d.body,{childList:true,subtree:true})}
if(!d.__dingloftDesktopBridge){d.__dingloftDesktopBridge=1;d.addEventListener('click',e=>{const a=e.target instanceof w.Element?e.target.closest('a[href]'):null;if(!a||a.target==='_blank'||a.hasAttribute('download')||a.getAttribute('href')?.startsWith('mailto:')||a.getAttribute('href')?.startsWith('tel:'))return;const m=mapHref(a.getAttribute('href'),w.location.href);if(!m)return;if(m.hashOnly)return;e.preventDefault();e.stopPropagation();navigate(m.src,{push:true})},true)}if(!w.__dlDesktopInteraction){w.__dlDesktopInteraction=1;['gesturestart','gesturechange','gestureend'].forEach(type=>d.addEventListener(type,e=>e.preventDefault(),{passive:false}));w.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();return}let rail=e.target instanceof w.Element?e.target.closest('[data-horizontal-scroll],.tabs-header,.mt-filters,.mt-chip-row,.filter-row,.category-scroll,.product-tabs,.nav-pills,.horizontal-scroll,.table-scroll,.cards-scroll'):null;if(!rail){let n=e.target instanceof w.Element?e.target:null;while(n&&n!==d.body){if(n.scrollWidth>n.clientWidth+4){rail=n;break}n=n.parentElement}}if(!rail||rail.scrollWidth<=rail.clientWidth+4)return;const intent=Math.abs(e.deltaX)>1||(e.shiftKey&&Math.abs(e.deltaY)>1);if(!intent)return;const delta=Math.abs(e.deltaX)>1?e.deltaX:e.deltaY;const before=rail.scrollLeft;rail.scrollLeft+=delta;if(rail.scrollLeft!==before)e.preventDefault()},{passive:false});w.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&['+','=','-','0'].includes(e.key))e.preventDefault()},{passive:false})}
const t=(d.title||'').trim();if(t)document.title=t.includes('Dingloft')?t:`${t} · Dingloft`;
}catch(_){}}
function navigate(raw,opt={}){const src=cleanSrc(raw);if(!src)return;const id=++seq;paint(src);const loadState=beginNavLoad();const f=document.createElement('iframe');f.className='frame';f.allow='autoplay *; payment *; clipboard-read; clipboard-write';f.src=src;stage.appendChild(f);f.addEventListener('load',()=>{if(id!==seq){f.remove();return}prepare(f);requestAnimationFrame(()=>f.classList.add('active'));hideDesktopSplash();const old=active;active=f;if(old&&old!==f){old.classList.add('out');setTimeout(()=>old.remove(),220)}endNavLoad(loadState)},{once:true});if(!opt.pop){const url=shellUrl(src);if(opt.replace)history.replaceState({src:publicSrc(src)},'',url);else if(opt.push!==false)history.pushState({src:publicSrc(src)},'',url)}}

/* ===== Dynamic catalog search · v89 ===== */
const SEARCH_WORKER=String(window.DINGLOFT_WORKER_BASE||'https://autumn-breeze-dfa0.evolutiongt01.workers.dev').replace(/\/$/,'');
const searchOverlay=document.getElementById('desktopSearchOverlay'),searchInput=document.getElementById('desktopSearchInput'),searchResults=document.getElementById('desktopSearchResults'),searchClose=document.getElementById('desktopSearchClose');
let searchCatalog=[],searchLoadPromise=null;
const sNorm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sSlug=v=>sNorm(v).replace(/\s+/g,'-');
const sEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sImage=item=>{const raw=String(item?.cover||item?.imageUrl||item?.imagePath||item?.img||'dingloft').trim();if(/^(?:https?:)?\/\//i.test(raw)||raw.startsWith('data:')||raw.startsWith('blob:'))return raw;if(raw.startsWith('/'))return raw;if(raw.startsWith('img/'))return `/${raw}`;return `/img/${raw||'dingloft'}.png`};
const sList=data=>Array.isArray(data)?data:(Array.isArray(data?.products)?data.products:(Array.isArray(data?.catalog)?data.catalog:(Array.isArray(data?.items)?data.items:[])));
async function loadDesktopSearchCatalog(){
  if(searchLoadPromise)return searchLoadPromise;
  searchLoadPromise=(async()=>{
    const [pr,mr]=await Promise.allSettled([
      fetch(`${SEARCH_WORKER}/products/public`,{cache:'no-store',headers:{Accept:'application/json'}}),
      fetch(`${SEARCH_WORKER}/multitracks/catalog`,{cache:'no-store',headers:{Accept:'application/json'}})
    ]);
    const products=pr.status==='fulfilled'&&pr.value.ok?sList(await pr.value.json().catch(()=>({}))):[];
    const md=mr.status==='fulfilled'&&mr.value.ok?await mr.value.json().catch(()=>({})):{};
    const multitracks=Array.isArray(md?.multitracks)?md.multitracks:[];
    const out=[],seen=new Set();
    for(const p of products){
      if(!p||p.active===false||String(p.type||'').toLowerCase().includes('multitrack'))continue;
      const sku=String(p.sku||p.slug||sSlug(p.name)).trim(),key=`p:${sSlug(sku||p.name)}`;if(!sku||seen.has(key))continue;seen.add(key);
      out.push({kind:'product',sku,name:String(p.name||sku),type:String(p.category||p.type||'Producto digital'),price:Number(p.priceUsd??p.price),img:sImage(p),aliases:Array.isArray(p.aliases)?p.aliases:[]});
    }
    for(const mt of multitracks){
      if(!mt||mt.active===false||!Number.isFinite(Number(mt.price??mt.priceUsd)))continue;
      const id=String(mt.id||'').trim(),name=String(mt.title||mt.name||id).trim();if(!id||!name)continue;const key=`m:${id.toUpperCase()}`;if(seen.has(key))continue;seen.add(key);
      out.push({kind:'multitrack',id,sku:String(mt.commerceSku||mt.sku||sSlug(name)),name,type:`${mt.artist||'Dingloft'} · Multitrack`,artist:String(mt.artist||''),price:Number(mt.price??mt.priceUsd),img:sImage({...mt,cover:mt.cover||''}),cover:Boolean(mt.cover)});
    }
    searchCatalog=out.sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
    return searchCatalog;
  })().finally(()=>{searchLoadPromise=null});
  return searchLoadPromise;
}
function renderDesktopSearch(term=''){
  if(!searchResults)return;const q=sNorm(term);let rows=searchCatalog;
  if(q)rows=rows.filter(item=>sNorm([item.name,item.sku,item.type,item.artist,...(item.aliases||[])].join(' ')).includes(q));
  rows=rows.slice(0,q?30:12);
  if(!rows.length){searchResults.innerHTML=`<div class="dl-search-empty"><b>${q?'Sin resultados':'Catálogo listo'}</b>${q?'Prueba con otro nombre, categoría o artista.':'Escribe para buscar en todos los productos.'}</div>`;return}
  searchResults.innerHTML=rows.map((item,index)=>{const price=Number.isFinite(item.price)?(item.price===0?'Gratis':`$${item.price.toFixed(2)}`):'';return `<a class="dl-search-result" href="#" data-search-index="${index}" data-search-key="${sEsc(item.kind==='multitrack'?item.id:item.sku)}"><span class="dl-search-art ${item.cover?'cover':''}"><img src="${sEsc(item.img)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/img/dingloft.png'"></span><span class="dl-search-copy"><strong>${sEsc(item.name)}</strong><small>${sEsc(item.type)}</small></span><span class="dl-search-price">${sEsc(price)}</span></a>`}).join('');
  // Store current filtered rows on the container; DOM indices refer to this exact slice.
  searchResults.__rows=rows;
}
async function openDesktopSearch(){
  if(!searchOverlay)return;searchOverlay.classList.add('show');searchOverlay.setAttribute('aria-hidden','false');moveNavGlider(navSearch||document.getElementById('navHome'));if(searchResults)searchResults.innerHTML='<div class="dl-search-empty"><b>Actualizando catálogo…</b>Buscando productos disponibles.</div>';setTimeout(()=>searchInput?.focus(),70);
  try{await loadDesktopSearchCatalog();renderDesktopSearch(searchInput?.value||'')}catch(_){if(searchResults)searchResults.innerHTML='<div class="dl-search-empty"><b>No pudimos cargar el catálogo</b>Revisa tu conexión e inténtalo otra vez.</div>'}
}
function closeDesktopSearch(){if(!searchOverlay)return;searchOverlay.classList.remove('show');searchOverlay.setAttribute('aria-hidden','true');syncNavGlider()}
navSearch?.addEventListener('click',e=>{e.preventDefault();openDesktopSearch()});
searchClose?.addEventListener('click',e=>{e.preventDefault();closeDesktopSearch()});
searchInput?.addEventListener('input',e=>renderDesktopSearch(e.target.value));
searchOverlay?.addEventListener('click',e=>{if(e.target===searchOverlay)closeDesktopSearch()});
searchResults?.addEventListener('click',e=>{const a=e.target.closest?.('[data-search-index]');if(!a)return;e.preventDefault();const rows=searchResults.__rows||[];const item=rows[Number(a.dataset.searchIndex)];if(!item)return;closeDesktopSearch();navigate(item.kind==='multitrack'?`multitrack.html#mt-${encodeURIComponent(item.id)}`:`producto.html?slug=${encodeURIComponent(item.sku)}`,{push:true})});
addEventListener('keydown',e=>{if(e.key==='Escape'&&searchOverlay?.classList.contains('show'))closeDesktopSearch()});

document.addEventListener('click',e=>{const a=e.target.closest?.('[data-shell-link]');if(!a)return;e.preventDefault();navigate(a.getAttribute('href'),{push:true})});
addEventListener('message',e=>{if(e.origin!==location.origin||!e.data)return;if(e.data.type==='dingloft:admin-state'){adminSession=e.data.isAdmin===true;try{sessionStorage.setItem('dingloft_admin_nav',adminSession?'1':'0')}catch(_){}syncAdminNav();return}if(e.data.type==='dingloft:desktop-navigate')navigate(e.data.src||'index.html',{push:true})});try{adminSession=sessionStorage.getItem('dingloft_admin_nav')==='1'}catch(_){}
addEventListener('popstate',e=>{const src=e.state?.src||fileFromPublicPath(location.pathname)||'ventas.html';navigate(src,{pop:true,push:false})});
const initial=q.get('src')||fileFromPublicPath(location.pathname)||'ventas.html';history.replaceState({src:publicSrc(initial)},'',shellUrl(initial));navigate(initial,{replace:true,push:false});
})();