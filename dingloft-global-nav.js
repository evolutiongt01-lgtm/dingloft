(() => {
  const path = (location.pathname || "").toLowerCase();
  const file = path.split("/").pop();

  // Never render on any Admin page.
  if (/(^|[-_.])admin([-.]|$)/i.test(file) || file.includes("admin")) return;

  if (document.getElementById("dingloftGlobalNav")) return;

  const css = `
  :root{
    --dgn-ink:#0d1014;
    --dgn-muted:#70767f;
    --dgn-line:rgba(20,26,34,.10);
    --dgn-panel:rgba(255,255,255,.93);
    --dgn-shadow:0 16px 48px rgba(20,28,38,.08);
  }

  .dingloft-global-nav{
    display:none;
  }

  @media (min-width:768px){

    /*
      IMPORTANT:
      This navbar REPLACES the old desktop/tablet navbar.
      Phone/mobile dock is preserved.
    */
    body > header:not(.mobile-header):not(.phone-header),
    body > nav:not(#dingloftGlobalNav):not(.mobile-app-dock),
    .site-header,
    .main-navbar,
    .desktop-navbar,
    .navbar:not(.mobile-app-dock),
    .top-nav,
    .global-header,
    .app-header:not(.mobile-header){
      display:none !important;
    }

    /* Preserve mobile-only navigation structures if they happen to exist */
    .mobile-app-dock,
    .mobile-nav,
    .mobile-bottom-nav{
      display:none !important;
    }

    .dingloft-global-nav{
      position:fixed;
      z-index:99990;
      top:18px;
      left:0;
      right:0;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:20px;
      width:calc(100% - 56px);
      max-width:1500px;
      margin:0 auto;
      pointer-events:none;
      font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }

    .dgn-left,
    .dgn-actions{
      pointer-events:auto;
    }

    .dgn-left{
      display:flex;
      align-items:center;
      gap:3px;
      min-height:48px;
      padding:4px;
      border:1px solid var(--dgn-line);
      border-radius:999px;
      background:var(--dgn-panel);
      box-shadow:var(--dgn-shadow);
      -webkit-backdrop-filter:blur(16px) saturate(145%);
      backdrop-filter:blur(16px) saturate(145%);
    }

    .dgn-link{
      position:relative;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:40px;
      padding:0 18px;
      border-radius:999px;
      color:#333941;
      text-decoration:none;
      font-size:13px;
      line-height:1;
      font-weight:650;
      letter-spacing:-.015em;
      transition:
        background .2s ease,
        color .2s ease,
        transform .2s ease;
      white-space:nowrap;
    }

    .dgn-link:hover{
      background:rgba(15,18,22,.055);
      color:#090b0e;
      transform:translateY(-1px);
    }

    .dgn-link.is-active{
      background:#090b0e;
      color:#fff;
      box-shadow:0 7px 18px rgba(10,13,17,.16);
    }

    .dgn-actions{
      display:flex;
      align-items:center;
      gap:9px;
    }

    .dgn-icon{
      position:relative;
      display:grid;
      place-items:center;
      width:48px;
      height:48px;
      padding:0;
      border:1px solid var(--dgn-line);
      border-radius:50%;
      background:var(--dgn-panel);
      color:#171b20;
      box-shadow:var(--dgn-shadow);
      -webkit-backdrop-filter:blur(16px) saturate(145%);
      backdrop-filter:blur(16px) saturate(145%);
      text-decoration:none;
      cursor:pointer;
      transition:transform .2s ease,background .2s ease,box-shadow .2s ease;
    }

    .dgn-icon:hover{
      transform:translateY(-2px);
      background:#fff;
      box-shadow:0 18px 42px rgba(20,28,38,.12);
    }

    .dgn-icon svg{
      width:19px;
      height:19px;
      stroke:currentColor;
    }

    .dgn-profile{
      background:#090b0e;
      color:#fff;
      border-color:#090b0e;
    }

    .dgn-dot{
      position:absolute;
      top:7px;
      right:7px;
      width:7px;
      height:7px;
      border:2px solid #fff;
      border-radius:50%;
      background:#64bfe7;
    }

    .dgn-search-panel{
      position:absolute;
      top:61px;
      right:112px;
      width:min(360px,calc(100vw - 80px));
      padding:10px;
      border:1px solid var(--dgn-line);
      border-radius:18px;
      background:rgba(255,255,255,.97);
      box-shadow:0 24px 70px rgba(15,22,32,.14);
      opacity:0;
      visibility:hidden;
      transform:translateY(-7px) scale(.985);
      transform-origin:top right;
      transition:opacity .18s ease,transform .18s ease,visibility .18s;
      pointer-events:none;
    }

    .dgn-search-panel.is-open{
      opacity:1;
      visibility:visible;
      transform:none;
      pointer-events:auto;
    }

    .dgn-search-wrap{
      display:flex;
      align-items:center;
      gap:9px;
      min-height:46px;
      padding:0 12px;
      border:1px solid rgba(20,26,34,.10);
      border-radius:13px;
      background:#f6f8f9;
    }

    .dgn-search-wrap svg{
      width:17px;
      height:17px;
      stroke:#7e858e;
      flex:0 0 auto;
    }

    .dgn-search-input{
      width:100%;
      border:0;
      outline:0;
      background:transparent;
      color:#111419;
      font:600 13px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }

    .dgn-search-input::placeholder{color:#9aa0a8}

    .dgn-search-hint{
      padding:8px 4px 2px;
      color:#969ca4;
      font-size:11px;
    }
  }

  @media (min-width:768px) and (max-width:1024px){
    .dingloft-global-nav{
      top:14px;
      width:calc(100% - 30px);
    }
    .dgn-left{min-height:46px}
    .dgn-link{
      min-height:38px;
      padding:0 15px;
      font-size:12px;
    }
    .dgn-icon{
      width:46px;
      height:46px;
    }
  }

  @media (max-width:767px){
    .dingloft-global-nav{
      display:none !important;
    }
  }
  `;

  const style = document.createElement("style");
  style.id = "dingloftGlobalNavStyles";
  style.textContent = css;
  document.head.appendChild(style);

  const nav = document.createElement("nav");
  nav.id = "dingloftGlobalNav";
  nav.className = "dingloft-global-nav";
  nav.setAttribute("aria-label","Navegación principal Dingloft");

  nav.innerHTML = `
    <div class="dgn-left">
      <a class="dgn-link" data-dgn="home" href="index.html">Home</a>
      <a class="dgn-link" data-dgn="software" href="index.html#catalogo">Software</a>
      <a class="dgn-link" data-dgn="multitracks" href="multitrack.html">Multitracks</a>
    </div>

    <div class="dgn-actions">
      <button class="dgn-icon" id="dgnSearchButton" type="button" aria-label="Buscar" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8">
          <circle cx="11" cy="11" r="6.5"></circle>
          <path d="m16 16 4 4"></path>
        </svg>
      </button>

      <a class="dgn-icon" href="account.html#notificaciones" aria-label="Notificaciones">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
          <path d="M10 21h4"></path>
        </svg>
        <span class="dgn-dot" aria-hidden="true"></span>
      </a>

      <a class="dgn-icon dgn-profile" href="account.html" aria-label="Mi cuenta">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8">
          <circle cx="12" cy="8" r="3.5"></circle>
          <path d="M5.5 20c.8-3.3 3-5 6.5-5s5.7 1.7 6.5 5"></path>
        </svg>
      </a>
    </div>

    <div class="dgn-search-panel" id="dgnSearchPanel">
      <form class="dgn-search-wrap" id="dgnSearchForm">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8">
          <circle cx="11" cy="11" r="6.5"></circle>
          <path d="m16 16 4 4"></path>
        </svg>
        <input class="dgn-search-input" id="dgnSearchInput" autocomplete="off" placeholder="Buscar software o productos…">
      </form>
      <div class="dgn-search-hint">Enter para buscar en el catálogo de Dingloft.</div>
    </div>
  `;

  document.body.prepend(nav);

  // Remove/hide legacy desktop/tablet navigation so both systems never stack.
  const legacySelectors = [
    "body > header:not(.mobile-header):not(.phone-header)",
    "body > nav:not(#dingloftGlobalNav):not(.mobile-app-dock)",
    ".site-header",
    ".main-navbar",
    ".desktop-navbar",
    ".navbar:not(.mobile-app-dock)",
    ".top-nav",
    ".global-header",
    ".app-header:not(.mobile-header)"
  ];

  if (window.matchMedia("(min-width:768px)").matches) {
    legacySelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el.id === "dingloftGlobalNav") return;
        if (el.closest("#dingloftGlobalNav")) return;
        el.dataset.dingloftLegacyNavHidden = "true";
        el.style.setProperty("display", "none", "important");
      });
    });
  }

  const current = file || "index.html";
  const hash = location.hash.toLowerCase();
  let active = "home";

  if (current.includes("multitrack")) active = "multitracks";
  else if (hash.includes("catalogo") || current.includes("software") || current.includes("product")) active = "software";
  else if (!current.includes("index") && current !== "") active = "";

  if (active) nav.querySelector(`[data-dgn="${active}"]`)?.classList.add("is-active");

  const searchBtn = nav.querySelector("#dgnSearchButton");
  const searchPanel = nav.querySelector("#dgnSearchPanel");
  const searchInput = nav.querySelector("#dgnSearchInput");
  const searchForm = nav.querySelector("#dgnSearchForm");

  const closeSearch = () => {
    searchPanel.classList.remove("is-open");
    searchBtn.setAttribute("aria-expanded","false");
  };

  searchBtn.addEventListener("click", () => {
    const open = !searchPanel.classList.contains("is-open");
    searchPanel.classList.toggle("is-open", open);
    searchBtn.setAttribute("aria-expanded", String(open));
    if (open) setTimeout(() => searchInput.focus(), 50);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!nav.contains(event.target)) closeSearch();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSearch();
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;

    const knownSearch =
      document.querySelector("#searchInput, #productSearch, input[type='search'], [data-search-input]");

    if (knownSearch) {
      knownSearch.value = q;
      knownSearch.dispatchEvent(new Event("input",{bubbles:true}));
      knownSearch.dispatchEvent(new Event("change",{bubbles:true}));
      knownSearch.scrollIntoView({behavior:"smooth",block:"center"});
      closeSearch();
      return;
    }

    location.href = `index.html?search=${encodeURIComponent(q)}#catalogo`;
  });
})();