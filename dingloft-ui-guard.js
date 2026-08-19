(() => {
  'use strict';
  const ua = navigator.userAgent || '';
  const isiOS = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isiOS;
  const isMobile = isiOS || isAndroid || (navigator.maxTouchPoints > 0 && matchMedia('(max-width:1024px)').matches);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

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

  // Horizontal trackpad scrolling for wide UI rails in the macOS app/desktop shell.
  const horizontalSelectors = [
    '[data-horizontal-scroll]','.tabs-header','.mt-filters','.mt-chip-row','.filter-row','.category-scroll',
    '.product-tabs','.nav-pills','.shortcut-row','.horizontal-scroll','.table-scroll','.cards-scroll'
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
      html,body{touch-action:pan-x pan-y;}
      html.dingloft-installed #navInstall,
      html.dingloft-installed #installAppBtn,
      html.dingloft-installed #installCard,
      html.dingloft-installed .site-install-banner,
      html.dingloft-installed .install-shell,
      html.dingloft-installed [data-install-cta],
      html.dingloft-installed .install-cta{display:none!important}
      ${horizontalSelectors}{-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:thin}
      @media(display-mode:standalone){#navInstall,#installAppBtn,#installCard,.site-install-banner,.install-shell,[data-install-cta],.install-cta{display:none!important}}
    `;
    document.head.appendChild(s);
  };

  addBaseStyle();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markInstalled, {once:true});
  else markInstalled();
  addEventListener('appinstalled', () => { localStorage.setItem('dingloft_installed_at', String(Date.now())); markInstalled(); });
  matchMedia('(display-mode: standalone)').addEventListener?.('change', markInstalled);
})();
