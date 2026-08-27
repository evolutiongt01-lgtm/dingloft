/* Dingloft Theme System v1 · synchronized light/dark appearance */
(() => {
  'use strict';
  if (window.__DINGLOFT_THEME_V2__) return;
  window.__DINGLOFT_THEME_V2__ = true;

  const KEY = 'dingloft_theme';
  const LIGHT = 'light';
  const DARK = 'dark';
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: light)');
  const svg = `<svg class="dl-theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.6"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.55 1.55M17.15 17.15l1.55 1.55M18.7 5.3l-1.55 1.55M6.85 17.15 5.3 18.7"/></svg><svg class="dl-theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.3 8.3 0 0 1 8.8 4a8.4 8.4 0 1 0 11.2 11.2Z"/></svg>`;

  function stored(){ try { const v=localStorage.getItem(KEY); return v===LIGHT||v===DARK?v:null; } catch (_) { return null; } }
  function resolved(value=stored()){ return value || (media.matches ? LIGHT : DARK); }
  function ensureCss(doc=document){
    if(doc.getElementById('dingloft-theme-css')) return;
    const link=doc.createElement('link'); link.id='dingloft-theme-css'; link.rel='stylesheet'; link.href='/dingloft-theme.css?v=2';
    (doc.head||doc.documentElement).appendChild(link);
  }
  function updateMeta(theme,doc=document){
    let metas=[...doc.querySelectorAll('meta[name="theme-color"]')];
    if(!metas.length){const meta=doc.createElement('meta');meta.name='theme-color';(doc.head||doc.documentElement).appendChild(meta);metas=[meta]}
    metas.forEach(meta=>meta.content=theme===LIGHT?'#f2f6f9':'#040609');
    doc.querySelectorAll('meta[name="color-scheme"],meta[name="supported-color-schemes"]').forEach(meta=>meta.content=theme);
    doc.documentElement.style.colorScheme=theme;
  }
  function updateButtons(scope=document){
    scope.querySelectorAll?.('[data-dl-theme-toggle]').forEach(button=>{
      const light=root.dataset.dlTheme===LIGHT;
      button.setAttribute('aria-label',light?'Activar modo oscuro':'Activar modo claro');
      button.setAttribute('title',light?'Modo oscuro':'Modo claro');
      button.setAttribute('aria-pressed',String(light));
    });
  }
  function apply(theme,{persist=false,broadcast=true}={}){
    theme=theme===LIGHT?LIGHT:DARK;
    root.dataset.dlTheme=theme;
    root.classList.toggle('dl-theme-light',theme===LIGHT);
    root.classList.toggle('dl-theme-dark',theme===DARK);
    document.querySelectorAll('#dlMobileHeaderV71,#dlMobileDockV71,#dlMobileSearchV89').forEach(host=>host.dataset.dlTheme=theme);
    updateMeta(theme);ensureCss();updateButtons();mountButtons();
    if(persist){try{localStorage.setItem(KEY,theme)}catch(_){}}
    if(broadcast){
      try{document.querySelectorAll('iframe').forEach(frame=>frame.contentWindow?.postMessage({type:'dingloft:theme',theme},location.origin))}catch(_){}
      try{if(parent!==window)parent.postMessage({type:'dingloft:theme',theme},location.origin)}catch(_){}
    }
    dispatchEvent(new CustomEvent('dingloft:themechange',{detail:{theme}}));
  }
  function toggle(){apply(root.dataset.dlTheme===LIGHT?DARK:LIGHT,{persist:true})}
  function bind(button){if(!button||button.dataset.dlThemeBound)return;button.dataset.dlThemeBound='1';button.addEventListener('click',toggle)}
  function button(className=''){const b=document.createElement('button');b.type='button';b.className=`dl-theme-toggle ${className}`.trim();b.dataset.dlThemeToggle='1';b.innerHTML=svg;bind(b);return b}

  function mountDesktop(){
    const actions=document.getElementById('desktopNavActions');if(!actions||actions.querySelector('[data-dl-theme-toggle]'))return false;
    const b=button('dl-theme-nav-action');const account=document.getElementById('navAccount');actions.insertBefore(b,account||null);updateButtons(actions);return true;
  }
  function mountMobile(){
    const theme=root.dataset.dlTheme||DARK;
    const host=document.getElementById('dlMobileHeaderV71'),shadow=host?.shadowRoot;if(host)host.dataset.dlTheme=theme;
    if(shadow&&!shadow.querySelector('#dl-theme-mobile-style')){const style=document.createElement('style');style.id='dl-theme-mobile-style';style.textContent=`.dl-theme-mobile{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:15px;width:38px;height:38px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:#0b1016;color:#d9e8f4;display:grid;place-items:center;padding:0}.dl-theme-mobile svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}.dl-theme-mobile .dl-theme-moon{display:none}:host([data-dl-theme="light"]) .dl-theme-mobile{background:rgba(255,255,255,.82);border-color:rgba(34,55,72,.13);color:#243746;box-shadow:0 5px 16px rgba(32,55,72,.09)}:host([data-dl-theme="light"]) .dl-theme-mobile .dl-theme-sun{display:none}:host([data-dl-theme="light"]) .dl-theme-mobile .dl-theme-moon{display:block}:host([data-dl-theme="light"]) .bar{background:linear-gradient(180deg,#f8fbfd,#edf3f7);border-color:rgba(33,55,72,.10);box-shadow:0 8px 25px rgba(37,59,76,.10)}:host([data-dl-theme="light"]) .brand,:host([data-dl-theme="light"]) .copy strong{color:#172633}:host([data-dl-theme="light"]) .copy small{color:#728292}:host([data-dl-theme="light"]) .search{background:rgba(255,255,255,.82);border-color:rgba(34,55,72,.13);color:#243746}`;const b=button('dl-theme-mobile');shadow.append(style,b);updateButtons(shadow)}
    const mobileButton=shadow?.querySelector('[data-dl-theme-toggle]');if(mobileButton){mobileButton.style.left='max(58px, calc(env(safe-area-inset-left, 0px) + 58px))';mobileButton.style.right='auto'}
    const dock=document.getElementById('dlMobileDockV71'),dockRoot=dock?.shadowRoot;if(dock)dock.dataset.dlTheme=theme;
    if(dockRoot&&!dockRoot.querySelector('#dl-theme-dock-style')){const s=document.createElement('style');s.id='dl-theme-dock-style';s.textContent=`:host([data-dl-theme="light"]) .dock{background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(238,244,248,.95));border-color:rgba(31,55,73,.14);box-shadow:0 18px 48px rgba(31,55,73,.16),inset 0 1px #fff}:host([data-dl-theme="light"]) .item{color:#718292}:host([data-dl-theme="light"]) .item.active{color:#173b4b;background:rgba(8,127,174,.06)}:host([data-dl-theme="light"]) .liquid-lens{background:linear-gradient(145deg,rgba(255,255,255,.9),rgba(90,200,238,.10));border-color:rgba(31,117,153,.18);box-shadow:0 9px 25px rgba(31,55,73,.10),inset 0 1px #fff}:host([data-dl-theme="light"]) .cart{border-color:#eef4f7;background:linear-gradient(145deg,#203644,#0e202c);color:#f5fbff;box-shadow:0 14px 34px rgba(31,55,73,.23)}:host([data-dl-theme="light"]) .count{border-color:#eef4f7}`;dockRoot.appendChild(s)}
    const search=document.getElementById('dlMobileSearchV89'),searchRoot=search?.shadowRoot;if(search)search.dataset.dlTheme=theme;
    if(searchRoot&&!searchRoot.querySelector('#dl-theme-search-style')){const s=document.createElement('style');s.id='dl-theme-search-style';s.textContent=`:host([data-dl-theme="light"]) .overlay{background:rgba(35,55,70,.38)}:host([data-dl-theme="light"]) .panel{background:linear-gradient(155deg,#fff,#f1f6f9);border-color:rgba(31,55,73,.14);box-shadow:0 28px 80px rgba(31,55,73,.22)}:host([data-dl-theme="light"]) .inputbox,:host([data-dl-theme="light"]) .result{background:#f5f9fb;border-color:rgba(31,55,73,.12);color:#172633}:host([data-dl-theme="light"]) input{color:#172633}:host([data-dl-theme="light"]) .close{color:#405565}`;searchRoot.appendChild(s)}
    return Boolean(shadow||dockRoot||searchRoot);
  }
  function mountFloating(){
    if(!document.body||window!==top||document.querySelector('[data-dl-theme-toggle]')||document.getElementById('desktopNavActions')||document.getElementById('dlMobileHeaderV71'))return false;
    const file=(location.pathname.split('/').pop()||'').toLowerCase();
    const standalone=new Set(['login.html','register.html','404.html','offline.html']);
    if(!standalone.has(file))return false;
    const b=button('dl-theme-floating');(document.body||document.documentElement).appendChild(b);updateButtons();return true;
  }
  function mountButtons(){if(window===top){mountDesktop();mountMobile();mountFloating()}}

  ensureCss();apply(resolved(),{broadcast:false});
  addEventListener('storage',e=>{if(e.key===KEY)apply(resolved(e.newValue),{broadcast:true})});
  addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='dingloft:theme')return;apply(e.data.theme,{broadcast:false})});
  media.addEventListener?.('change',()=>{if(!stored())apply(resolved(),{broadcast:true})});
  new MutationObserver(()=>mountButtons()).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountButtons,{once:true});else mountButtons();
  window.DingloftTheme={apply,toggle,get:()=>root.dataset.dlTheme};
})();
