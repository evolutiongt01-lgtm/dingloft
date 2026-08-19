(() => {
  'use strict';
  const VERSION = '23';
  const SW_URL = `/sw.js?v=${VERSION}`;
  if (!('serviceWorker' in navigator)) return;

  let registration = null;
  let reloading = false;
  let promptVisible = false;
  let waitingWorker = null;

  function injectUI(){
    if (document.getElementById('dlPwaUpdate')) return;
    const style = document.createElement('style');
    style.id = 'dlPwaRuntimeStyle';
    style.textContent = `
      #dlPwaUpdate{position:fixed;z-index:2147483000;inset:0;display:grid;place-items:center;padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));background:#040609;opacity:0;visibility:hidden;transition:opacity .22s ease,visibility .22s;isolation:isolate;color:#f5f8fb;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",sans-serif}
      #dlPwaUpdate.show{opacity:1;visibility:visible}
      #dlPwaUpdate:before{content:"";position:absolute;inset:-15%;background:radial-gradient(circle at 50% 34%,rgba(83,210,255,.15),transparent 24%),radial-gradient(circle at 50% 66%,rgba(111,92,255,.09),transparent 25%);filter:blur(16px);z-index:-2}
      #dlPwaUpdate:after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:54px 54px;mask-image:radial-gradient(circle at center,#000,transparent 72%);opacity:.34;z-index:-1}
      .dl-up-card{width:min(430px,92vw);text-align:center;padding:32px 26px 26px;border-radius:30px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(155deg,rgba(18,23,30,.94),rgba(7,10,14,.97));box-shadow:0 34px 100px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px)}
      .dl-up-mark{width:84px;height:84px;margin:0 auto 22px;border-radius:26px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.018));border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 65px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.07)}
      .dl-up-mark img{width:62px;height:62px;border-radius:19px;object-fit:contain}.dl-up-kicker{color:#7bdfff;font-size:.66rem;font-weight:850;letter-spacing:.18em;text-transform:uppercase}.dl-up-title{margin:10px 0 10px;font-size:1.65rem;line-height:1.05;letter-spacing:-.05em}.dl-up-text{margin:0 auto;color:#8e9bad;font-size:.86rem;line-height:1.62;max-width:330px}.dl-up-btn{width:100%;height:52px;margin-top:23px;border:0;border-radius:16px;background:#f3f6f8;color:#071017;font-weight:850;font-size:.9rem;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer}.dl-up-btn:disabled{opacity:.85;cursor:default}.dl-up-wave{height:20px;display:none;align-items:center;gap:4px}.dl-up-btn.loading .dl-up-wave{display:flex}.dl-up-btn.loading .dl-up-btn-label{display:none}.dl-up-wave i{display:block;width:3px;border-radius:99px;background:#071017;animation:dlw .7s ease-in-out infinite alternate}.dl-up-wave i:nth-child(1){height:6px}.dl-up-wave i:nth-child(2){height:13px;animation-delay:-.2s}.dl-up-wave i:nth-child(3){height:18px;animation-delay:-.35s}.dl-up-wave i:nth-child(4){height:11px;animation-delay:-.15s}.dl-up-wave i:nth-child(5){height:6px;animation-delay:-.3s}@keyframes dlw{from{transform:scaleY(.4);opacity:.45}to{transform:scaleY(1);opacity:1}}
      #dlOfflinePill{position:fixed;z-index:2147482000;left:50%;top:max(10px,calc(env(safe-area-inset-top) + 8px));transform:translate(-50%,-16px);display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:999px;border:1px solid rgba(255,197,92,.25);background:rgba(18,14,8,.94);color:#ffd486;font:750 .72rem/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.34);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);opacity:0;visibility:hidden;transition:.22s}.offline #dlOfflinePill{opacity:1;visibility:visible;transform:translate(-50%,0)}#dlOfflinePill b{width:7px;height:7px;border-radius:50%;background:#ffc45c;box-shadow:0 0 0 4px rgba(255,196,92,.10)}
      @media(max-width:600px){.dl-up-card{padding:28px 21px 22px;border-radius:27px}.dl-up-title{font-size:1.5rem}.dl-up-mark{width:78px;height:78px}.dl-up-mark img{width:58px;height:58px}}
      @media(prefers-reduced-motion:reduce){#dlPwaUpdate,#dlOfflinePill,.dl-up-wave i{transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);
    const ui = document.createElement('div');
    ui.id = 'dlPwaUpdate';
    ui.innerHTML = `<div class="dl-up-card"><div class="dl-up-mark"><img src="/img/pwa-liquid-rounded-192-v17.png?v=23" alt="Dingloft"></div><div class="dl-up-kicker">Actualización de Dingloft</div><h2 class="dl-up-title" id="dlUpTitle">Nueva versión disponible</h2><p class="dl-up-text" id="dlUpText">Hay una versión más reciente de la app. Actualiza para obtener las últimas mejoras y correcciones.</p><button class="dl-up-btn" id="dlUpButton" type="button"><span class="dl-up-btn-label">Actualizar Dingloft</span><span class="dl-up-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></button></div>`;
    document.body.appendChild(ui);
    const pill = document.createElement('div');
    pill.id = 'dlOfflinePill';
    pill.innerHTML = '<b></b><span>Modo sin conexión</span>';
    document.body.appendChild(pill);
    document.getElementById('dlUpButton')?.addEventListener('click', applyUpdate);
    paintOnline();
  }

  function paintOnline(){
    document.documentElement.classList.toggle('offline', !navigator.onLine);
  }

  function showUpdate(worker){
    waitingWorker = worker || registration?.waiting || waitingWorker;
    if (!waitingWorker || promptVisible) return;
    promptVisible = true;
    injectUI();
    document.getElementById('dlPwaUpdate')?.classList.add('show');
  }

  async function applyUpdate(){
    if (!waitingWorker) waitingWorker = registration?.waiting;
    if (!waitingWorker) {
      try { await registration?.update(); } catch(_) {}
      waitingWorker = registration?.waiting;
    }
    if (!waitingWorker) return;
    const btn = document.getElementById('dlUpButton');
    const title = document.getElementById('dlUpTitle');
    const text = document.getElementById('dlUpText');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    if (title) title.textContent = 'Instalando actualización…';
    if (text) text.textContent = 'Estamos activando la versión más reciente. Dingloft se reiniciará en unos segundos.';
    try { waitingWorker.postMessage({type:'SKIP_WAITING'}); } catch(_) { waitingWorker.postMessage('SKIP_WAITING'); }
    setTimeout(()=>{ if (!reloading) location.reload(); }, 5500);
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
    sessionStorage.setItem('dingloft_just_updated', String(Date.now()));
    location.reload();
  });

  async function check(){
    if (!navigator.onLine || !registration) return;
    try { await registration.update(); } catch(_) {}
    if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration.waiting);
  }

  addEventListener('online', () => { paintOnline(); setTimeout(check, 350); });
  addEventListener('offline', paintOnline);
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });

  addEventListener('load', async () => {
    injectUI();
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, {scope:'/', updateViaCache:'none'});
      watchRegistration(reg);
      setTimeout(check, 650);
      setInterval(check, 30 * 60 * 1000);
    } catch(err) { console.warn('Dingloft PWA update:', err); }
  }, {once:true});
})();
