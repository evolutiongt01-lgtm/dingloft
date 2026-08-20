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

  const direct=new URL(location.href);
  direct.searchParams.delete('embed');
  direct.searchParams.delete('direct');
  direct.searchParams.set('app','1');

  const hash=(location.hash||'').toLowerCase();
  if(part==='index'||part==='tienda'||part===''){
    direct.pathname='/ventas';
    direct.hash=hash==='#catalogo'?'#catalogo':hash==='#multitrack'?'#multitrack':'#inicio';
  } else if(part==='ventas') {
    direct.pathname='/ventas';
    if(!direct.hash) direct.hash='#inicio';
  } else if(part==='multitrack') direct.pathname='/multitrack';
  else if(part==='account') direct.pathname='/account';
  else {
    const known=new Set(['login','register','producto','autocad','cinema4d','dual','esword','logic','mainstage','nord','office','rhodes','sketchup','yamahakeys']);
    if(!known.has(part)) return;
    direct.pathname=`/${part}.html`;
  }
  location.replace(`${direct.pathname}${direct.search}${direct.hash}`);
})();
