/* Dingloft Persistent Mobile/Tablet Shell · v93
   All phone/tablet routes enter app.html once. From there only the content frame changes,
   so the header, search, bottom nav and independent cart never remount between pages. */
(() => {
  'use strict';
  if (window.self !== window.top) return;

  const ua = navigator.userAgent || '';
  const mobileOS = /Android|iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mobileViewport = window.matchMedia('(max-width:1024px)').matches && navigator.maxTouchPoints > 0;
  if (!(mobileOS || mobileViewport)) return;

  const params = new URLSearchParams(location.search);
  if (params.get('embed') === '1' || params.get('embed') === 'desktop') return;

  let part = (location.pathname.split('/').filter(Boolean).pop() || 'index').toLowerCase().replace(/\.html$/,'');
  if (part === 'app' || part === 'desktop-shell' || part === 'admin' || part === 'commerce-admin') return;

  let route = 'page';
  let src = '';
  const hash = location.hash || '';

  if (part === 'index' || part === 'tienda' || part === 'ventas' || part === '') {
    route = /#catalogo/i.test(hash) ? 'catalog' : 'home';
  } else if (part === 'multitrack' || part === 'multitracks') {
    route = 'multitrack';
  } else if (part === 'account' || part === 'cuenta') {
    route = 'account';
  } else {
    const known = new Set(['login','register','producto','autocad','cinema4d','dual','esword','logic','mainstage','nord','office','rhodes','sketchup','yamahakeys','offline']);
    if (!known.has(part)) return;
    const direct = new URL(location.href);
    direct.searchParams.delete('embed');
    direct.searchParams.delete('app');
    direct.searchParams.delete('direct');
    src = `${part}.html${direct.search}${direct.hash}`;
  }

  const shell = new URL('/app', location.origin);
  shell.searchParams.set('route', route);
  if (route === 'page' && src) shell.searchParams.set('src', src);
  document.documentElement.style.visibility = 'hidden';
  location.replace(`${shell.pathname}${shell.search}`);
})();
