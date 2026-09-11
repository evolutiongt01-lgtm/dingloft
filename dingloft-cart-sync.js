/* Dingloft Unified Cart · v120
   Data layer only. UI is owned by dingloft-global-nav.js.
   No backdrop blur, no page-wide animation, no navbar movement. */
(() => {
  'use strict';
  if (window.DingloftCartSync?.version >= 120) return;

  const VERSION=120;
  const CART_KEY='dingloft_cart';
  const WORKER=String(
    window.DINGLOFT_WORKER_BASE ||
    document.querySelector('meta[name="dingloft-worker-base"]')?.content ||
    'https://autumn-breeze-dfa0.evolutiongt01.workers.dev'
  ).replace(/\/$/,'');

  const norm=value=>String(value??'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/&/g,' and ')
    .replace(/[^a-z0-9]+/g,' ').trim();
  const slugify=value=>norm(value).replace(/\s+/g,'-');

  const LEGACY_SKUS=new Map([
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

  let catalogByKey=new Map(),mtByKey=new Map(),refreshPromise=null;

  function canonicalSku(item={}){
    const rawSku=String(item.sku||item.productSku||item.workerSku||'').trim();
    if(rawSku&&!/^\d+$/.test(rawSku)&&!/^MT-\d+$/i.test(rawSku))return slugify(rawSku);
    const byName=LEGACY_SKUS.get(norm(item.name||item.title||''));
    if(byName)return byName;
    const rawId=String(item.id||'').trim();
    if(rawId&&!/^\d+$/.test(rawId)&&!/^MT-\d+$/i.test(rawId))return slugify(rawId);
    return rawSku||rawId||slugify(item.name||item.title||'');
  }
  function keyOf(item={}){
    const mtId=String(item.mtId||item.multitrackId||item.id||'').trim().toUpperCase();
    if(/^MT-\d+$/.test(mtId))return `mt:${mtId}`;
    return `sku:${canonicalSku(item)||norm(item.name||item.title||'')}`;
  }
  function imageOf(item={}){
    const raw=String(item.cover||item.imageUrl||item.imagePath||item.img||'dingloft').trim();
    if(/^(?:https?:)?\/\//i.test(raw)||raw.startsWith('data:')||raw.startsWith('blob:'))return raw;
    if(raw.startsWith('/'))return raw;
    if(raw.startsWith('img/'))return `/${raw}`;
    return `/img/${raw||'dingloft'}.png`;
  }
  function normalizeItem(raw={}){
    const item={...raw,qty:1,quantity:1};
    const maybeMt=String(item.id||item.multitrackId||'').trim().toUpperCase();
    const mtHint=/^MT-\d+$/.test(maybeMt)||String(item.type||'').toLowerCase().includes('multitrack');
    const mt=mtByKey.get(maybeMt)||mtByKey.get(norm(item.name||item.title||''))||null;
    if(mt){
      item.id=mt.id||item.id;
      item.sku=mt.commerceSku||mt.sku||item.sku||slugify(mt.title||item.name||'');
      item.name=mt.title||mt.name||item.name;
      item.type=mt.type||'Multitrack digital';
      item.img=mt.img||item.img||'dingloft';
      item.cover=mt.cover||item.cover||'';
      item.imageUrl=item.cover||item.imageUrl||'';
      if(Number.isFinite(Number(mt.price??mt.priceUsd)))item.price=Number(mt.price??mt.priceUsd);
      return item;
    }
    if(mtHint){
      if(/^MT-\d+$/.test(maybeMt))item.id=maybeMt;
      item.sku=String(item.sku||item.commerceSku||slugify(item.name||item.title||maybeMt)).trim();
      item.type=item.type||'Multitrack digital';
      item.img=item.img||'dingloft';
      return item;
    }
    const sku=canonicalSku(item);
    const product=catalogByKey.get(slugify(sku))||catalogByKey.get(norm(item.name||''))||null;
    item.sku=product?.sku||sku;
    if(item.sku)item.id=item.sku;
    if(product){
      item.name=product.name||item.name;
      item.type=product.type||product.category||item.type;
      item.img=product.img||item.img||'dingloft';
      item.imageUrl=product.imageUrl||product.imagePath||item.imageUrl||'';
      if(Number.isFinite(Number(product.priceUsd??product.price)))item.price=Number(product.priceUsd??product.price);
    }
    return item;
  }
  function normalizeCart(source){
    const rows=Array.isArray(source)?source:[];
    const out=[],seen=new Set();
    for(const raw of rows.slice(0,50)){
      const item=normalizeItem(raw||{});
      const key=keyOf(item);
      if(!key||key.endsWith(':')||seen.has(key))continue;
      seen.add(key);out.push(item);
    }
    return out;
  }
  function read(){
    try{return normalizeCart(JSON.parse(localStorage.getItem(CART_KEY)||'[]'))}
    catch(_){return[]}
  }
  function notify(cart){
    const detail={cart,items:cart,version:VERSION};
    window.dispatchEvent(new CustomEvent('dingloft:cart-sync',{detail}));
    window.dispatchEvent(new CustomEvent('dingloft:cart-change',{detail}));
    document.dispatchEvent(new CustomEvent('dingloft:cart-sync',{detail}));
    document.dispatchEvent(new CustomEvent('dingloft:cart-change',{detail}));
    try{
      if(window.parent&&window.parent!==window){
        window.parent.postMessage({type:'dingloft:cart-sync',cart,version:VERSION},location.origin);
      }
    }catch(_){}
  }
  function write(cart,shouldNotify=false){
    const normalized=normalizeCart(cart);
    try{localStorage.setItem(CART_KEY,JSON.stringify(normalized))}catch(_){}
    if(shouldNotify)notify(normalized);
    return normalized;
  }
  function addOrMerge(cart,raw){
    const list=normalizeCart(cart),incoming=normalizeItem(raw||{}),key=keyOf(incoming);
    const existing=list.find(item=>keyOf(item)===key);
    if(existing){Object.assign(existing,incoming,{qty:1,quantity:1});return list}
    list.push({...incoming,qty:1,quantity:1});
    return normalizeCart(list);
  }

  function indexCatalog(products=[],multitracks=[]){
    const pMap=new Map();
    for(const p of products){
      if(!p||p.active===false)continue;
      const sku=slugify(p.sku||p.slug||p.name||'');
      if(sku)pMap.set(sku,p);
      if(p.name)pMap.set(norm(p.name),p);
      for(const alias of Array.isArray(p.aliases)?p.aliases:[])pMap.set(norm(alias),p);
    }
    catalogByKey=pMap;
    const mMap=new Map();
    for(const mt of multitracks){
      if(!mt||mt.active===false)continue;
      const id=String(mt.id||'').trim().toUpperCase(),title=String(mt.title||mt.name||'').trim();
      const hydrated={...mt,id,title,type:'Multitrack digital',price:Number(mt.price??mt.priceUsd),commerceSku:mt.commerceSku||mt.sku||slugify(title),img:mt.img||'dingloft'};
      if(id)mMap.set(id,hydrated);
      if(title)mMap.set(norm(title),hydrated);
      if(hydrated.commerceSku)mMap.set(slugify(hydrated.commerceSku),hydrated);
    }
    mtByKey=mMap;
  }
  const productList=data=>Array.isArray(data)?data:(Array.isArray(data?.products)?data.products:(Array.isArray(data?.catalog)?data.catalog:(Array.isArray(data?.items)?data.items:[])));
  async function refresh({notify:doNotify=true}={}){
    if(refreshPromise)return refreshPromise;
    refreshPromise=(async()=>{
      try{
        const [pr,mr]=await Promise.allSettled([
          fetch(`${WORKER}/products/public`,{cache:'no-store',headers:{Accept:'application/json'}}),
          fetch(`${WORKER}/multitracks/catalog`,{cache:'no-store',headers:{Accept:'application/json'}})
        ]);
        const pd=pr.status==='fulfilled'&&pr.value.ok?await pr.value.json().catch(()=>({})):{};
        const md=mr.status==='fulfilled'&&mr.value.ok?await mr.value.json().catch(()=>({})):{};
        indexCatalog(productList(pd),Array.isArray(md?.multitracks)?md.multitracks:[]);
      }catch(_){}
      return write(read(),doNotify);
    })().finally(()=>{refreshPromise=null});
    return refreshPromise;
  }

  window.DingloftCartSync={
    version:VERSION,key:CART_KEY,worker:WORKER,
    normalize:normalizeCart,normalizeItem,canonicalSku,keyOf,imageOf,
    read,write,addOrMerge,refresh,current:()=>read()
  };

  // Synchronous migration only. Catalog hydration waits until the browser is idle.
  write(read(),false);
  const idle=window.requestIdleCallback||((cb)=>setTimeout(cb,900));
  idle(()=>{if(navigator.onLine)refresh({notify:false})},{timeout:2500});

  addEventListener('storage',e=>{
    if(e.key!==CART_KEY)return;
    notify(read());
  });
})();
