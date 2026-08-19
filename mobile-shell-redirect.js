(() => {
  'use strict';
  if (window.self !== window.top) return;
  const ua=navigator.userAgent||'';
  const mobileOS=/Android|iPhone|iPad|iPod/i.test(ua) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const mobileViewport=window.matchMedia('(max-width:1024px)').matches && navigator.maxTouchPoints>0;
  if (!(mobileOS || mobileViewport)) return;
  const params=new URLSearchParams(location.search);
  if(params.get('embed')==='1' || params.get('app')==='1' || params.get('direct')==='1') return;

  let part=(location.pathname.split('/').filter(Boolean).pop()||'index').toLowerCase();
  part=part.replace(/\.html$/,'');
  if(part==='app') return;
  if(part==='admin'||part==='commerce-admin') return;

  const app=new URL('/app.html',location.origin);
  const hash=(location.hash||'').toLowerCase();
  if(part==='index'||part==='ventas'||part==='tienda'||part===''){
    app.searchParams.set('route',hash==='#catalogo'?'catalog':hash==='#multitrack'?'multitrack':'home');
  } else if(part==='multitrack') app.searchParams.set('route','multitrack');
  else if(part==='account') app.searchParams.set('route','account');
  else {
    const known=new Set(['login','register','producto','autocad','cinema4d','dual','esword','logic','mainstage','nord','office','rhodes','sketchup','yamahakeys']);
    const file=known.has(part)?`${part}.html`:(part.includes('.')?part:`${part}.html`);
    const src=`${file}${location.search||''}${location.hash||''}`;
    app.searchParams.set('route','page'); app.searchParams.set('src',src);
  }
  location.replace(`${app.pathname}${app.search}`);
})();
