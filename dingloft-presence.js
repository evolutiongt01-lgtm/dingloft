/* Dingloft Presence v58 · Durable Objects + WebSocket Hibernation
   - Live presence no longer uses Firestore.
   - No periodic presence heartbeat.
   - Approximate location is resolved by Cloudflare; raw IP is never stored.
*/
const DINGLOFT_COMMERCE_BACKEND = 'https://autumn-breeze-dfa0.evolutiongt01.workers.dev';
const DINGLOFT_PRESENCE_SERVICE = 'https://dingloft-presence-live.evolutiongt01.workers.dev';
const DINGLOFT_ACCOUNT_REVIEW_INTERVAL = 5 * 60_000;
const DINGLOFT_PRESENCE_SESSION_TTL = 30 * 60_000;
const DINGLOFT_VISITOR_KEY = 'dingloft_presence_visitor';
const DINGLOFT_SESSION_KEY = 'dingloft_presence_session';

function safeStorageGet(key){ try{return localStorage.getItem(key)||''}catch(_){return ''} }
function safeStorageSet(key,value){ try{localStorage.setItem(key,value)}catch(_){} }
function randomId(prefix=''){
  const core=(crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g,'');
  return `${prefix}${core}`.slice(0,90);
}
function presenceVisitorId(){
  let id=safeStorageGet(DINGLOFT_VISITOR_KEY)||safeStorageGet('dingloft_presence_visitor_v44');
  if(!/^[A-Za-z0-9_-]{16,100}$/.test(id)) id=randomId('v_');
  safeStorageSet(DINGLOFT_VISITOR_KEY,id);
  return id;
}
function presenceSessionId(){
  const now=Date.now();
  let data={};
  try{data=JSON.parse(safeStorageGet(DINGLOFT_SESSION_KEY)||'{}')}catch(_){data={}}
  if(!/^[A-Za-z0-9_-]{16,100}$/.test(String(data.id||'')) || now-Number(data.last||0)>DINGLOFT_PRESENCE_SESSION_TTL){
    data={id:randomId('s_'),startedAt:now,last:now};
  } else data.last=now;
  safeStorageSet(DINGLOFT_SESSION_KEY,JSON.stringify(data));
  return data.id;
}
function touchSession(){
  try{
    const data=JSON.parse(safeStorageGet(DINGLOFT_SESSION_KEY)||'{}');
    if(data?.id){data.last=Date.now();safeStorageSet(DINGLOFT_SESSION_KEY,JSON.stringify(data))}
  }catch(_){}
}
function presenceClientInfo(){
  const ua=navigator.userAgent||'';
  const isiPad=/iPad/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isiPhone=/iPhone|iPod/i.test(ua);
  const isAndroid=/Android/i.test(ua);
  const isAndroidTablet=isAndroid&&/Tablet|SM-T|Lenovo Tab|Nexus 7|Nexus 9|Pixel C/i.test(ua);
  let device='Web', os='Otro';
  if(isiPhone){device='iPhone';os='iOS'}
  else if(isiPad){device='iPad';os='iPadOS'}
  else if(isAndroidTablet){device='Android Tablet';os='Android'}
  else if(isAndroid){device='Android';os='Android'}
  else if(/Macintosh|Mac OS X/i.test(ua)){device='Mac';os='macOS'}
  else if(/Windows/i.test(ua)){device='Windows PC';os='Windows'}
  else if(/Linux/i.test(ua)){device='Linux PC';os='Linux'}
  let browser='Otro';
  if(/EdgiOS|EdgA|Edg\//i.test(ua))browser='Edge';
  else if(/OPiOS|OPR\//i.test(ua))browser='Opera';
  else if(/SamsungBrowser\//i.test(ua))browser='Samsung Internet';
  else if(/Firefox|FxiOS/i.test(ua))browser='Firefox';
  else if(/CriOS|Chrome\//i.test(ua))browser='Chrome';
  else if(/Version\//i.test(ua)&&/Safari/i.test(ua))browser='Safari';
  return {device,browser,os};
}
let dingloftPresenceLogicalPath='';
function normalizePresenceRoute(value=''){
  try{
    const raw=String(value||'').trim();if(!raw)return '';
    const u=new URL(raw,location.origin);
    if(u.origin!==location.origin)return '';
    return `${u.pathname}${u.search}`.slice(0,500);
  }catch(_){return ''}
}
function presencePath(){ return (dingloftPresenceLogicalPath||`${location.pathname}${location.search}`).slice(0,500) }
function isInfrastructurePage(){
  const p=(location.pathname||'').toLowerCase();
  return /\/(?:admin|admin\.html|commerce-admin|commerce-admin\.html)(?:\/|$)/.test(p);
}

async function presenceFirebaseToken(){
  try{
    const [{getApps,initializeApp},{getAuth}] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    ]);
    const firebaseConfig={
      apiKey:'AIzaSyAKxQdUM49cVbBaXWJ5DF3s7EaNKlJRGhA',
      authDomain:'login-dingloft.firebaseapp.com',
      projectId:'login-dingloft',
      storageBucket:'login-dingloft.firebasestorage.app',
      messagingSenderId:'549466738202',
      appId:'1:549466738202:web:8bf305fe2c753e9d76cba3'
    };
    const app=getApps()[0]||initializeApp(firebaseConfig);
    const auth=getAuth(app);
    if(auth.authStateReady) await Promise.race([auth.authStateReady(),new Promise(r=>setTimeout(r,1400))]);
    const user=auth.currentUser;
    return user ? await user.getIdToken(false) : '';
  }catch(_){return ''}
}
function presencePayload(){
  const info=presenceClientInfo();
  return {
    visitorId:presenceVisitorId(),
    sessionId:presenceSessionId(),
    path:presencePath(),
    title:(document.title||'Dingloft').slice(0,180),
    referrer:(document.referrer||'').slice(0,500),
    device:info.device,
    browser:info.browser,
    os:info.os,
    standalone:matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,
    language:(navigator.language||'').slice(0,30),
    visible:document.visibilityState==='visible'
  };
}

let presenceSocket=null;
let presenceReconnectTimer=0;
let presenceReconnectDelay=1200;
let presencePageClosing=false;
let presenceIdentifyBusy=false;
let presenceHttpFallbackLast=0;
let presenceSocketOpenedAt=0;
let presenceSocketAttempt=0;

async function presenceHttpFallback(reason='fallback'){
  const now=Date.now();
  if(now-presenceHttpFallbackLast<45_000||navigator.onLine===false||isInfrastructurePage())return false;
  presenceHttpFallbackLast=now;
  try{
    const payload={...presencePayload(),reason:String(reason||'fallback').slice(0,40)};
    const token=await presenceFirebaseToken();
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),6500);
    try{
      const r=await fetch(`${DINGLOFT_PRESENCE_SERVICE}/presence/heartbeat`,{
        method:'POST',cache:'no-store',signal:c.signal,
        headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify(payload)
      });
      if(r.ok){document.documentElement.dataset.dingloftPresence='http';return true}
      return false;
    }finally{clearTimeout(timer)}
  }catch(_){return false}
}

function presenceWsUrl(){
  const p=presencePayload();
  const u=new URL('/presence/ws',DINGLOFT_PRESENCE_SERVICE);
  u.protocol=u.protocol==='https:'?'wss:':'ws:';
  Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,typeof v==='boolean'?(v?'1':'0'):String(v??'')));
  return u.toString();
}
function presenceSocketOpen(){return presenceSocket&&presenceSocket.readyState===WebSocket.OPEN}
function clearPresenceReconnect(){if(presenceReconnectTimer){clearTimeout(presenceReconnectTimer);presenceReconnectTimer=0}}
function schedulePresenceReconnect(){
  if(presencePageClosing||document.visibilityState!=='visible'||navigator.onLine===false||isInfrastructurePage())return;
  clearPresenceReconnect();
  const wait=Math.min(15_000,presenceReconnectDelay);
  presenceReconnectTimer=setTimeout(()=>connectPresenceSocket(),wait);
  presenceReconnectDelay=Math.min(15_000,Math.round(presenceReconnectDelay*1.7));
}
async function identifyPresence(){
  if(presenceIdentifyBusy||navigator.onLine===false)return false;
  presenceIdentifyBusy=true;
  try{
    const token=await presenceFirebaseToken();
    if(!token)return false;
    const payload=presencePayload();
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),6000);
    try{
      const r=await fetch(`${DINGLOFT_PRESENCE_SERVICE}/presence/identify`,{
        method:'POST',
        headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
        body:JSON.stringify(payload),cache:'no-store',signal:c.signal
      });
      return r.ok;
    }finally{clearTimeout(timer)}
  }catch(_){return false}
  finally{presenceIdentifyBusy=false}
}
function sendPresenceEvent(type='event'){
  touchSession();
  if(!presenceSocketOpen()){
    if(document.visibilityState==='visible')connectPresenceSocket();
    return;
  }
  try{
    presenceSocket.send(JSON.stringify({
      type,
      path:presencePath(),
      title:(document.title||'Dingloft').slice(0,180),
      visible:document.visibilityState==='visible'
    }));
  }catch(_){}
}
function connectPresenceSocket(){
  if(isInfrastructurePage()||navigator.onLine===false||document.visibilityState!=='visible')return;
  if(presenceSocket&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(presenceSocket.readyState))return;
  presencePageClosing=false;
  clearPresenceReconnect();
  touchSession();
  try{
    presenceSocketAttempt=Date.now();
    const ws=new WebSocket(presenceWsUrl());
    presenceSocket=ws;
    const fallbackTimer=setTimeout(()=>{if(presenceSocket===ws&&ws.readyState!==WebSocket.OPEN)presenceHttpFallback('ws-timeout')},2800);
    ws.addEventListener('open',()=>{
      clearTimeout(fallbackTimer);
      if(presenceSocket!==ws)return;
      presenceSocketOpenedAt=Date.now();
      document.documentElement.dataset.dingloftPresence='ws';
      presenceReconnectDelay=1200;
      sendPresenceEvent('visible');
      identifyPresence().then(ok=>{if(!ok)setTimeout(()=>{if(presenceSocket===ws&&presenceSocketOpen())identifyPresence()},2500)});
    });
    ws.addEventListener('close',()=>{
      clearTimeout(fallbackTimer);
      if(presenceSocket===ws)presenceSocket=null;
      if(!presenceSocketOpenedAt||Date.now()-presenceSocketOpenedAt<3500)presenceHttpFallback('ws-close');
      schedulePresenceReconnect();
    });
    ws.addEventListener('error',()=>{
      presenceHttpFallback('ws-error');
      try{ws.close()}catch(_){}
    });
  }catch(_){presenceHttpFallback('ws-constructor');schedulePresenceReconnect()}
}
function closePresenceSocket(reason='close'){
  clearPresenceReconnect();
  const ws=presenceSocket;
  presenceSocket=null;
  if(!ws)return;
  try{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'hidden',path:presencePath(),title:(document.title||'Dingloft').slice(0,180),visible:false,reason}))}catch(_){}
  try{ws.close(1000,String(reason).slice(0,60))}catch(_){}
}

