(() => {
'use strict';
const M=matchMedia('(max-width:767px)');
const q=new URLSearchParams(location.search);
if(!M.matches){const route=q.get('route')||'home';const src=q.get('src')||'';const dest=src|| (route==='catalog'?'ventas.html#catalogo':route==='multitrack'?'multitrack.html':route==='account'?'account.html':'ventas.html');location.replace(dest);return;}
const stage=document.getElementById('stage'),progress=document.getElementById('progress'),count=document.getElementById('count'),toastEl=document.getElementById('toast');let active=null,token=0,activeKey='';
const toast=s=>{toastEl.textContent=s;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),1600)};
const sanitizeSrc=(raw)=>{try{const u=new URL(raw||'',location.href);if(u.origin!==location.origin)return'';const file=u.pathname.split('/').pop()||'index.html';if(!/^[A-Za-z0-9_.-]+\.html$/i.test(file))return'';u.searchParams.set('embed','1');return `${file}${u.search}${u.hash}`;}catch(_){return'';}};
function info(route,params={}){if(route==='catalog')return{key:'catalog',src:'ventas.html?embed=1#catalogo'};if(route==='multitrack')return{key:'multitrack',src:'multitrack.html?embed=1'};if(route==='account')return{key:'account',src:'account.html?embed=1'};if(route==='page'){const src=sanitizeSrc(params.src||'');return src?{key:'page',src}:{key:'catalog',src:'ventas.html?embed=1#catalogo'};}return{key:'home',src:'ventas.html?embed=1#inicio'};}
function fromUrl(){return info(qRoute(),{src:new URLSearchParams(location.search).get('src')||''})}function qRoute(){return new URLSearchParams(location.search).get('route')||'home'}
function appUrl(i){const u=new URL('app.html',location.href);u.searchParams.set('route',i.key);if(i.key==='page')u.searchParams.set('src',i.src.replace(/([?&])embed=1&?/,'$1').replace(/[?&]embed=1(?=#|$)/,''));return `${u.pathname}${u.search}`;}
function activeDock(key){const visual=key==='page'?'catalog':key;document.querySelectorAll('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===visual));}
function cartCount(){let n=0;try{const c=JSON.parse(localStorage.getItem('dingloft_cart')||'[]');if(Array.isArray(c))n=c.reduce((s,x)=>s+Math.max(0,Number(x?.qty||1)),0)}catch(_){}count.textContent=String(n)}
function mapHref(href,base){let u;try{u=new URL(href,base)}catch(_){return null}if(u.origin!==location.origin)return null;const file=(u.pathname.split('/').pop()||'index.html').toLowerCase();if(file==='index.html'||file==='ventas.html'||file===''){if((u.hash||'').toLowerCase()==='#catalogo')return{route:'catalog'};if((u.hash||'').toLowerCase()==='#multitrack')return{route:'multitrack'};return{route:'home'}}if(file==='tienda.html')return{route:'catalog'};if(file==='multitrack.html')return{route:'multitrack'};if(file==='account.html')return{route:'account'};if(file==='admin.html'||file==='commerce-admin.html'||file==='login.html'||file==='register.html')return null;return{route:'page',src:`${u.pathname.split('/').pop()}${u.search}${u.hash}`};}
function child(frame){try{const w=frame.contentWindow,d=w.document;d.documentElement.classList.add('dingloft-shell-view');if(!d.getElementById('dl-shell-style')){const s=d.createElement('style');s.id='dl-shell-style';s.textContent=`@media(max-width:767px){html.dingloft-shell-view,html.dingloft-shell-view body{background:#05070a!important;overscroll-behavior-y:contain!important}html.dingloft-shell-view body{padding-bottom:112px!important}html.dingloft-shell-view .navbar-glass,html.dingloft-shell-view .navbar.fixed-top,html.dingloft-shell-view .mobile-app-dock,html.dingloft-shell-view .btn-floating-cart{display:none!important}html.dingloft-shell-view .sidebar{display:none!important}html.dingloft-shell-view .app{display:block!important}html.dingloft-shell-view .content{padding:24px 16px 120px!important}html.dingloft-shell-view .hero-section{padding-top:28px!important}html.dingloft-shell-view main{padding-top:24px!important}html.dingloft-shell-view .premium-footer{padding-bottom:120px!important}}`;d.head.appendChild(s)}if(!d.__dlBridge){d.__dlBridge=1;d.addEventListener('click',e=>{const a=e.target instanceof w.Element?e.target.closest('a[href]'):null;if(!a||a.target==='_blank'||a.hasAttribute('download'))return;const m=mapHref(a.getAttribute('href'),w.location.href);if(!m)return;e.preventDefault();e.stopPropagation();navigate(m.route,m,{push:true})},true)} }catch(_){} }
function navigate(route,params={},opt={}){const i=info(route,params);const id=++token;progress.classList.add('show');activeDock(i.key);const f=document.createElement('iframe');f.className='frame in';f.allow='payment *; clipboard-read; clipboard-write';f.src=i.src;stage.appendChild(f);const loaded=()=>{if(id!==token){f.remove();return}child(f);requestAnimationFrame(()=>{f.classList.remove('in');f.classList.add('active')});const old=active;active=f;activeKey=i.key;if(old&&old!==f){old.classList.add('out');setTimeout(()=>old.remove(),280)}progress.classList.remove('show');cartCount()};f.addEventListener('load',loaded,{once:true});if(!opt.pop){const url=appUrl(i);if(opt.replace)history.replaceState({},'',url);else if(opt.push!==false)history.pushState({},'',url)}}
document.addEventListener('click',e=>{const a=e.target.closest?.('[data-route]');if(!a)return;e.preventDefault();navigate(a.dataset.route,{},{push:true})});
document.getElementById('cart').onclick=()=>{try{if(active){const d=active.contentWindow.document;const b=d.querySelector('.btn-floating-cart.cart-btn-global,.cart-btn-global');if(b){b.click();return}}}catch(_){}navigate('home',{}, {push:true});setTimeout(()=>{try{active?.contentWindow?.document?.querySelector('.btn-floating-cart.cart-btn-global,.cart-btn-global')?.click()}catch(_){}},250)};
addEventListener('message',e=>{if(e.origin!==location.origin||!e.data||e.data.type!=='dingloft:navigate')return;navigate(e.data.route||'page',{src:e.data.src||''},{push:true})});
addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);navigate(p.get('route')||'home',{src:p.get('src')||''},{pop:true,push:false})});addEventListener('storage',e=>{if(e.key==='dingloft_cart')cartCount()});setInterval(cartCount,1500);const initial=info(qRoute(),{src:new URLSearchParams(location.search).get('src')||''});history.replaceState({},'',appUrl(initial));navigate(initial.key,{src:new URLSearchParams(location.search).get('src')||''},{replace:true,push:false});cartCount();
})();

// App-mode runtime polish: network state + mobile keyboard handling.
(() => {
  const online=document.getElementById('onlineState');
  const paintNetwork=()=>{
    if(!online)return;
    const span=online.querySelector('span:last-child');
    if(span)span.textContent=navigator.onLine?'Store online':'Sin conexión';
    online.style.opacity=navigator.onLine?'1':'.55';
  };
  addEventListener('online',paintNetwork);
  addEventListener('offline',paintNetwork);
  paintNetwork();

  const vv=window.visualViewport;
  if(vv){
    let base=Math.max(vv.height,innerHeight);
    const keyboard=()=>{
      base=Math.max(base,innerHeight);
      document.body.classList.toggle('keyboard-open', vv.height < base * .72);
    };
    vv.addEventListener('resize',keyboard);
    vv.addEventListener('scroll',keyboard);
    addEventListener('orientationchange',()=>setTimeout(()=>{base=Math.max(vv.height,innerHeight);keyboard()},250));
  }
})();
