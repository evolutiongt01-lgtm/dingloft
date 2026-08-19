/* Dingloft Presence v45 · live presence + anonymous ghost session analytics
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
function presenceDevice(){
  const ua=navigator.userAgent||'';
  if(/iPhone|iPod/i.test(ua))return 'iPhone';
  if(/iPad/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return 'iPad';
  if(/Android/i.test(ua))return 'Android';
  if(/Macintosh|Mac OS X/i.test(ua))return 'Mac';
  if(/Windows/i.test(ua))return 'Windows';
  return 'Web';
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
    const payload={
      visitorId:presenceVisitorId(),
      sessionId:presenceSessionId(),
      path,
      title:(document.title||'Dingloft').slice(0,180),
      referrer:(document.referrer||'').slice(0,500),
      device:presenceDevice(),
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

function startPresence(){
  if(isInfrastructurePage()) return;
  dingloftPresencePing('open',true);
  setInterval(()=>{if(document.visibilityState==='visible')dingloftPresencePing('heartbeat')},DINGLOFT_PRESENCE_INTERVAL);
  addEventListener('online',()=>dingloftPresencePing('online',true));
  addEventListener('pageshow',()=>dingloftPresencePing('pageshow',true));
  addEventListener('popstate',()=>setTimeout(()=>dingloftPresencePing('route',true),0));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') dingloftPresencePing('visible',true);
    else fastClose('hidden');
  });
  addEventListener('pagehide',()=>fastClose('pagehide'));
  addEventListener('beforeunload',()=>fastClose('unload'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startPresence,{once:true});else startPresence();
