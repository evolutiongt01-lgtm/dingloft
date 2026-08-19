(() => {
  'use strict';

  const DESKTOP_QUERY = '(min-width: 900px) and (pointer: fine)';
  if (!window.matchMedia(DESKTOP_QUERY).matches) return;
  // The mobile App Shell owns navigation inside framed views.
  if (window.top !== window.self) return;
  if (document.getElementById('dingloftDesktopGlobalNav')) return;

  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // index.html already contains the exact native bar the user approved.
  const nativeIndexBar = path === 'index.html' && document.querySelector('.topbar .brand');
  if (nativeIndexBar) return;

  const style = document.createElement('style');
  style.id = 'dingloftDesktopGlobalNavStyles';
  style.textContent = `
    #dingloftDesktopGlobalNav{
      --dgn-line:rgba(255,255,255,.12);
      --dgn-text:#f4f6f8;
      --dgn-muted:#6f7884;
      position:fixed;
      top:16px;
      left:50%;
      transform:translateX(-50%);
      z-index:99990;
      width:min(1320px,calc(100% - 34px));
      min-height:78px;
      padding:12px 16px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:18px;
      border:1px solid var(--dgn-line);
      border-radius:24px;
      background:
        radial-gradient(circle at 10% 0,rgba(91,211,255,.09),transparent 22rem),
        linear-gradient(150deg,rgba(15,19,24,.92),rgba(8,10,14,.94));
      box-shadow:0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.045);
      backdrop-filter:blur(24px) saturate(150%);
      -webkit-backdrop-filter:blur(24px) saturate(150%);
      font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
    }
    #dingloftDesktopGlobalNav *{box-sizing:border-box}
    #dingloftDesktopGlobalNav a{text-decoration:none!important}
    .dgn-brand{display:flex;align-items:center;gap:13px;color:#fff;min-width:0}
    .dgn-brand img{width:45px;height:45px;object-fit:contain;border-radius:14px;box-shadow:0 8px 24px rgba(82,198,255,.12)}
    .dgn-brand-copy{display:flex;flex-direction:column;line-height:1;min-width:0}
    .dgn-brand-copy strong{font-size:1rem;letter-spacing:.22em;color:#f7f8fa;white-space:nowrap}
    .dgn-brand-copy span{margin-top:7px;color:var(--dgn-muted);font-size:.61rem;letter-spacing:.18em;text-transform:uppercase;white-space:nowrap}
    .dgn-actions{display:flex;align-items:center;gap:10px;margin-left:auto}
    .dgn-action{
      position:relative;
      height:46px;
      padding:0 17px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:9px;
      border:1px solid var(--dgn-line);
      border-radius:14px;
      background:rgba(255,255,255,.025);
      color:#dce2e8!important;
      font-size:.8rem;
      font-weight:800;
      letter-spacing:-.01em;
      transition:transform .2s ease,border-color .2s ease,background .2s ease,color .2s ease;
    }
    .dgn-action:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.23);background:rgba(255,255,255,.065);color:#fff!important}
    .dgn-action.active{background:rgba(112,211,255,.09);border-color:rgba(112,211,255,.25);color:#c9f2ff!important;box-shadow:inset 0 -2px rgba(91,215,255,.58)}
    .dgn-action.primary{background:#f2f5f7;color:#070a0d!important;border-color:#f2f5f7;padding:0 19px;box-shadow:0 10px 24px rgba(0,0,0,.16)}
    .dgn-action.primary:hover{background:#fff;border-color:#fff;color:#050709!important}
    .dgn-icon{font-size:.96rem;line-height:1}
    body.dgn-offset-page{padding-top:108px!important}
    body.dgn-offset-page .sidebar{top:108px!important;height:calc(100vh - 108px)!important}
    body.dgn-offset-page .app{min-height:calc(100vh - 108px)!important}
    body.dgn-offset-page .content{min-height:calc(100vh - 108px)}
    /* Existing legacy navbars are replaced on desktop, but remain untouched on mobile. */
    body.dgn-has-legacy-nav .navbar-glass,
    body.dgn-has-legacy-nav nav.navbar.fixed-top{display:none!important}
    @media(max-width:899px),(pointer:coarse){#dingloftDesktopGlobalNav{display:none!important}}
  `;
  document.head.appendChild(style);

  const legacyNav = document.querySelector('.navbar-glass, nav.navbar.fixed-top');
  if (legacyNav) document.body.classList.add('dgn-has-legacy-nav');
  else document.body.classList.add('dgn-offset-page');

  // Keep a few full-screen auth/card layouts centered after adding the nav offset.
  if (['login.html','register.html'].includes(path)) document.body.classList.add('dgn-auth-page');

  const icon = (name) => {
    const map = {
      bag:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
      user:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3"/><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"/></svg>',
      download:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M5 20h14"/></svg>'
    };
    return map[name] || '';
  };

  const isSales = ['ventas.html','autocad.html','cinema4d.html','dual.html','esword.html','logic.html','mainstage.html','multitrack.html','nord.html','office.html','producto.html','rhodes.html','sketchup.html','yamahakeys.html','tienda.html'].includes(path);
  const isAccount = path === 'account.html';

  const nav = document.createElement('header');
  nav.id = 'dingloftDesktopGlobalNav';
  nav.setAttribute('aria-label','Navegación principal de Dingloft');
  nav.innerHTML = `
    <a class="dgn-brand" href="index.html" aria-label="Dingloft inicio">
      <img src="/img/pwa-liquid-192-v5.png?v=7" alt="Dingloft" onerror="this.src='img/dingloft.png'">
      <span class="dgn-brand-copy"><strong>DINGLOFT</strong><span>EVOLUTION GROUP</span></span>
    </a>
    <nav class="dgn-actions" aria-label="Accesos de Dingloft">
      <a class="dgn-action ${isSales ? 'active' : ''}" href="ventas.html">${icon('bag')}<span>Ventas</span></a>
      <a class="dgn-action ${isAccount ? 'active' : ''}" href="account.html">${icon('user')}<span>Mi cuenta</span></a>
      <a class="dgn-action primary" href="index.html#instalar">${icon('download')}<span>Instalar app</span></a>
    </nav>
  `;
  document.body.prepend(nav);
})();