// Account Review Gate v46 · universal for every signed-in Dingloft page.
const DINGLOFT_ACCOUNT_REVIEW_MESSAGE='Tu cuenta está temporalmente en revisión. Hemos recibido un reporte relacionado con una transacción o posible actividad irregular y nuestro equipo está verificando la información. Durante esta revisión, el acceso a la cuenta y a sus funciones permanece suspendido.';
let accountGateBusy=false,accountGateLast=0;
function injectAccountReviewStyle(){if(document.getElementById('dlAccountReviewStyle'))return;const style=document.createElement('style');style.id='dlAccountReviewStyle';style.textContent=`#dlAccountReview{position:fixed;z-index:2147483646;inset:0;display:grid;place-items:center;padding:max(26px,env(safe-area-inset-top)) 18px max(26px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 34%,rgba(64,209,255,.13),transparent 25%),radial-gradient(circle at 50% 75%,rgba(98,84,255,.08),transparent 24%),#040609;color:#f7fbff;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",sans-serif;overflow:auto}.dl-review-card{width:min(470px,92vw);text-align:center;padding:34px 27px 27px;border-radius:30px;border:1px solid rgba(119,221,255,.16);background:linear-gradient(155deg,rgba(16,22,29,.96),rgba(6,9,13,.98));box-shadow:0 35px 110px rgba(0,0,0,.68),inset 0 1px 0 rgba(255,255,255,.055);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);animation:dlReviewIn .42s cubic-bezier(.2,.82,.2,1)}.dl-review-logo{width:82px;height:82px;margin:0 auto 20px;border-radius:25px;padding:9px;box-sizing:border-box;background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.11);box-shadow:0 0 55px rgba(67,210,255,.1)}.dl-review-logo img{width:100%;height:100%;object-fit:contain;border-radius:18px}.dl-review-kicker{font-size:.61rem;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#79dfff}.dl-review-title{font-size:1.75rem;line-height:1.05;letter-spacing:-.045em;margin:11px 0 12px}.dl-review-text{font-size:.83rem;line-height:1.7;color:#93a2b2;margin:0 auto;max-width:390px}.dl-review-status{margin:21px 0 0;padding:13px 14px;border-radius:15px;background:rgba(255,181,75,.055);border:1px solid rgba(255,190,80,.13);font-size:.67rem;line-height:1.55;color:#d6b985}.dl-review-btn{width:100%;height:50px;margin-top:20px;border-radius:15px;border:1px solid rgba(255,255,255,.12);background:#f1f5f8;color:#071018;font-weight:850;cursor:pointer}.dl-review-brand{margin-top:18px;color:#536575;font-size:.55rem;font-weight:850;letter-spacing:.18em;text-transform:uppercase}@keyframes dlReviewIn{from{opacity:0;transform:translateY(12px) scale(.975)}to{opacity:1;transform:none}}`;document.head.appendChild(style)}
function showAccountReview(data={}){injectAccountReviewStyle();document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';let el=document.getElementById('dlAccountReview');if(!el){el=document.createElement('div');el.id='dlAccountReview';document.body.appendChild(el)}const msg=String(data.message||DINGLOFT_ACCOUNT_REVIEW_MESSAGE).replace(/[<>]/g,'');el.innerHTML=`<div class="dl-review-card"><div class="dl-review-logo"><img src="/img/pwa-liquid-rounded-192-v17.png" alt="Dingloft"></div><div class="dl-review-kicker">Dingloft · Seguridad de cuenta</div><h1 class="dl-review-title">Cuenta en revisión</h1><p class="dl-review-text">${msg}</p><div class="dl-review-status">Durante esta revisión no se puede acceder a compras, biblioteca, checkout ni generar nuevas descargas.</div><button class="dl-review-btn" id="dlReviewLogout" type="button">Cerrar sesión</button><div class="dl-review-brand">Evolution Group</div></div>`;document.getElementById('dlReviewLogout').onclick=logoutReviewedAccount}
function clearAccountReview(){document.getElementById('dlAccountReview')?.remove();document.documentElement.style.overflow='';document.body.style.overflow=''}
async function logoutReviewedAccount(){try{const [{getApps,initializeApp},{getAuth,signOut}]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')]);const firebaseConfig={apiKey:'AIzaSyAKxQdUM49cVbBaXWJ5DF3s7EaNKlJRGhA',authDomain:'login-dingloft.firebaseapp.com',projectId:'login-dingloft',storageBucket:'login-dingloft.firebasestorage.app',messagingSenderId:'549466738202',appId:'1:549466738202:web:8bf305fe2c753e9d76cba3'};const app=getApps()[0]||initializeApp(firebaseConfig);await signOut(getAuth(app))}catch(_){}location.replace('/login.html?account_review=1')}
async function checkAccountReview(force=false){if(accountGateBusy||navigator.onLine===false)return;const now=Date.now();if(!force&&now-accountGateLast<300000)return;accountGateBusy=true;accountGateLast=now;try{const token=await presenceFirebaseToken();if(!token){clearAccountReview();return}const c=new AbortController(),timer=setTimeout(()=>c.abort(),6000);const r=await fetch(`${DINGLOFT_COMMERCE_BACKEND}/me/account-status`,{headers:{authorization:`Bearer ${token}`},cache:'no-store',signal:c.signal});clearTimeout(timer);const d=await r.json().catch(()=>({}));if(r.ok&&d.blocked)showAccountReview(d);else if(r.ok)clearAccountReview()}catch(_){}finally{accountGateBusy=false}}

function startPresence(){
  if(isInfrastructurePage()) return;
  if(document.visibilityState==='visible')connectPresenceSocket();
  setTimeout(()=>{if(document.visibilityState==='visible'&&!presenceSocketOpen())presenceHttpFallback('startup-watchdog')},3200);
  checkAccountReview(true);
  setInterval(()=>{if(document.visibilityState==='visible')checkAccountReview(false)},DINGLOFT_ACCOUNT_REVIEW_INTERVAL);
  addEventListener('online',()=>{presencePageClosing=false;connectPresenceSocket();checkAccountReview(true)});
  addEventListener('offline',()=>closePresenceSocket('offline'));
  addEventListener('pageshow',()=>{presencePageClosing=false;connectPresenceSocket();sendPresenceEvent('route')});
  addEventListener('popstate',()=>setTimeout(()=>sendPresenceEvent('route'),0));
  addEventListener('dingloft:presence-route',e=>{const next=normalizePresenceRoute(e.detail?.src||e.detail?.href||'');if(next){dingloftPresenceLogicalPath=next;sendPresenceEvent('route')}});
  addEventListener('dingloft:route-change',e=>{const next=normalizePresenceRoute(e.detail?.src||e.detail?.href||'');if(next){dingloftPresenceLogicalPath=next;sendPresenceEvent('route')}});
  addEventListener('message',e=>{
    if(e.origin!==location.origin||!e.data)return;
    if(e.data.type==='dingloft:route-change'){
      const next=normalizePresenceRoute(e.data.src||e.data.href||'');
      if(next){dingloftPresenceLogicalPath=next;sendPresenceEvent('route')}
    }
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      presencePageClosing=false;
      connectPresenceSocket();
      sendPresenceEvent('visible');
      checkAccountReview(true);
    } else {
      sendPresenceEvent('hidden');
    }
  });
  addEventListener('pagehide',()=>{presencePageClosing=true;closePresenceSocket('pagehide')});
  addEventListener('beforeunload',()=>{presencePageClosing=true;closePresenceSocket('unload')});
  window.DingloftPresence={version:58,reconnect:connectPresenceSocket,fallback:presenceHttpFallback,get transport(){return document.documentElement.dataset.dingloftPresence||'connecting'},get path(){return presencePath()}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startPresence,{once:true});else startPresence();
