(() => {
  'use strict';
  const MOBILE = matchMedia('(max-width: 767px)');
  if (!MOBILE.matches) {
    const p = new URLSearchParams(location.search);
    const route = p.get('route') || 'home';
    const slug = p.get('slug') || '';
    const desktop = route === 'catalog' ? 'tienda.html' : route === 'multitrack' ? 'tienda.html?mode=multitrack' : route === 'account' ? 'account.html' : route === 'product' && slug ? `producto.html?slug=${encodeURIComponent(slug)}` : 'index.html';
    location.replace(desktop);
    return;
  }

  const stage = document.getElementById('dingloft-stage');
  const progress = document.getElementById('dl-route-progress');
  const dock = document.getElementById('dlShellDock');
  const cartBtn = document.getElementById('dlShellCart');
  const cartCount = document.getElementById('dlShellCartCount');
  const toastEl = document.getElementById('dlShellToast');
  let activeFrame = null;
  let activeRoute = '';
  let navToken = 0;
  let cartAfterHome = false;

  const toast = (text) => {
    if (!toastEl) return;
    toastEl.textContent = String(text || '');
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 1800);
  };

  const routeInfo = (route, params = {}) => {
    switch (route) {
      case 'catalog': return { key:'catalog', src:'tienda.html?embed=1' };
      case 'multitrack': return { key:'multitrack', src:'tienda.html?embed=1&mode=multitrack' };
      case 'account': return { key:'account', src:'account.html?embed=1' };
      case 'product': {
        const slug = String(params.slug || '').trim();
        if (!slug) return { key:'catalog', src:'tienda.html?embed=1' };
        return { key:'product', slug, src:`producto.html?embed=1&slug=${encodeURIComponent(slug)}` };
      }
      default: return { key:'home', src:'index.html?embed=1#inicio' };
    }
  };

  const currentFromUrl = () => {
    const p = new URLSearchParams(location.search);
    return routeInfo(p.get('route') || 'home', { slug:p.get('slug') || '' });
  };

  const appUrl = (info) => {
    const u = new URL('app.html', location.href);
    u.searchParams.set('route', info.key);
    if (info.key === 'product' && info.slug) u.searchParams.set('slug', info.slug);
    return `${u.pathname}${u.search}`;
  };

  const setActive = (route) => {
    const visual = route === 'product' ? 'catalog' : route;
    document.querySelectorAll('[data-shell-route]').forEach(a => {
      const on = a.dataset.shellRoute === visual;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
  };

  const showProgress = (show) => progress?.classList.toggle('show', !!show);

  const updateCartCount = () => {
    let total = 0;
    try {
      const cart = JSON.parse(localStorage.getItem('dingloft_cart') || '[]');
      if (Array.isArray(cart)) total = cart.reduce((sum, item) => sum + Math.max(0, Number(item?.qty || 0)), 0);
    } catch (_) {}
    if (cartCount) cartCount.textContent = String(total);
  };

  const routeForHref = (href, base) => {
    let u;
    try { u = new URL(href, base); } catch (_) { return null; }
    if (u.origin !== location.origin) return null;
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    const file = path.split('/').pop() || '';
    if (file === 'producto.html') return { route:'product', slug:u.searchParams.get('slug') || '' };
    if (file === 'tienda.html') {
      return u.searchParams.get('mode') === 'multitrack' ? { route:'multitrack' } : { route:'catalog' };
    }
    if (file === 'multitrack.html' || path.endsWith('/multitrack')) return { route:'multitrack' };
    if (file === 'account.html') return { route:'account' };
    if (file === 'index.html' || file === '' || path === '/') return { route:'home' };
    return null;
  };

  const installChildBridge = (frame) => {
    try {
      const win = frame.contentWindow;
      const doc = win.document;
      doc.documentElement.classList.add('dingloft-shell-view');
      doc.body?.classList.add('dingloft-shell-view');

      if (!doc.getElementById('dingloft-shell-injected-style')) {
        const style = doc.createElement('style');
        style.id = 'dingloft-shell-injected-style';
        style.textContent = `
          @media(max-width:767px){
            html.dingloft-shell-view,html.dingloft-shell-view body{background:#05070a!important;overscroll-behavior-y:contain!important}
            html.dingloft-shell-view body{padding-bottom:110px!important}
            html.dingloft-shell-view .navbar-glass,
            html.dingloft-shell-view .mobile-app-dock,
            html.dingloft-shell-view .btn-floating-cart,
            html.dingloft-shell-view body>header{display:none!important}
            html.dingloft-shell-view .hero-section{padding-top:26px!important}
            html.dingloft-shell-view main{padding-top:24px!important}
            html.dingloft-shell-view .toast{bottom:116px!important}
          }`;
        doc.head.appendChild(style);
      }

      if (!doc.__dingloftShellClickBridge) {
        doc.__dingloftShellClickBridge = true;
        doc.addEventListener('click', (e) => {
          const target = e.target instanceof win.Element ? e.target.closest('a[href]') : null;
          if (!target || target.target === '_blank' || target.hasAttribute('download')) return;
          const mapped = routeForHref(target.getAttribute('href'), win.location.href);
          if (!mapped) return;
          e.preventDefault();
          e.stopPropagation();
          navigate(mapped.route, mapped, { push:true });
        }, true);
      }
    } catch (_) {}
  };

  const openHomeCart = () => {
    if (!activeFrame) return false;
    try {
      const doc = activeFrame.contentWindow.document;
      const btn = doc.querySelector('.btn-floating-cart.cart-btn-global, .cart-btn-global');
      if (btn) {
        btn.click();
        updateCartCount();
        return true;
      }
    } catch (_) {}
    return false;
  };

  const navigate = (route, params = {}, options = {}) => {
    const info = routeInfo(route, params);
    const same = activeRoute === info.key && (info.key !== 'product' || activeFrame?.dataset.slug === info.slug);
    if (same) return;
    const token = ++navToken;
    showProgress(true);
    setActive(info.key);

    const frame = document.createElement('iframe');
    frame.className = 'dl-frame incoming';
    frame.setAttribute('title', `Dingloft ${info.key}`);
    frame.setAttribute('allow', 'payment *; clipboard-read; clipboard-write');
    frame.dataset.route = info.key;
    if (info.slug) frame.dataset.slug = info.slug;
    frame.src = info.src;
    stage.appendChild(frame);

    frame.addEventListener('load', () => {
      if (token !== navToken) { frame.remove(); return; }
      installChildBridge(frame);
      requestAnimationFrame(() => frame.classList.add('active'));
      frame.classList.remove('incoming');
      const old = activeFrame;
      activeFrame = frame;
      activeRoute = info.key;
      if (old && old !== frame) {
        old.classList.add('leaving');
        setTimeout(() => old.remove(), 300);
      }
      showProgress(false);
      updateCartCount();
      if (cartAfterHome && info.key === 'home') {
        cartAfterHome = false;
        setTimeout(() => { if (!openHomeCart()) toast('El carrito se está preparando…'); }, 160);
      }
    }, { once:true });

    if (!options.pop) {
      const url = appUrl(info);
      if (options.replace) history.replaceState({ route:info.key, slug:info.slug || '' }, '', url);
      else if (options.push !== false) history.pushState({ route:info.key, slug:info.slug || '' }, '', url);
    }
  };

  document.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target.closest('[data-shell-route]') : null;
    if (!el) return;
    e.preventDefault();
    navigate(el.dataset.shellRoute || 'home', {}, { push:true });
  });

  cartBtn?.addEventListener('click', () => {
    if (activeRoute === 'home') {
      if (!openHomeCart()) toast('Abriendo carrito…');
      return;
    }
    cartAfterHome = true;
    navigate('home', {}, { push:true });
  });

  dock?.addEventListener('pointermove', e => {
    const r = dock.getBoundingClientRect();
    dock.style.setProperty('--dock-x', `${e.clientX-r.left}px`);
  });

  addEventListener('storage', e => { if (e.key === 'dingloft_cart') updateCartCount(); });
  addEventListener('focus', updateCartCount);
  setInterval(updateCartCount, 1800);

  addEventListener('popstate', () => {
    const info = currentFromUrl();
    navigate(info.key, info, { pop:true, push:false });
  });

  const initial = currentFromUrl();
  history.replaceState({ route:initial.key, slug:initial.slug || '' }, '', appUrl(initial));
  navigate(initial.key, initial, { replace:true, push:false });
  updateCartCount();
})();
