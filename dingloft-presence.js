/* Dingloft Presence v48 · live presence + anonymous ghost session analytics
   - Approximate geolocation comes from Cloudflare request.cf on the Worker.
   - Raw IP is never stored.
   - Active duration is approximate and counts visible/heartbeat time only.
*/
const DINGLOFT_PRESENCE_WORKER = 'https://autumn-breeze-dfa0.evolutiongt01.workers.dev';
const DINGLOFT_PRESENCE_INTERVAL = 30_000;
const DINGLOFT_PRESENCE_MIN_GAP = 8_000;
const DINGLOFT_PRESENCE_SESSION_TTL = 30 * 60_000;
const DINGLOFT_VISITOR_KEY = 'dingloft_presence_visitor';
const DINGLOFT_SESSION_KEY = 'dingloft_presence_session';
const DINGLOFT_LAST_KEY = 'dingloft_presence_last_ping';

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
function presencePath(){ return `${location.pathname}${location.search}`.slice(0,500) }
function isInfrastructurePage(){
  const p=(location.pathname||'').toLowerCase();
  return /\/(?:launch|desktop-shell|app)\.html$/.test(p);
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

let presenceBusy=false;
let lastPathSent='';
async function dingloftPresencePing(reason='heartbeat',force=false,{anonymousFast=false}={}){
  if(navigator.onLine===false || isInfrastructurePage()) return;
  const now=Date.now(), path=presencePath();
  if(!force){
    const last=Number(safeStorageGet(DINGLOFT_LAST_KEY)||0);
    if(now-last<DINGLOFT_PRESENCE_MIN_GAP && path===lastPathSent)return;
  }
  if(presenceBusy && !anonymousFast)return;
  if(!anonymousFast)presenceBusy=true;
  touchSession();
  try{
    const headers={'content-type':'application/json'};
    if(!anonymousFast){
      const token=await presenceFirebaseToken();
      if(token)headers.authorization=`Bearer ${token}`;
    }
    const clientInfo=presenceClientInfo();
    const payload={
      visitorId:presenceVisitorId(),
      sessionId:presenceSessionId(),
      path,
      title:(document.title||'Dingloft').slice(0,180),
      referrer:(document.referrer||'').slice(0,500),
      device:clientInfo.device,
      browser:clientInfo.browser,
      os:clientInfo.os,
      standalone:matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,
      language:(navigator.language||'').slice(0,30),
      reason:String(reason||'heartbeat').slice(0,40),
      visible:document.visibilityState==='visible',
      clientAt:new Date().toISOString()
    };
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6500);
    await fetch(`${DINGLOFT_PRESENCE_WORKER}/presence/heartbeat`,{
      method:'POST',headers,body:JSON.stringify(payload),signal:controller.signal,cache:'no-store',keepalive:true
    });
    clearTimeout(timer);
    safeStorageSet(DINGLOFT_LAST_KEY,String(Date.now()));
    lastPathSent=path;
  }catch(_){
    // Analytics must never block navigation, checkout, downloads or audio.
  }finally{if(!anonymousFast)presenceBusy=false}
}

function fastClose(reason){
  if(navigator.onLine===false || isInfrastructurePage())return;
  // A no-auth keepalive still closes the existing session because sessionId/visitorId are stable.
  dingloftPresencePing(reason,true,{anonymousFast:true});
}


