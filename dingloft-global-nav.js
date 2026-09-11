/* Dingloft Global Navbar + Cart · v121
   Single persistent component based on ventas.html.
   It renders only in the TOP document (desktop-shell/app/direct page), never inside iframes.
   Cart uses transform/opacity only: no page-wide blur/scale choreography. */
(() => {
  'use strict';
  if (window.__DINGLOFT_GLOBAL_NAV_V121__) return;
  window.__DINGLOFT_GLOBAL_NAV_V121__ = true;

  const VERSION = 121;
  const CART_KEY = 'dingloft_cart';
  const WORKER = String(
    window.DINGLOFT_WORKER_BASE ||
    document.querySelector('meta[name="dingloft-worker-base"]')?.content ||
    'https://autumn-breeze-dfa0.evolutiongt01.workers.dev'
  ).replace(/\/$/, '');

  // Embedded pages never own navigation/cart. The shell owns them once.
  if (window.self !== window.top) {
    window.DingloftGlobalNav = {
      version: VERSION,
      notifyCart(item, sourceRect) {
        try {
          window.parent.postMessage({type:'dingloft:cart-added', item, sourceRect}, location.origin);
        } catch (_) {}
      },
      navigate(href) {
        try {
          window.parent.postMessage({type:'dingloft:global-navigate', href}, location.origin);
        } catch (_) { location.href = href; }
      }
    };
    return;
  }

  const file = (location.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
  if (file.includes('admin') || file === 'commerce-admin') return;

  const onReady = fn => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, {once:true})
    : fn();

  onReady(() => {
    if (document.getElementById('dingloftGlobalNavV120')) return;

    const style = document.createElement('style');
    style.id = 'dingloftGlobalNavStyleV120';
    style.textContent = `
      :root{
        --dgn-bg:#05070a;
        --dgn-text:#f4f6f8;
        --dgn-muted:#a8adb4;
        --dgn-line:rgba(255,255,255,.08);
        --dgn-accent:#b7ff34;
        --dgn-safe-top:env(safe-area-inset-top,0px);
        --dgn-h:68px;
        --dgn-total-h:calc(var(--dgn-h) + var(--dgn-safe-top));
      }

      html.dgn-cart-open,html.dgn-cart-open body{overscroll-behavior:none!important}
      body.dgn-cart-open{overflow:hidden!important}

      /* One global navbar. Any local/legacy public navbar is hidden. */
      #shellNav,#dlMobileHeaderV71,#dlMobileDockV71,#dock,
      body > .helmet-site-header,
      body > #main-navbar,
      body > nav.navbar-glass,
      body > .navbar.navbar-glass,
      body > nav.navbar.fixed-top,
      body > .topbar,
      body > #dingloftDesktopGlobalNav,
      body > #dingloftGlobalNav{
        display:none!important;
      }

      body.dgn-global-direct{
        padding-top:var(--dgn-total-h)!important;
      }
      body.dgn-global-direct .helmet-site-header{display:none!important}
      body.dgn-global-direct .hero-grid{padding-top:0!important}

      /* Local page carts are not the navbar cart anymore. */
      body.dgn-global-direct > .cart-panel,
      body.dgn-global-direct > .cart-panel-overlay,
      body.dgn-global-direct > .cart-drawer,
      body.dgn-global-direct > .cart-overlay,
      body.dgn-global-direct > #cartDrawer,
      body.dgn-global-direct > #cartPanelOverlay,
      body.dgn-global-direct > #cart-drawer,
      body.dgn-global-direct > #cart-overlay,
      body.dgn-global-direct > .btn-floating-cart{
        display:none!important;
      }

      .dgn-v120{
        position:fixed;z-index:2147482500;
        inset:0 0 auto 0;
        height:var(--dgn-total-h);
        padding-top:var(--dgn-safe-top);
        background:rgba(5,7,10,.975);
        border-bottom:1px solid var(--dgn-line);
        color:var(--dgn-text);
        font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
        -webkit-font-smoothing:antialiased;
        contain:layout style;
      }
      .dgn-v120.is-scrolled{
        background:rgba(5,7,10,.99);
      }
      .dgn-inner{
        width:100%;
        max-width:1500px;
        height:var(--dgn-h);
        margin:0 auto;
        padding:0 clamp(22px,3vw,44px);
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        align-items:center;
        gap:34px;
      }
      .dgn-brand{
        display:flex;align-items:center;justify-content:flex-start;
        color:#fff;text-decoration:none;
        width:32px;height:40px;
      }
      .dgn-brand img{
        display:block;width:30px;height:30px;object-fit:contain;border-radius:8px;
      }
      .dgn-links{
        display:flex;align-items:center;justify-content:center;gap:6px;
      }
      .dgn-link{
        height:30px;padding:0 13px;
        display:flex;align-items:center;justify-content:center;
        border:1px solid transparent;
        color:var(--dgn-muted);background:transparent;
        text-decoration:none;
        font-size:9px;font-weight:800;letter-spacing:.025em;
        transition:background .16s ease,color .16s ease,border-color .16s ease;
        white-space:nowrap;
      }
      .dgn-link:hover{color:#fff;background:rgba(255,255,255,.05)}
      .dgn-link.is-active{background:#fff;color:#080a0d;border-color:#fff}

      .dgn-actions{
        display:flex;align-items:center;justify-content:flex-end;gap:8px;position:relative;
      }
      .dgn-icon{
        position:relative;
        width:28px;height:32px;padding:0;border:0;border-radius:0;
        display:grid;place-items:center;
        color:#d9dde2;background:transparent;
        cursor:pointer;text-decoration:none;
        transition:color .15s ease,transform .15s ease;
      }
      .dgn-icon:hover,.dgn-icon:focus-visible{color:#fff;transform:translateY(-1px);outline:none}
      .dgn-icon svg{display:block;width:17px;height:17px;stroke:currentColor}
      .dgn-menu-btn svg{width:19px;height:19px}
      .dgn-admin-btn{width:auto;padding:0 7px;color:#ff9da5;gap:5px;display:flex}
      .dgn-admin-btn span{font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      .dgn-admin-btn[hidden]{display:none!important}

      .dgn-cart-count{
        position:absolute;right:-5px;top:0;
        min-width:15px;height:15px;padding:0 4px;
        display:grid;place-items:center;
        border-radius:999px;border:1px solid #080a0c;
        background:#fff;color:#080a0c;
        font-size:7px;font-weight:900;line-height:1;
      }
      .dgn-cart-count[hidden]{display:none!important}

      /* Search */
      .dgn-search-wrap{position:relative}
      .dgn-search-panel{
        position:absolute;right:34px;top:50%;
        width:0;opacity:0;visibility:hidden;pointer-events:none;
        transform:translateY(-50%) translateX(8px);
        transition:width .22s cubic-bezier(.2,.8,.2,1),opacity .16s ease,transform .22s ease;
        z-index:4;
      }
      .dgn-search-wrap.open .dgn-search-panel{
        width:280px;opacity:1;visibility:visible;pointer-events:auto;
        transform:translateY(-50%);
      }
      .dgn-search-box{
        height:36px;width:100%;
        border:1px solid rgba(255,255,255,.16);
        background:#0c1015;color:#fff;
        display:flex;align-items:center;gap:8px;padding:0 10px;
        box-shadow:0 14px 34px rgba(0,0,0,.24);
      }
      .dgn-search-box input{
        flex:1;min-width:0;border:0;outline:0;background:transparent;color:#fff;
        font:700 10px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .dgn-search-box input::placeholder{color:#747b84}
      .dgn-search-results{
        position:absolute;right:0;top:42px;width:360px;max-height:min(440px,70vh);
        overflow:auto;background:#0a0d11;border:1px solid rgba(255,255,255,.11);
        box-shadow:0 24px 65px rgba(0,0,0,.36);
        opacity:0;visibility:hidden;pointer-events:none;
      }
      .dgn-search-wrap.open.has-results .dgn-search-results{
        opacity:1;visibility:visible;pointer-events:auto;
      }
      .dgn-search-empty{padding:18px;color:#737b85;font-size:10px;line-height:1.5}
      .dgn-search-empty b{display:block;color:#dfe3e7;font-size:11px;margin-bottom:3px}
      .dgn-result{
        display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:10px;align-items:center;
        min-height:64px;padding:8px 10px;text-decoration:none;color:#d8dde1;
        border-bottom:1px solid rgba(255,255,255,.06);
      }
      .dgn-result:hover{background:#fff;color:#080a0d}
      .dgn-result-art{width:46px;height:46px;display:grid;place-items:center;background:#11161b;overflow:hidden}
      .dgn-result-art img{width:80%;height:80%;object-fit:contain}
      .dgn-result-art.cover img{width:100%;height:100%;object-fit:cover}
      .dgn-result-copy{min-width:0}
      .dgn-result-copy strong{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dgn-result-copy small{display:block;margin-top:4px;color:#7f8790;font-size:8px}
      .dgn-result:hover .dgn-result-copy small{color:#6c7178}
      .dgn-result-price{font-size:9px;font-weight:900}

      /* Hamburger */
      .dgn-menu-panel{
        position:absolute;right:0;top:44px;width:232px;padding:8px;
        background:#0a0d11;border:1px solid rgba(255,255,255,.11);
        box-shadow:0 24px 60px rgba(0,0,0,.34);
        opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-7px);
        transition:opacity .18s ease,transform .18s ease,visibility 0s linear .18s;
      }
      .dgn-menu-panel.open{
        opacity:1;visibility:visible;pointer-events:auto;transform:none;transition-delay:0s;
      }
      .dgn-menu-panel a{
        min-height:40px;padding:0 10px;
        display:grid;grid-template-columns:28px 1fr;align-items:center;gap:7px;
        color:#c7cbd0;text-decoration:none;
        border-bottom:1px solid rgba(255,255,255,.06);
        font-size:9px;font-weight:800;
      }
      .dgn-menu-panel a:last-child{border-bottom:0}
      .dgn-menu-panel a span{font-size:7px;color:#626a73;letter-spacing:.08em}
      .dgn-menu-panel a:hover{background:#fff;color:#080a0d}
      .dgn-menu-admin[hidden]{display:none!important}

      /* FAST cart: the ventas visual language, without expensive page-wide effects. */
      .dgn-cart-overlay{
        position:fixed;inset:0;z-index:2147483000;
        background:rgba(0,0,0,.55);
        opacity:0;visibility:hidden;pointer-events:none;
        transition:opacity .20s ease,visibility 0s linear .22s;
        contain:strict;
      }
      .dgn-cart-overlay.show{
        opacity:1;visibility:visible;pointer-events:auto;transition-delay:0s;
      }
      .dgn-cart-panel{
        position:fixed;z-index:2147483100;
        top:0;right:0;width:min(430px,92vw);height:100dvh;
        display:flex;flex-direction:column;
        background:#fff;color:#101827;
        border-left:1px solid #23272c;
        box-shadow:-28px 0 70px rgba(0,0,0,.28);
        transform:translate3d(102%,0,0);
        transition:transform .30s cubic-bezier(.2,.8,.2,1);
        will-change:transform;
        contain:layout paint style;
      }
      .dgn-cart-panel.show{transform:translate3d(0,0,0)}
      .dgn-cart-head{
        flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;
        padding:22px 22px 18px;background:#0a0c0f;color:#fff;border-bottom:1px solid #252a2f;
      }
      .dgn-cart-head h2{margin:0;font-size:20px;letter-spacing:-.04em;font-weight:800}
      .dgn-cart-head p{margin:4px 0 0;color:#7f8790;font-size:10px}
      .dgn-cart-close{
        width:38px;height:38px;border:1px solid #2b3036;background:#13171c;color:#fff;
        display:grid;place-items:center;cursor:pointer;
      }
      .dgn-cart-close:hover{background:#fff;color:#080a0c}
      .dgn-cart-items{
        flex:1;min-height:0;overflow:auto;padding:12px 16px 6px;background:#fff;
        -webkit-overflow-scrolling:touch;overscroll-behavior:contain;
      }
      .dgn-cart-empty{padding:58px 20px;text-align:center;color:#8994a2;font-size:11px;line-height:1.65}
      .dgn-cart-empty b{display:block;color:#1b2635;font-size:15px;margin-bottom:6px}
      .dgn-cart-line{
        display:grid;grid-template-columns:68px minmax(0,1fr) 36px;
        gap:12px;align-items:center;padding:12px 4px;border-bottom:1px solid #edf0f3;
      }
      .dgn-cart-art{width:68px;height:68px;display:grid;place-items:center;overflow:hidden;background:#f1f2f3}
      .dgn-cart-art img{width:82%;height:82%;object-fit:contain}
      .dgn-cart-art.cover img{width:100%;height:100%;object-fit:cover}
      .dgn-cart-copy{min-width:0}
      .dgn-cart-copy strong{display:block;font-size:12px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dgn-cart-copy span{display:block;margin-top:5px;color:#8b95a2;font-size:9px}
      .dgn-cart-copy b{display:block;margin-top:8px;font-size:13px;color:#0a0c0f}
      .dgn-cart-remove{
        width:34px;height:34px;border:0;background:transparent;color:#9aa3ae;
        cursor:pointer;display:grid;place-items:center;
      }
      .dgn-cart-remove:hover{background:#f3f4f5;color:#111318}
      .dgn-cart-foot{
        flex:0 0 auto;padding:16px 20px calc(20px + env(safe-area-inset-bottom,0px));
        border-top:1px solid #252a2f;background:#0a0c0f;color:#fff;
      }
      .dgn-cart-total{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}
      .dgn-cart-total span{font-size:11px;color:#7f8790}.dgn-cart-total strong{font-size:20px;letter-spacing:-.04em}
      .dgn-cart-actions{display:grid;grid-template-columns:1fr 1.2fr;gap:9px}
      .dgn-cart-actions button,.dgn-cart-actions a{
        height:44px;display:flex;align-items:center;justify-content:center;
        border:1px solid #333941;text-decoration:none;cursor:pointer;
        font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.035em;
      }
      .dgn-cart-continue{background:#15191e;color:#fff}
      .dgn-cart-continue:hover{background:#fff;color:#080a0c}
      .dgn-cart-checkout{background:var(--dgn-accent);color:#080a0c;border-color:var(--dgn-accent)!important}
      .dgn-cart-checkout.disabled{opacity:.42;pointer-events:none}
      .dgn-toast{
        position:fixed;left:50%;bottom:24px;z-index:2147483200;
        transform:translate(-50%,14px);opacity:0;pointer-events:none;
        background:#0a0c0e;color:#fff;padding:11px 15px;
        font-size:10px;font-weight:800;box-shadow:0 18px 45px rgba(0,0,0,.18);
        transition:opacity .18s ease,transform .18s ease;
      }
      .dgn-toast.show{opacity:1;transform:translate(-50%,0)}

      .dgn-fly{
        position:fixed;z-index:2147483250;width:64px;height:64px;display:grid;place-items:center;
        background:#fff;border:1px solid rgba(0,0,0,.08);box-shadow:0 15px 36px rgba(0,0,0,.22);
        pointer-events:none;will-change:transform,opacity;
      }
      .dgn-fly img{width:80%;height:80%;object-fit:contain}
      .dgn-cart-pop{animation:dgnCartPop .46s cubic-bezier(.16,1,.3,1)}
      @keyframes dgnCartPop{0%{transform:scale(1)}45%{transform:scale(1.23)}75%{transform:scale(.95)}100%{transform:scale(1)}}

      @media(max-width:900px){
        .dgn-inner{padding:0 28px;grid-template-columns:auto minmax(0,1fr) auto;gap:16px}
        .dgn-links{display:none}
        .dgn-brand img{width:31px;height:31px}
        .dgn-actions{gap:13px}
        .dgn-icon{width:28px;height:34px}
        .dgn-admin-btn{display:none!important}
        .dgn-search-panel{
          position:fixed;left:14px;right:14px;top:calc(var(--dgn-total-h) + 7px);
          transform:translateY(-6px);width:auto!important;
        }
        .dgn-search-wrap.open .dgn-search-panel{transform:none}
        .dgn-search-results{left:0;right:0;width:auto;top:42px;max-height:min(52vh,420px)}
        .dgn-menu-panel{
          position:fixed;top:calc(var(--dgn-total-h) + 2px);left:12px;right:12px;width:auto;
        }
      }
      @media(max-width:560px){
        :root{--dgn-h:64px}
        .dgn-inner{padding:0 28px;gap:12px}
        .dgn-actions{gap:12px}
        .dgn-cart-panel{
          top:auto;bottom:0;left:0;right:0;width:100%;height:min(82dvh,720px);
          border-left:0;border-top:1px solid #23272c;
          transform:translate3d(0,102%,0);
        }
        .dgn-cart-panel.show{transform:translate3d(0,0,0)}
        .dgn-cart-head{padding-top:18px}
        .dgn-cart-actions{grid-template-columns:1fr}
      }
      @media(prefers-reduced-motion:reduce){
        .dgn-cart-panel,.dgn-cart-overlay,.dgn-fly,.dgn-toast{transition:none!important;animation:none!important}
      }
    `;
    document.head.appendChild(style);

    const nav = document.createElement('header');
    nav.className = 'dgn-v120';
    nav.id = 'dingloftGlobalNavV120';
    nav.innerHTML = `
      <div class="dgn-inner">
        <a class="dgn-brand" href="ventas.html" data-dgn-nav="ventas.html" aria-label="Dingloft">
          <img src="/img/dingloft.png" alt="Dingloft">
        </a>

        <nav class="dgn-links" aria-label="Navegación principal">
          <a class="dgn-link" data-dgn-key="home" href="ventas.html">Home</a>
          <a class="dgn-link" data-dgn-key="software" href="ventas.html#programas">Software</a>
          <a class="dgn-link" data-dgn-key="multitracks" href="multitrack.html">Multitracks</a>
          <a class="dgn-link" data-dgn-key="account" href="account.html">Cuenta</a>
        </nav>

        <div class="dgn-actions">
          <div class="dgn-search-wrap" id="dgnSearchWrapV120">
            <button class="dgn-icon" id="dgnSearchBtnV120" type="button" aria-label="Buscar" aria-expanded="false">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8">
                <circle cx="10.8" cy="10.8" r="6.4"></circle><path d="M15.6 15.6 20 20" stroke-linecap="round"></path>
              </svg>
            </button>
            <div class="dgn-search-panel">
              <label class="dgn-search-box">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.8" cy="10.8" r="6.4"></circle><path d="M15.6 15.6 20 20"></path></svg>
                <input id="dgnSearchInputV120" type="search" autocomplete="off" placeholder="Buscar productos...">
              </label>
              <div class="dgn-search-results" id="dgnSearchResultsV120"></div>
            </div>
          </div>

          <button class="dgn-icon" id="dgnHeartV120" type="button" aria-label="Favoritos">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M20.8 4.9a5.2 5.2 0 0 0-7.4 0L12 6.3l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-8.7a5.2 5.2 0 0 0 0-7.4Z" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </button>

          <button class="dgn-icon" id="dgnCartBtnV120" type="button" aria-label="Abrir carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3.5 5h2.2l1.9 9.1h9.8l2-6.3H7" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="9.2" cy="18.4" r="1.1" fill="currentColor" stroke="none"></circle><circle cx="17.1" cy="18.4" r="1.1" fill="currentColor" stroke="none"></circle></svg>
            <span class="dgn-cart-count" id="dgnCartCountV120" hidden>0</span>
          </button>

          <a class="dgn-icon dgn-admin-btn" id="dgnAdminBtnV120" href="admin.html" hidden aria-label="Administración">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 3.5 19 6v5.2c0 4.4-2.7 7.7-7 9.3-4.3-1.6-7-4.9-7-9.3V6l7-2.5Z"></path><path d="m9.4 12 1.7 1.7 3.7-4"></path></svg>
            <span>Admin</span>
          </a>

          <button class="dgn-icon dgn-menu-btn" id="dgnMenuBtnV120" type="button" aria-label="Abrir menú" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" stroke-linecap="round"></path></svg>
          </button>

          <div class="dgn-menu-panel" id="dgnMenuV120" aria-hidden="true">
            <a href="ventas.html#programas" data-dgn-nav="ventas.html#programas"><span>01</span>Programas</a>
            <a href="ventas.html#samples" data-dgn-nav="ventas.html#samples"><span>02</span>Samples &amp; VSTs</a>
            <a href="multitrack.html" data-dgn-nav="multitrack.html"><span>03</span>Multitracks</a>
            <a href="account.html" data-dgn-nav="account.html"><span>04</span>Mi cuenta</a>
            <a class="dgn-menu-admin" id="dgnMenuAdminV120" href="admin.html" data-dgn-nav="admin.html" hidden><span>05</span>Admin</a>
          </div>
        </div>
      </div>
    `;
    document.body.prepend(nav);

    const overlay = document.createElement('div');
    overlay.className = 'dgn-cart-overlay';
    overlay.id = 'dgnCartOverlayV120';

    const cart = document.createElement('aside');
    cart.className = 'dgn-cart-panel';
    cart.id = 'dgnCartPanelV120';
    cart.setAttribute('aria-hidden','true');
    cart.setAttribute('aria-label','Tu carrito');
    cart.innerHTML = `
      <div class="dgn-cart-head">
        <div><h2>Tu carrito</h2><p id="dgnCartMetaV120">0 productos</p></div>
        <button class="dgn-cart-close" id="dgnCartCloseV120" type="button" aria-label="Cerrar carrito">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"></path></svg>
        </button>
      </div>
      <div class="dgn-cart-items" id="dgnCartItemsV120"></div>
      <div class="dgn-cart-foot">
        <div class="dgn-cart-total"><span>Subtotal</span><strong id="dgnCartTotalV120">$0.00</strong></div>
        <div class="dgn-cart-actions">
          <button class="dgn-cart-continue" id="dgnCartContinueV120" type="button">Seguir comprando</button>
          <a class="dgn-cart-checkout" id="dgnCartCheckoutV120" href="checkout.html">Ir al checkout</a>
        </div>
      </div>
    `;
    const toast = document.createElement('div');
    toast.className = 'dgn-toast';
    toast.id = 'dgnToastV120';
    toast.setAttribute('aria-live','polite');

    document.body.append(overlay, cart, toast);

    // A direct page gets one offset; shell documents already offset their iframe stage.
    if (!document.getElementById('stage')) document.body.classList.add('dgn-global-direct');

    const searchWrap = document.getElementById('dgnSearchWrapV120');
    const searchBtn = document.getElementById('dgnSearchBtnV120');
    const searchInput = document.getElementById('dgnSearchInputV120');
    const searchResults = document.getElementById('dgnSearchResultsV120');
    const menuBtn = document.getElementById('dgnMenuBtnV120');
    const menu = document.getElementById('dgnMenuV120');
    const cartBtn = document.getElementById('dgnCartBtnV120');
    const cartCount = document.getElementById('dgnCartCountV120');
    const cartMeta = document.getElementById('dgnCartMetaV120');
    const cartItems = document.getElementById('dgnCartItemsV120');
    const cartTotal = document.getElementById('dgnCartTotalV120');
    const cartClose = document.getElementById('dgnCartCloseV120');
    const cartContinue = document.getElementById('dgnCartContinueV120');
    const checkout = document.getElementById('dgnCartCheckoutV120');
    const adminBtn = document.getElementById('dgnAdminBtnV120');
    const menuAdmin = document.getElementById('dgnMenuAdminV120');

    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
    const money = n => `$${Number(n || 0).toFixed(2)}`;
    const qtyOf = item => Math.max(1, Number(item?.qty ?? item?.quantity ?? 1) || 1);
    const priceOf = item => Number(item?.priceUsd ?? item?.price ?? 0) || 0;
    const cartApi = () => window.DingloftCartSync;
    const readCart = () => {
      try {
        if (cartApi()?.read) {
          const value = cartApi().read();
          return Array.isArray(value) ? value : [];
        }
      } catch (_) {}
      try {
        const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(value) ? value : [];
      } catch (_) {
        return [];
      }
    };
    const imageOf = item => {
      if (cartApi()?.imageOf) return cartApi().imageOf(item);
      const raw = String(item?.cover || item?.imageUrl || item?.imagePath || item?.img || 'dingloft').trim();
      if (/^(?:https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
      if (raw.startsWith('/')) return raw;
      if (raw.startsWith('img/')) return `/${raw}`;
      return `/img/${raw || 'dingloft'}.png`;
    };
    const writeCart = items => {
      if (cartApi()?.write) return cartApi().write(items, true);
      try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (_) {}
      window.dispatchEvent(new CustomEvent('dingloft:cart-change',{detail:{items}}));
      return items;
    };

    let cartDirty = true;
    let cartOpen = false;
    const syncBadge = () => {
      const items = readCart();
      const n = items.reduce((sum,item)=>sum + qtyOf(item),0);
      cartCount.textContent = String(n);
      cartCount.hidden = n < 1;
      cartDirty = true;
      return items;
    };

    const renderCart = () => {
      const items = readCart();
      const n = items.reduce((sum,item)=>sum + qtyOf(item),0);
      const total = items.reduce((sum,item)=>sum + priceOf(item) * qtyOf(item),0);
      cartMeta.textContent = `${n} producto${n === 1 ? '' : 's'}`;
      cartTotal.textContent = money(total);
      checkout.classList.toggle('disabled', !items.length);
      if (!items.length) {
        cartItems.innerHTML = '<div class="dgn-cart-empty"><b>Tu carrito está vacío</b>Agrega productos y aparecerán aquí.</div>';
      } else {
        cartItems.innerHTML = items.map((item,index) => {
          const cover = Boolean(item.cover) || /multitrack/i.test(String(item.type || ''));
          const name = item.name || item.title || 'Producto Dingloft';
          return `<article class="dgn-cart-line">
            <div class="dgn-cart-art ${cover ? 'cover' : ''}">
              <img src="${esc(imageOf(item))}" alt="${esc(name)}" loading="lazy" onerror="this.onerror=null;this.src='/img/dingloft.png'">
            </div>
            <div class="dgn-cart-copy">
              <strong>${esc(name)}</strong>
              <span>${esc(item.type || 'Producto digital')}</span>
              <b>${money(priceOf(item) * qtyOf(item))}</b>
            </div>
            <button class="dgn-cart-remove" type="button" data-dgn-remove="${index}" aria-label="Eliminar">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"></path>
              </svg>
            </button>
          </article>`;
        }).join('');
      }
      cartDirty = false;
    };

    const showToast = text => {
      toast.textContent = text || 'Agregado al carrito';
      toast.classList.add('show');
      clearTimeout(showToast.t);
      showToast.t = setTimeout(()=>toast.classList.remove('show'),1350);
    };

    const openCart = () => {
      /* v121: never depend on route detection to open.
         Checkout already hides the button through paintRoute(). */
      cartOpen = true;
      document.documentElement.classList.add('dgn-cart-open');

      /* Open synchronously so no old shell listener / busy frame can swallow the action. */
      overlay.classList.add('show');
      cart.classList.add('show');
      cart.setAttribute('aria-hidden','false');

      /* Rendering can never block the visual opening of the drawer. */
      if (cartDirty) {
        queueMicrotask(() => {
          try {
            renderCart();
          } catch (err) {
            console.warn('[Dingloft cart] render fallback', err);
            try {
              cartMeta.textContent = 'Carrito';
              cartTotal.textContent = '$0.00';
              cartItems.innerHTML = '<div class="dgn-cart-empty"><b>Tu carrito</b>Actualizando productos…</div>';
            } catch (_) {}
          }
        });
      }
    };
    const closeCart = () => {
      cartOpen = false;
      overlay.classList.remove('show');
      cart.classList.remove('show');
      cart.setAttribute('aria-hidden','true');
      document.documentElement.classList.remove('dgn-cart-open');
    };

    const navigate = href => {
      closeSearch();
      closeMenu();
      closeCart();

      if (!href) return false;
      try {
        if (window.DingloftDesktopShell?.navigate) {
          window.DingloftDesktopShell.navigate(href);
          return true;
        }
        if (window.DingloftPersistentShellV93?.navigateHref) {
          window.DingloftPersistentShellV93.navigateHref(href);
          return true;
        }
        if (window.DingloftApp?.navigateHref) {
          window.DingloftApp.navigateHref(href);
          return true;
        }
      } catch (_) {}

      const ev = new CustomEvent('dingloft:global-navigate',{detail:{href},cancelable:true});
      window.dispatchEvent(ev);
      if (ev.defaultPrevented) return true;
      location.href = href;
      return true;
    };

    const routeInfo = (raw = '') => {
      let path = raw;
      if (!path) {
        if (window.DingloftDesktopShell?.current) path = window.DingloftDesktopShell.current();
        else if (window.DingloftPersistentShellV93?.activeKey) {
          const key = window.DingloftPersistentShellV93.activeKey;
          path = key === 'home' ? 'ventas.html' : key === 'catalog' ? 'ventas.html#programas' :
            key === 'multitrack' ? 'multitrack.html' : key === 'account' ? 'account.html' :
            new URLSearchParams(location.search).get('src') || '';
        } else path = `${location.pathname}${location.search}${location.hash}`;
      }
      const s = String(path).toLowerCase();
      const filename = (s.split('?')[0].split('#')[0].split('/').pop() || 'ventas.html').replace(/\.html$/,'');
      const isHome = filename === 'ventas' || filename === 'index' || filename === 'tienda' || filename === '';
      const isProduct = ['sketchup','autocad','office','logic','cinema4d','dual','esword','mainstage','nord','rhodes','yamahakeys','producto','motion-x'].includes(filename);
      return {
        home:isHome && !s.includes('#programas') && !s.includes('#catalogo') && !s.includes('#samples'),
        software:isProduct || (isHome && (s.includes('#programas') || s.includes('#catalogo') || s.includes('#samples'))),
        multitracks:filename === 'multitrack' || filename === 'multitracks',
        account:filename === 'account' || filename === 'cuenta',
        checkout:filename === 'checkout'
      };
    };

    const paintRoute = raw => {
      const info = routeInfo(raw);
      nav.querySelector('[data-dgn-key="home"]')?.classList.toggle('is-active',info.home);
      nav.querySelector('[data-dgn-key="software"]')?.classList.toggle('is-active',info.software);
      nav.querySelector('[data-dgn-key="multitracks"]')?.classList.toggle('is-active',info.multitracks);
      nav.querySelector('[data-dgn-key="account"]')?.classList.toggle('is-active',info.account);
      cartBtn.hidden = info.checkout;
      if (info.checkout && cartOpen) closeCart();
    };

    // navigation
    nav.addEventListener('click', event => {
      const a = event.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || a.target === '_blank') return;
      if (/^(?:https?:)?\/\//i.test(href)) {
        try { if (new URL(href,location.href).origin !== location.origin) return; } catch (_) { return; }
      }
      event.preventDefault();
      navigate(href);
    });
    document.querySelectorAll('[data-dgn-nav]').forEach(a => a.addEventListener('click', e => {
      if (a.closest('#dingloftGlobalNavV120')) return;
      e.preventDefault(); navigate(a.getAttribute('data-dgn-nav'));
    }));

    // search
    let catalog = null;
    let loadCatalogPromise = null;
    const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const slug = v => norm(v).replace(/\s+/g,'-');
    const knownPage = sku => ({
      'sketchup-pro-2026':'sketchup.html',
      'sketchup-2026-autocad-2026':'sketchup.html',
      'autocad-2026':'autocad.html',
      'office-home-business':'office.html',
      'logic-pro':'logic.html',
      'cinema-4d':'cinema4d.html',
      'biblias-e-sword':'esword.html',
      'rhodes-affair-2':'rhodes.html',
      'yamaha-premium-keys':'yamahakeys.html',
      'motion-x-access':'motion-x.html'
    }[slug(sku)] || `producto.html?slug=${encodeURIComponent(sku)}`);

    const ensureCatalog = async () => {
      if (catalog) return catalog;
      if (loadCatalogPromise) return loadCatalogPromise;
      loadCatalogPromise = (async () => {
        const [pr,mr] = await Promise.allSettled([
          fetch(`${WORKER}/products/public`,{cache:'no-store',headers:{Accept:'application/json'}}),
          fetch(`${WORKER}/multitracks/catalog`,{cache:'no-store',headers:{Accept:'application/json'}})
        ]);
        const productsData = pr.status === 'fulfilled' && pr.value.ok ? await pr.value.json().catch(()=>({})) : {};
        const mtData = mr.status === 'fulfilled' && mr.value.ok ? await mr.value.json().catch(()=>({})) : {};
        const products = Array.isArray(productsData) ? productsData :
          Array.isArray(productsData.products) ? productsData.products :
          Array.isArray(productsData.catalog) ? productsData.catalog : [];
        const mts = Array.isArray(mtData.multitracks) ? mtData.multitracks : [];
        const rows = [];
        for (const p of products) {
          if (!p || p.active === false || String(p.type || '').toLowerCase().includes('multitrack')) continue;
          const sku = String(p.sku || p.slug || slug(p.name)).trim();
          rows.push({
            kind:'product', key:sku, name:String(p.name || sku),
            meta:String(p.category || p.type || 'Producto digital'),
            price:Number(p.priceUsd ?? p.price),
            img:imageOf(p),
            href:knownPage(sku),
            search:norm([p.name,p.sku,p.category,p.type,...(Array.isArray(p.aliases)?p.aliases:[])].join(' '))
          });
        }
        for (const mt of mts) {
          if (!mt || mt.active === false) continue;
          const id = String(mt.id || '').trim();
          const name = String(mt.title || mt.name || id).trim();
          if (!id || !name) continue;
          rows.push({
            kind:'multitrack',key:id,name,
            meta:`${mt.artist || 'Dingloft'} · Multitrack`,
            price:Number(mt.price ?? mt.priceUsd),
            img:imageOf({...mt,cover:mt.cover || ''}),
            cover:Boolean(mt.cover),
            href:`multitrack.html#mt-${encodeURIComponent(id)}`,
            search:norm([name,mt.artist,id,mt.commerceSku,mt.sku].join(' '))
          });
        }
        catalog = rows;
        return rows;
      })().finally(()=>{loadCatalogPromise=null});
      return loadCatalogPromise;
    };

    const renderSearch = q => {
      const term = norm(q);
      if (!catalog) {
        searchResults.innerHTML = '<div class="dgn-search-empty"><b>Buscando catálogo…</b>Un momento.</div>';
        searchWrap.classList.add('has-results');
        return;
      }
      const rows = (term ? catalog.filter(x=>x.search.includes(term)) : catalog).slice(0,8);
      searchWrap.classList.add('has-results');
      if (!rows.length) {
        searchResults.innerHTML = '<div class="dgn-search-empty"><b>Sin resultados</b>Prueba con otro nombre.</div>';
        return;
      }
      searchResults.innerHTML = rows.map((item,index) => {
        const price = Number.isFinite(item.price) ? (item.price === 0 ? 'Gratis' : money(item.price)) : '';
        return `<a class="dgn-result" href="${esc(item.href)}" data-dgn-search-index="${index}">
          <span class="dgn-result-art ${item.cover ? 'cover' : ''}"><img src="${esc(item.img)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/img/dingloft.png'"></span>
          <span class="dgn-result-copy"><strong>${esc(item.name)}</strong><small>${esc(item.meta)}</small></span>
          <span class="dgn-result-price">${esc(price)}</span>
        </a>`;
      }).join('');
      searchResults.__rows = rows;
    };

    const openSearch = async () => {
      closeMenu();
      const open = !searchWrap.classList.contains('open');
      searchWrap.classList.toggle('open',open);
      searchBtn.setAttribute('aria-expanded',String(open));
      if (!open) return;
      searchResults.innerHTML = '<div class="dgn-search-empty"><b>Actualizando catálogo…</b>Buscando productos disponibles.</div>';
      searchWrap.classList.add('has-results');
      setTimeout(()=>searchInput.focus(),40);
      try { await ensureCatalog(); renderSearch(searchInput.value); }
      catch (_) { searchResults.innerHTML = '<div class="dgn-search-empty"><b>No pudimos cargar el catálogo</b>Revisa tu conexión.</div>'; }
    };
    function closeSearch(){
      searchWrap.classList.remove('open','has-results');
      searchBtn.setAttribute('aria-expanded','false');
    }
    function closeMenu(){
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden','true');
      menuBtn.setAttribute('aria-expanded','false');
    }

    searchBtn.addEventListener('click', e => {e.stopPropagation();openSearch()});
    searchInput.addEventListener('input',()=>renderSearch(searchInput.value));
    searchInput.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        const first=searchResults.__rows?.[0];
        if(first) navigate(first.href);
        else navigate(`ventas.html?search=${encodeURIComponent(searchInput.value)}#programas`);
      }
    });
    searchResults.addEventListener('click',e=>{
      const a=e.target.closest('a[href]');
      if(!a)return;
      e.preventDefault();navigate(a.getAttribute('href'));
    });

    menuBtn.addEventListener('click', e => {
      e.stopPropagation();closeSearch();
      const open=!menu.classList.contains('open');
      menu.classList.toggle('open',open);
      menu.setAttribute('aria-hidden',String(!open));
      menuBtn.setAttribute('aria-expanded',String(open));
    });
    document.addEventListener('pointerdown',e=>{
      if(!nav.contains(e.target)){closeSearch();closeMenu()}
    },{passive:true});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){closeSearch();closeMenu();if(cartOpen)closeCart()}
    });

    document.getElementById('dgnHeartV120').addEventListener('click',()=>navigate('account.html#favoritos'));
    document.addEventListener('click', event => {
      const hit = event.target?.closest?.('#dgnCartBtnV120');
      if (!hit) return;
      event.preventDefault();
      openCart();
    }, true);
    cartBtn.addEventListener('click', event => {
      event.preventDefault();
      openCart();
    });
    cartClose.addEventListener('click',closeCart);
    cartContinue.addEventListener('click',closeCart);
    overlay.addEventListener('click',closeCart);
    cartItems.addEventListener('click',e=>{
      const btn=e.target.closest('[data-dgn-remove]');
      if(!btn)return;
      const items=readCart();
      const index=Number(btn.dataset.dgnRemove);
      if(Number.isInteger(index)&&index>=0&&index<items.length){
        items.splice(index,1);writeCart(items);syncBadge();renderCart();
      }
    });
    checkout.addEventListener('click',e=>{
      e.preventDefault();
      if(checkout.classList.contains('disabled'))return;
      navigate('checkout.html');
    });

    const animateToCart = (startRect,item) => {
      if(!startRect || matchMedia('(prefers-reduced-motion:reduce)').matches)return;
      const end=cartBtn.getBoundingClientRect();
      const flyer=document.createElement('div');
      flyer.className='dgn-fly';
      flyer.style.left=`${startRect.left + startRect.width/2 - 32}px`;
      flyer.style.top=`${startRect.top + startRect.height/2 - 32}px`;
      flyer.innerHTML=`<img src="${esc(imageOf(item||{}))}" alt="">`;
      document.body.appendChild(flyer);
      const dx=(end.left+end.width/2)-(startRect.left+startRect.width/2);
      const dy=(end.top+end.height/2)-(startRect.top+startRect.height/2);
      requestAnimationFrame(()=>{
        flyer.style.transition='transform .58s cubic-bezier(.2,.8,.2,1),opacity .14s ease .44s';
        flyer.style.transform=`translate3d(${dx}px,${dy}px,0) scale(.16)`;
        flyer.style.opacity='.12';
      });
      setTimeout(()=>{
        flyer.remove();
        cartBtn.classList.remove('dgn-cart-pop');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('dgn-cart-pop');
        setTimeout(()=>cartBtn.classList.remove('dgn-cart-pop'),480);
      },600);
    };

    // Admin state comes from the existing Firebase /admin/session module in both shells.
    const setAdmin = isAdmin => {
      const yes=isAdmin===true;
      adminBtn.hidden=!yes;
      menuAdmin.hidden=!yes;
      try{sessionStorage.setItem('dingloft_admin_nav',yes?'1':'0')}catch(_){}
    };
    try{setAdmin(sessionStorage.getItem('dingloft_admin_nav')==='1')}catch(_){setAdmin(false)}
    addEventListener('dingloft:admin-state-local',e=>setAdmin(e.detail?.isAdmin===true));
    addEventListener('dingloft:admin-state',e=>setAdmin(e.detail?.isAdmin===true));

    // Cart changes from direct pages and same top document.
    const cartChanged = () => {
      syncBadge();
      if(cartOpen)renderCart();
    };
    addEventListener('storage',e=>{if(e.key===CART_KEY)cartChanged()});
    addEventListener('dingloft:cart-change',cartChanged);
    addEventListener('dingloft:cart-sync',cartChanged);
    document.addEventListener('dingloft:cart-change',cartChanged);
    document.addEventListener('dingloft:cart-sync',cartChanged);

    // Embedded product -> top shell messages.
    addEventListener('message',e=>{
      if(e.origin!==location.origin || !e.data)return;
      if(e.data.type==='dingloft:cart-added'){
        cartChanged();
        let r=e.data.sourceRect||null;
        if(r){
          try{
            const frame=[...document.querySelectorAll('iframe')].find(f=>f.contentWindow===e.source);
            if(frame){
              const fr=frame.getBoundingClientRect();
              r={left:fr.left+r.left,top:fr.top+r.top,width:r.width,height:r.height};
            }
          }catch(_){}
        }
        animateToCart(r,e.data.item||{});
        showToast(`${e.data.item?.name || 'Producto'} agregado`);
        return;
      }
      if(e.data.type==='dingloft:cart-change'||e.data.type==='dingloft:cart-sync'){
        cartChanged();return;
      }
      if(e.data.type==='dingloft:open-global-cart'||e.data.type==='dingloft:open-cart'){
        openCart();return;
      }
      if(e.data.type==='dingloft:global-navigate'&&e.data.href){
        navigate(e.data.href);return;
      }
      if(e.data.type==='dingloft:route-change'){
        paintRoute(e.data.src||e.data.href||'');return;
      }
    });

    addEventListener('dingloft:route-change',e=>paintRoute(e.detail?.src||e.detail?.href||''));
    addEventListener('popstate',()=>setTimeout(()=>paintRoute(),0),{passive:true});
    addEventListener('scroll',()=>nav.classList.toggle('is-scrolled',scrollY>18),{passive:true});

    syncBadge();
    paintRoute();

    window.DingloftGlobalNav = {
      version: VERSION,
      openCart,
      closeCart,
      syncCart: cartChanged,
      navigate,
      notifyCart(item,sourceRect){cartChanged();animateToCart(sourceRect,item);showToast(`${item?.name||'Producto'} agregado`)},
      pulseCart(){cartBtn.classList.add('dgn-cart-pop');setTimeout(()=>cartBtn.classList.remove('dgn-cart-pop'),480)}
    };
  });
})();
