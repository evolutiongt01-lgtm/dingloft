(() => {
  'use strict';
  const VERSION = '31';
  const SW_URL = `/sw.js?v=${VERSION}`;
  const PROMPT_KEY = 'dingloft_update_prompted_version';
  const PROMPT_TIME_KEY = 'dingloft_update_prompted_at';
  const LAST_CHECK_KEY = 'dingloft_update_last_check';
  const MIN_CHECK_MS = 60 * 60 * 1000; // max one forced check per hour
  const REPROMPT_MS = 24 * 60 * 60 * 1000; // same waiting version at most once/day
  if (!('serviceWorker' in navigator)) return;

  let registration = null;
  let reloading = false;
  let promptVisible = false;
  let waitingWorker = null;

  const versionNumber = v => {
    const n = Number(String(v || '').replace(/[^0-9.]/g,'').split('.')[0]);
    return Number.isFinite(n) ? n : 0;
  };

  function versionFromScriptURL(worker){
    try {
      if (!worker?.scriptURL) return '';
      const u = new URL(worker.scriptURL);
      return u.searchParams.get('v') || '';
    } catch(_) { return ''; }
  }

  function askVersion(worker, timeout=700){
    return new Promise(resolve => {
      if (!worker) return resolve('');
      let done = false;
      const finish = v => { if (done) return; done = true; resolve(String(v || '')); };
      try {
        const ch = new MessageChannel();
        const t = setTimeout(() => finish(versionFromScriptURL(worker)), timeout);
        ch.port1.onmessage = e => { clearTimeout(t); finish(e?.data?.version || versionFromScriptURL(worker)); };
        worker.postMessage({type:'GET_VERSION'}, [ch.port2]);
      } catch(_) { finish(versionFromScriptURL(worker)); }
    });
  }

  function injectUI(){
    if (document.getElementById('dlPwaUpdate')) return;
    const style = document.createElement('style');
    style.id = 'dlPwaRuntimeStyle';
    style.textContent = `
      #dlPwaUpdate{position:fixed;z-index:2147483000;inset:0;display:grid;place-items:center;padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));background:#040609;opacity:0;visibility:hidden;transition:opacity .22s ease,visibility .22s;isolation:isolate;color:#f5f8fb;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",sans-serif}
      #dlPwaUpdate.show{opacity:1;visibility:visible}
      #dlPwaUpdate:before{content:"";position:absolute;inset:-15%;background:radial-gradient(circle at 50% 34%,rgba(83,210,255,.15),transparent 24%),radial-gradient(circle at 50% 66%,rgba(111,92,255,.09),transparent 25%);filter:blur(16px);z-index:-2}
      .dl-up-card{width:min(430px,92vw);text-align:center;padding:32px 26px 26px;border-radius:30px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(155deg,rgba(18,23,30,.94),rgba(7,10,14,.97));box-shadow:0 34px 100px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px)}
      .dl-up-mark{width:84px;height:84px;margin:0 auto 22px;border-radius:26px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.018));border:1px solid rgba(255,255,255,.12)}
      .dl-up-mark img{width:62px;height:62px;border-radius:19px;object-fit:contain}.dl-up-kicker{color:#7bdfff;font-size:.66rem;font-weight:850;letter-spacing:.18em;text-transform:uppercase}.dl-up-title{margin:10px 0 10px;font-size:1.65rem;line-height:1.05;letter-spacing:-.05em}.dl-up-text{margin:0 auto;color:#8e9bad;font-size:.86rem;line-height:1.62;max-width:330px}.dl-up-btn{width:100%;height:52px;margin-top:23px;border:0;border-radius:16px;background:#f3f6f8;color:#071017;font-weight:850;font-size:.9rem;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer}.dl-up-btn:disabled{opacity:.85;cursor:default}
      #dlOfflinePill{position:fixed;z-index:2147482000;left:50%;top:max(10px,calc(env(safe-area-inset-top) + 8px));transform:translate(-50%,-16px);display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:999px;border:1px solid rgba(255,197,92,.25);background:rgba(18,14,8,.94);color:#ffd486;font:750 .72rem/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;opacity:0;visibility:hidden;transition:.22s}.offline #dlOfflinePill{opacity:1;visibility:visible;transform:translate(-50%,0)}#dlOfflinePill b{width:7px;height:7px;border-radius:50%;background:#ffc45c}
    `;
    document.head.appendChild(style);
    const ui = document.createElement('div');
    ui.id = 'dlPwaUpdate';
    ui.innerHTML = `<div class="dl-up-card"><div class="dl-up-mark"><img src="/img/pwa-liquid-rounded-192-v17.png?v=24" alt="Dingloft"></div><div class="dl-up-kicker">Actualización de Dingloft</div><h2 class="dl-up-title" id="dlUpTitle">Nueva versión disponible</h2><p class="dl-up-text" id="dlUpText">Hay una versión más reciente de la app. Actualiza para obtener las últimas mejoras y correcciones.</p><button class="dl-up-btn" id="dlUpButton" type="button">Actualizar Dingloft</button></div>`;
    document.body.appendChild(ui);
    const pill = document.createElement('div');
    pill.id = 'dlOfflinePill'; pill.innerHTML = '<b></b><span>Modo sin conexión</span>'; document.body.appendChild(pill);
    document.getElementById('dlUpButton')?.addEventListener('click', applyUpdate);
    paintOnline();
  }

  function paintOnline(){ document.documentElement.classList.toggle('offline', !navigator.onLine); }

  async function shouldShow(worker){
    const candidate = (await askVersion(worker)) || versionFromScriptURL(worker);
    const active = navigator.serviceWorker.controller;
    const activeVersion = (await askVersion(active)) || versionFromScriptURL(active);
    const c = versionNumber(candidate), a = versionNumber(activeVersion);
    // Never prompt for same/older worker. This is the v23 repeat-prompt bug fix.
    if (!candidate || (a && c && c <= a) || candidate === activeVersion) return {ok:false,candidate,activeVersion};
    const seen = sessionStorage.getItem(PROMPT_KEY);
    if (seen === candidate) return {ok:false,candidate,activeVersion};
    const lastVersion = localStorage.getItem(PROMPT_KEY);
    const lastAt = Number(localStorage.getItem(PROMPT_TIME_KEY) || 0);
    if (lastVersion === candidate && Date.now() - lastAt < REPROMPT_MS) return {ok:false,candidate,activeVersion};
    return {ok:true,candidate,activeVersion};
  }

  async function showUpdate(worker){
    waitingWorker = worker || registration?.waiting || waitingWorker;
    if (!waitingWorker || promptVisible) return;
    const decision = await shouldShow(waitingWorker);
    if (!decision.ok) return;
    promptVisible = true;
    sessionStorage.setItem(PROMPT_KEY, decision.candidate);
    localStorage.setItem(PROMPT_KEY, decision.candidate);
    localStorage.setItem(PROMPT_TIME_KEY, String(Date.now()));
    injectUI();
    document.getElementById('dlPwaUpdate')?.classList.add('show');
  }

  async function applyUpdate(){
    if (!waitingWorker) waitingWorker = registration?.waiting;
    if (!waitingWorker) return;
    const btn = document.getElementById('dlUpButton');
    const title = document.getElementById('dlUpTitle');
    const text = document.getElementById('dlUpText');
    if (btn) { btn.disabled = true; btn.textContent = 'Instalando actualización…'; }
    if (title) title.textContent = 'Actualizando Dingloft';
    if (text) text.textContent = 'Activando la versión más reciente. La app se reiniciará automáticamente.';
    try { waitingWorker.postMessage({type:'SKIP_WAITING'}); } catch(_) {}
    setTimeout(()=>{ if (!reloading) location.reload(); }, 5000);
  }

  function watchRegistration(reg){
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker);
      });
    });
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  async function check(force=false){
    if (!navigator.onLine || !registration) return;
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    if (!force && Date.now() - last < MIN_CHECK_MS) return;
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    try { await registration.update(); } catch(_) {}
    if (registration.waiting && navigator.serviceWorker.controller) await showUpdate(registration.waiting);
  }

  addEventListener('online', () => { paintOnline(); setTimeout(()=>check(false), 500); });
  addEventListener('offline', paintOnline);

  addEventListener('load', async () => {
    injectUI();
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, {scope:'/', updateViaCache:'none'});
      watchRegistration(reg);
      // One controlled check after boot. No visibilitychange loop anymore.
      setTimeout(()=>check(false), 1200);
      setInterval(()=>check(false), 6 * 60 * 60 * 1000);
    } catch(err) { console.warn('Dingloft PWA update:', err); }
  }, {once:true});
})();