// Account Review Gate v46 · universal for every signed-in Dingloft page.
const DINGLOFT_ACCOUNT_REVIEW_MESSAGE='Tu cuenta está temporalmente en revisión. Hemos recibido un reporte relacionado con una transacción o posible actividad irregular y nuestro equipo está verificando la información. Durante esta revisión, el acceso a la cuenta y a sus funciones permanece suspendido.';
let accountGateBusy=false,accountGateLast=0;
function injectAccountReviewStyle(){if(document.getElementById('dlAccountReviewStyle'))return;const style=document.createElement('style');style.id='dlAccountReviewStyle';style.textContent=`#dlAccountReview{position:fixed;z-index:2147483646;inset:0;display:grid;place-items:center;padding:max(26px,env(safe-area-inset-top)) 18px max(26px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 34%,rgba(64,209,255,.13),transparent 25%),radial-gradient(circle at 50% 75%,rgba(98,84,255,.08),transparent 24%),#040609;color:#f7fbff;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",sans-serif;overflow:auto}.dl-review-card{width:min(470px,92vw);text-align:center;padding:34px 27px 27px;border-radius:30px;border:1px solid rgba(119,221,255,.16);background:linear-gradient(155deg,rgba(16,22,29,.96),rgba(6,9,13,.98));box-shadow:0 35px 110px rgba(0,0,0,.68),inset 0 1px 0 rgba(255,255,255,.055);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);animation:dlReviewIn .42s cubic-bezier(.2,.82,.2,1)}.dl-review-logo{width:82px;height:82px;margin:0 auto 20px;border-radius:25px;padding:9px;box-sizing:border-box;background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.11);box-shadow:0 0 55px rgba(67,210,255,.1)}.dl-review-logo img{width:100%;height:100%;object-fit:contain;border-radius:18px}.dl-review-kicker{font-size:.61rem;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#79dfff}.dl-review-title{font-size:1.75rem;line-height:1.05;letter-spacing:-.045em;margin:11px 0 12px}.dl-review-text{font-size:.83rem;line-height:1.7;color:#93a2b2;margin:0 auto;max-width:390px}.dl-review-status{margin:21px 0 0;padding:13px 14px;border-radius:15px;background:rgba(255,181,75,.055);border:1px solid rgba(255,190,80,.13);font-size:.67rem;line-height:1.55;color:#d6b985}.dl-review-btn{width:100%;height:50px;margin-top:20px;border-radius:15px;border:1px solid rgba(255,255,255,.12);background:#f1f5f8;color:#071018;font-weight:850;cursor:pointer}.dl-review-brand{margin-top:18px;color:#536575;font-size:.55rem;font-weight:850;letter-spacing:.18em;text-transform:uppercase}@keyframes dlReviewIn{from{opacity:0;transform:translateY(12px) scale(.975)}to{opacity:1;transform:none}}`;document.head.appendChild(style)}
function showAccountReview(data={}){injectAccountReviewStyle();document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';let el=document.getElementById('dlAccountReview');if(!el){el=document.createElement('div');el.id='dlAccountReview';document.body.appendChild(el)}const msg=String(data.message||DINGLOFT_ACCOUNT_REVIEW_MESSAGE).replace(/[<>]/g,'');el.innerHTML=`<div class="dl-review-card"><div class="dl-review-logo"><img src="/img/pwa-liquid-rounded-192-v17.png" alt="Dingloft"></div><div class="dl-review-kicker">Dingloft · Seguridad de cuenta</div><h1 class="dl-review-title">Cuenta en revisión</h1><p class="dl-review-text">${msg}</p><div class="dl-review-status">Durante esta revisión no se puede acceder a compras, biblioteca, checkout ni generar nuevas descargas.</div><button class="dl-review-btn" id="dlReviewLogout" type="button">Cerrar sesión</button><div class="dl-review-brand">Evolution Group</div></div>`;document.getElementById('dlReviewLogout').onclick=logoutReviewedAccount}
function clearAccountReview(){document.getElementById('dlAccountReview')?.remove();document.documentElement.style.overflow='';document.body.style.overflow=''}
async function logoutReviewedAccount(){try{const [{getApps,initializeApp},{getAuth,signOut}]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')]);const firebaseConfig={apiKey:'AIzaSyAKxQdUM49cVbBaXWJ5DF3s7EaNKlJRGhA',authDomain:'login-dingloft.firebaseapp.com',projectId:'login-dingloft',storageBucket:'login-dingloft.firebasestorage.app',messagingSenderId:'549466738202',appId:'1:549466738202:web:8bf305fe2c753e9d76cba3'};const app=getApps()[0]||initializeApp(firebaseConfig);await signOut(getAuth(app))}catch(_){}location.replace('/login.html?account_review=1')}
async function checkAccountReview(force=false){if(accountGateBusy||navigator.onLine===false)return;const now=Date.now();if(!force&&now-accountGateLast<25000)return;accountGateBusy=true;accountGateLast=now;try{const token=await presenceFirebaseToken();if(!token){clearAccountReview();return}const c=new AbortController(),timer=setTimeout(()=>c.abort(),6000);const r=await fetch(`${DINGLOFT_PRESENCE_WORKER}/me/account-status`,{headers:{authorization:`Bearer ${token}`},cache:'no-store',signal:c.signal});clearTimeout(timer);const d=await r.json().catch(()=>({}));if(r.ok&&d.blocked)showAccountReview(d);else if(r.ok)clearAccountReview()}catch(_){}finally{accountGateBusy=false}}

function startPresence(){
  if(isInfrastructurePage()) return;
  dingloftPresencePing('open',true);
  checkAccountReview(true);
  setInterval(()=>{if(document.visibilityState==='visible'){dingloftPresencePing('heartbeat');checkAccountReview(false)}},DINGLOFT_PRESENCE_INTERVAL);
  addEventListener('online',()=>{dingloftPresencePing('online',true);checkAccountReview(true)});
  addEventListener('pageshow',()=>dingloftPresencePing('pageshow',true));
  addEventListener('popstate',()=>setTimeout(()=>dingloftPresencePing('route',true),0));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){dingloftPresencePing('visible',true);checkAccountReview(true)}
    else fastClose('hidden');
  });
  addEventListener('pagehide',()=>fastClose('pagehide'));
  addEventListener('beforeunload',()=>fastClose('unload'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startPresence,{once:true});else startPresence();
