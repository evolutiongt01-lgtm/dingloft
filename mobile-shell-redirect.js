(() => {
  'use strict';
  if (window.self !== window.top) return;
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  const params = new URLSearchParams(location.search);
  if (params.get('embed') === '1') return;
  const file = (location.pathname.split('/').pop() || 'index.html');
  if (/^(app|index|login|register|admin|commerce-admin)\.html$/i.test(file)) return;
  const lower = file.toLowerCase();
  const app = new URL('app.html', location.href);
  if (lower === 'ventas.html') {
    const h = (location.hash || '').toLowerCase();
    app.searchParams.set('route', h === '#catalogo' ? 'catalog' : h === '#multitrack' ? 'multitrack' : 'home');
  } else if (lower === 'account.html') {
    app.searchParams.set('route', 'account');
  } else if (lower === 'multitrack.html') {
    app.searchParams.set('route', 'multitrack');
  } else {
    const src = `${file}${location.search || ''}${location.hash || ''}`;
    app.searchParams.set('route', 'page');
    app.searchParams.set('src', src);
  }
  location.replace(`${app.pathname}${app.search}`);
})();
