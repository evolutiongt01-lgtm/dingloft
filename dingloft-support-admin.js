/* Dingloft Support · Admin realtime inbox · v1.8 · Universal Web Push */
import { getApps,getApp,initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth,onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore,collection,doc,limit,onSnapshot,orderBy,query,serverTimestamp,setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { deleteToken,getMessaging,getToken,isSupported as isMessagingSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
const firebaseConfig={apiKey:"AIzaSyAKxQdUM49cVbBaXWJ5DF3s7EaNKlJRGhA",authDomain:"login-dingloft.firebaseapp.com",projectId:"login-dingloft",storageBucket:"login-dingloft.firebasestorage.app",messagingSenderId:"549466738202",appId:"1:549466738202:web:8bf305fe2c753e9d76cba3",measurementId:"G-R9SGZCDN13"};
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const pushApp=getApps().find(x=>x.name==='dingloft-push')||initializeApp(firebaseConfig,'dingloft-push');
const WORKER=String(window.DINGLOFT_WORKER_BASE||"https://autumn-breeze-dfa0.evolutiongt01.workers.dev").replace(/\/$/,"");
const AGENTS={"tepaz2025@gmail.com":{name:"Tony Bac",role:"Asistente Técnico",avatar:"/img/tony-bac.webp"},"evolutiongt01@gmail.com":{name:"Cesar Matzar",role:"Desarrollador Técnico",avatar:"/img/cesar-matzar.webp"},"matzarcesar01@hotmail.com":{name:"Evolution Group",role:"Dirección y Seguridad",avatar:"/img/evolution-group.webp"}};
let user=null,agent=null,chats=[],selectedId="",chatsUnsub=null,msgUnsub=null,presenceUnsub=null,lastTyping=0,typingTimer=null,typingIdle=null,imageUrls=new Map();
let pushRegistration=null,pushSubscription=null,pushConfigured=false,pushBusy=false,pushConfig=null,pushPreparePromise=null,pushMessageBound=false,pushMessaging=null;
const PUSH_NATIVE_MARK='dingloft_support_webpush_v108';
let pendingPushChatId=cleanChatId(new URLSearchParams(location.search).get("supportChat")||"");
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function cleanChatId(v){return String(v||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,180)}
const initials=name=>String(name||"Soporte").trim().split(/\s+/).slice(0,2).map(x=>x.charAt(0)).join("").toUpperCase()||"DS";
function avatarForName(name){for(const a of Object.values(AGENTS))if(a.name===name)return a.avatar||"";return""}
function avatarMarkup(name,extra=""){const src=avatarForName(name);return `<span class="support-agent-avatar ${extra}" aria-hidden="true"><span>${esc(initials(name))}</span>${src?`<img data-support-avatar src="${esc(src)}" alt="">`:""}</span>`}
function hydrateAvatars(root=document){root.querySelectorAll?.("img[data-support-avatar]").forEach(img=>img.addEventListener("error",()=>img.remove(),{once:true}))}
const toDate=v=>v?.toDate?v.toDate():(v?new Date(v):null);const fmt=v=>{const d=toDate(v);return d&&!isNaN(d)?d.toLocaleString("es-GT",{dateStyle:"medium",timeStyle:"short"}):"—"};const age=v=>{const d=toDate(v);if(!d||isNaN(d))return"";const s=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));if(s<60)return"Ahora";if(s<3600)return`Hace ${Math.floor(s/60)} min`;if(s<86400)return`Hace ${Math.floor(s/3600)} h`;return d.toLocaleDateString("es-GT",{day:"2-digit",month:"short"})};
const timestampMs=v=>{const d=toDate(v);return d&&!isNaN(d)?d.getTime():0};
async function api(path,{method="GET",body}={}){if(!user)throw Error("Sesión no válida");const token=await user.getIdToken(false);const r=await fetch(WORKER+path,{method,cache:"no-store",headers:{Authorization:`Bearer ${token}`,...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw Error(d.error||`Error ${r.status}`);return d}
function setPushButton(state,label,title=""){const b=$("supportPushBtn");if(!b)return;b.dataset.state=state||"";b.classList.toggle("active",state==="active");b.classList.toggle("blocked",state==="blocked");b.disabled=state==="busy";b.innerHTML=`<i class="bi ${state==="active"?"bi-bell-fill":state==="blocked"?"bi-bell-slash":"bi-bell"}"></i> <span>${esc(label)}</span>`;b.title=title||label}
async function supportPushConfig(){return api('/admin/support/push/config')}
function isIOSDevice(){const ua=navigator.userAgent||"";return /iPhone|iPad|iPod/i.test(ua)||(navigator.platform==="MacIntel"&&Number(navigator.maxTouchPoints||0)>1)}
function isStandaloneApp(){return window.matchMedia?.('(display-mode: standalone)')?.matches===true||window.navigator.standalone===true}
function platformLabel(){const ua=navigator.userAgent||'';if(isIOSDevice())return'iOS';if(/Android/i.test(ua))return'Android';if(/Mac/i.test(ua))return'macOS';if(/Win/i.test(ua))return'Windows';return'Web'}
function base64UrlBytes(value=''){const s=String(value||'').replace(/-/g,'+').replace(/_/g,'/');const padded=s+'='.repeat((4-s.length%4)%4);const raw=atob(padded);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function sameBytes(a,b){try{const x=a instanceof Uint8Array?a:new Uint8Array(a||0),y=b instanceof Uint8Array?b:new Uint8Array(b||0);if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true}catch(_){return false}}
function validVapidKey(value){try{const bytes=base64UrlBytes(String(value||'').trim());return bytes.length===65&&bytes[0]===4}catch(_){return false}}
async function firebasePushToken(messaging,reg,vapidKey=''){
  const key=String(vapidKey||'').trim();
  if(!validVapidKey(key))throw Error('FCM_VAPID_PUBLIC_KEY_INVALID');
  const options={serviceWorkerRegistration:reg,vapidKey:key};
  try{return await getToken(messaging,options)}catch(error){
    const raw=pushErrorInfo(error).raw;
    if(!/InvalidAccess|applicationServerKey|vapid|push-subscribe/i.test(raw))throw error;
    // A subscription created by an older build/different VAPID key cannot be
    // reused. Remove it, then let Firebase create a clean registration.
    const stale=await reg.pushManager?.getSubscription?.().catch(()=>null);
    if(stale)try{await stale.unsubscribe()}catch(_){}
    return getToken(messaging,options);
  }
}
function pushErrorInfo(error){const code=error?.code??'';const name=String(error?.name||'');const message=String(error?.message||'');return{code,name,message,raw:[name,message,code].filter(v=>String(v).trim()).join(' · ')||String(error||'')}}
function pushFriendlyError(error){const x=pushErrorInfo(error),raw=x.raw;if(/FCM_VAPID_PUBLIC_KEY_INVALID/i.test(raw))return'Configuración pendiente: FCM_VAPID_PUBLIC_KEY no contiene la clave pública Web Push válida de Firebase.';if(/NotAllowedError|permission|denied|blocked/i.test(raw))return'Las notificaciones están bloqueadas para Dingloft. Actívalas en Ajustes → Notificaciones.';if(/AbortError|abort/i.test(raw))return'iPhone no pudo crear la suscripción Web Push. Cierra Dingloft por completo, vuelve a abrirlo desde su icono y toca Activar avisos otra vez.';if(/InvalidAccess|applicationServerKey|vapid/i.test(raw))return`La suscripción anterior usa otra clave Web Push. Se intentó renovarla. Detalle: ${raw}`;if(/not supported|unsupported|PushManager/i.test(raw))return'Este navegador no expone Web Push para esta instalación.';return raw||'No se pudieron activar las notificaciones.'}
async function ensurePushRegistration(){
  if(pushRegistration?.active)return pushRegistration;
  pushRegistration=await navigator.serviceWorker.getRegistration('/').catch(()=>null);
  if(!pushRegistration){try{pushRegistration=await navigator.serviceWorker.ready}catch(_){}}
  if(!pushRegistration)pushRegistration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
  try{await pushRegistration.update()}catch(_){}
  if(pushRegistration.active)return pushRegistration;
  const sw=pushRegistration.installing||pushRegistration.waiting;
  if(sw)await new Promise((resolve,reject)=>{let done=false;const timer=setTimeout(()=>{if(!done){done=true;reject(Error('El servicio de notificaciones tardó demasiado en activarse.'))}},12000);const changed=()=>{if(done)return;if(sw.state==='activated'){done=true;clearTimeout(timer);sw.removeEventListener('statechange',changed);resolve()}else if(sw.state==='redundant'){done=true;clearTimeout(timer);sw.removeEventListener('statechange',changed);reject(Error('El servicio de notificaciones no pudo activarse.'))}};sw.addEventListener('statechange',changed);changed()});
  if(!pushRegistration.active)throw Error('El servicio de notificaciones no quedó activo.');
  return pushRegistration
}
async function getPreparedPush(){
  if(pushConfig&&pushRegistration?.active)return{cfg:pushConfig,reg:pushRegistration};
  if(pushPreparePromise)return pushPreparePromise;
  pushPreparePromise=(async()=>{
    if(isIOSDevice()&&!isStandaloneApp())throw Object.assign(Error('Abre Dingloft desde el icono instalado en tu pantalla de inicio.'),{code:'IOS_STANDALONE_REQUIRED'});
    if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window)||!await isMessagingSupported())throw Error('Firebase Messaging no está disponible en esta instalación.');
    const [cfg,reg]=await Promise.all([supportPushConfig(),ensurePushRegistration()]);
    if(cfg.enabled!==true||!cfg.vapidKey)throw Error('Web Push todavía no está listo en el servidor.');
    if(!validVapidKey(cfg.vapidKey))throw Error('FCM_VAPID_PUBLIC_KEY_INVALID');
    pushMessaging=pushMessaging||getMessaging(pushApp);if(!pushMessaging)throw Error('FIREBASE_MESSAGING_INIT_FAILED');pushConfigured=true;pushConfig=cfg;return{cfg,reg,messaging:pushMessaging};
  })().finally(()=>{pushPreparePromise=null});
  return pushPreparePromise;
}
async function syncExistingSubscription(){
  const{cfg,reg,messaging}=await getPreparedPush();
  const token=await firebasePushToken(messaging,reg,cfg.vapidKey);
  if(!token)return false;
  pushSubscription=token;
  await api('/admin/support/push/register',{method:'POST',body:{token,platform:platformLabel(),userAgent:navigator.userAgent||''}});
  setPushButton('active','Avisos activos','Este dispositivo recibirá alertas de ventas, comentarios, reservas pagadas y soporte. Toca para desactivarlas.');
  return true
}
async function primePushInfrastructure(){
  if(!user)return;
  if(isIOSDevice()&&!isStandaloneApp()){setPushButton('blocked','Abre la app instalada','En iPhone abre Dingloft desde el icono de la pantalla de inicio.');return}
  if(!('Notification'in window)){setPushButton('blocked','No compatible','Este navegador no expone notificaciones Web Push.');return}
  if(Notification.permission==='denied'){setPushButton('blocked','Avisos bloqueados','Activa Dingloft en Ajustes → Notificaciones.');return}
  setPushButton('busy','Preparando avisos…');
  try{
    await getPreparedPush();
    if(Notification.permission==='granted'&&await syncExistingSubscription())return;
    if(!isIOSDevice()&&Notification.permission==='granted'){await registerPushNotifications({ask:false});return}
    setPushButton('ready','Activar avisos','Recibe avisos de ventas, comentarios nuevos y solicitudes de soporte.');
  }catch(e){if(e?.code==='IOS_STANDALONE_REQUIRED')setPushButton('blocked','Abre la app instalada',e.message);else setPushButton('ready','Reintentar avisos',pushFriendlyError(e))}
}
async function registerPushNotifications({ask=false}={}){
  if(pushBusy||!user)return;pushBusy=true;setPushButton('busy','Configurando…');
  try{
    if(isIOSDevice()&&!isStandaloneApp())throw Object.assign(Error('En iPhone abre Dingloft desde el icono instalado en la pantalla de inicio.'),{code:'IOS_STANDALONE_REQUIRED'});
    if(!('Notification'in window)||!('PushManager'in window))throw Error('Web Push no está disponible en este navegador.');
    let permission=Notification.permission;
    if(permission==='default'&&ask)permission=await Notification.requestPermission();
    if(permission==='denied'){setPushButton('blocked','Avisos bloqueados','Activa Dingloft en Ajustes → Notificaciones.');return}
    if(permission!=='granted'){setPushButton('ready','Activar avisos','Toca para permitir las notificaciones.');return}
    const{cfg,reg,messaging}=await getPreparedPush();
    const token=await firebasePushToken(messaging,reg,cfg.vapidKey);
    if(!token)throw Error('Firebase no devolvió un token de notificaciones.');
    pushSubscription=token;
    await api('/admin/support/push/register',{method:'POST',body:{token,platform:platformLabel(),userAgent:navigator.userAgent||'',sendTest:true}});
    try{localStorage.setItem(PUSH_NATIVE_MARK,'1')}catch(_){}
    setPushButton('active','Avisos activos','Este dispositivo recibirá alertas de ventas, comentarios, reservas pagadas y soporte. Toca para desactivarlas.');
  }catch(e){console.warn('Dingloft Web Push',e);if(e?.code==='IOS_STANDALONE_REQUIRED')setPushButton('blocked','Abre la app instalada',e.message);else{setPushButton('ready','Reintentar avisos',pushFriendlyError(e));alert(pushFriendlyError(e))}}
  finally{pushBusy=false}
}
async function disablePushNotifications(){
  if(pushBusy)return;pushBusy=true;setPushButton('busy','Desactivando…');
  try{const token=typeof pushSubscription==='string'?pushSubscription:'';if(token)await api('/admin/support/push/unregister',{method:'POST',body:{token}}).catch(()=>{});if(pushMessaging)try{await deleteToken(pushMessaging)}catch(_){}pushSubscription=null;setPushButton('ready','Activar avisos','Las notificaciones están desactivadas en este dispositivo.')}finally{pushBusy=false}
}
async function togglePushNotifications(){if(pushSubscription||$('supportPushBtn')?.dataset.state==='active')return disablePushNotifications();return registerPushNotifications({ask:true})}
function bindPushMessages(){if(pushMessageBound||!navigator.serviceWorker)return;pushMessageBound=true;navigator.serviceWorker.addEventListener('message',event=>{const msg=event.data||{};if(msg.type!=='DINGLOFT_ADMIN_PUSH'&&msg.type!=='DINGLOFT_SUPPORT_PUSH')return;const data=msg.data||{};if(msg.type==='DINGLOFT_SUPPORT_PUSH'&&data.chatId){pendingPushChatId=cleanChatId(data.chatId);const c=chats.find(x=>x.id===pendingPushChatId);if(c&&document.visibilityState==='visible')openChat(pendingPushChatId);return}if(msg.type==='DINGLOFT_ADMIN_PUSH'&&document.visibilityState==='visible'){try{window.toast?.(`${data.title||'Dingloft'} · ${data.body||'Nueva actividad'}`)}catch(_){}}})}
function consumePendingPushChat(){if(!pendingPushChatId)return;const id=pendingPushChatId;if(!chats.some(c=>c.id===id))return;pendingPushChatId='';openChat(id)}
function badgeUpdate(){const n=chats.reduce((s,c)=>s+Math.max(0,Number(c.unreadAdmin||0)),0);document.querySelectorAll('[data-view="support"]').forEach(b=>{let x=b.querySelector('.support-nav-count');if(!x){x=document.createElement('span');x.className='support-nav-count';b.appendChild(x)}x.textContent=n>99?'99+':String(n);x.style.display=n?'inline-grid':'none'})}
function statusLabel(s){return s==='resolved'?'Resuelto':s==='in_attention'?'En atención':'Abierto'}
function statusClass(s){return s==='resolved'?'resolved':s==='in_attention'?'attention':'open'}
function renderList(){const box=$("supportConversationList");if(!box)return;const term=String($("supportSearch")?.value||"").toLowerCase().trim(),filter=$("supportFilter")?.value||"";const list=chats.filter(c=>(!filter||c.status===filter)&&(!term||`${c.customerName||''} ${c.customerEmail||''} ${c.lastMessage||''} ${c.relatedProductName||''}`.toLowerCase().includes(term)));$("supportOpenCount").textContent=chats.filter(c=>c.status==='open').length;$("supportAttentionCount").textContent=chats.filter(c=>c.status==='in_attention').length;$("supportResolvedCount").textContent=chats.filter(c=>c.status==='resolved').length;box.innerHTML=list.length?list.map(c=>`<button class="support-conversation ${selectedId===c.id?'active':''}" data-chat="${esc(c.id)}"><span class="support-avatar">${esc((c.customerName||c.customerEmail||'C').charAt(0).toUpperCase())}</span><span class="support-conv-copy"><b>${esc(c.customerName||c.customerEmail||'Cliente')}</b><small>${esc(c.relatedProductName||c.lastMessage||'Soporte Dingloft')}</small><em>${age(c.lastMessageAt||c.updatedAt)}</em></span><span class="support-conv-side"><span class="support-state ${statusClass(c.status)}">${statusLabel(c.status)}</span>${Number(c.unreadAdmin||0)>0?`<strong>${Math.min(99,Number(c.unreadAdmin))}</strong>`:''}</span></button>`).join(''):'<div class="support-admin-empty">No hay conversaciones con este filtro.</div>';box.querySelectorAll('[data-chat]').forEach(b=>b.addEventListener('click',()=>openChat(b.dataset.chat)))}
function renderHeader(c){if(!c){$("supportChatHeader").innerHTML='<div class="support-detail-empty"><i class="bi bi-chat-left-text"></i><b>Selecciona una conversación</b><span>Los mensajes de clientes aparecerán aquí en tiempo real.</span></div>';$("supportMessages").innerHTML='';$("supportComposer").classList.add('disabled');return}$("supportComposer").classList.remove('disabled');const deletion=c.status==='resolved'&&c.deleteAfter?`<span class="support-delete-date">Eliminación automática: ${fmt(c.deleteAfter)}</span>`:'';const feedbackState=c.feedbackStatus==='submitted'?`<span class="support-assigned"><i class="bi bi-star-fill" style="color:#ffd56b"></i> Experiencia ${Number(c.feedbackRating||0)}/5</span>`:c.feedbackStatus==='pending'?'<span class="support-assigned"><i class="bi bi-envelope-check"></i> Experiencia solicitada</span>':'';const presenceMs=timestampMs(c.customerPresenceUpdatedAt||c.customerLastSeenAt),online=c.customerPresenceOnline===true&&presenceMs&&Date.now()-presenceMs<90000;const activity=`<div class="support-meta"><span><i class="bi bi-circle-fill" style="color:${online?'#55dfa2':'#7d8998'}"></i> ${online?'En línea':'Última conexión: '+fmt(c.customerLastSeenAt)}</span><span><i class="bi bi-eye"></i> Leyó: ${c.customerLastReadAt?fmt(c.customerLastReadAt):'Aún no'}</span>${c.customerLastPage?`<span title="${esc(c.customerLastPage)}"><i class="bi bi-compass"></i> ${esc(c.customerLastPageTitle||c.customerLastPage)}</span>`:''}</div>`;$("supportChatHeader").innerHTML=`<div class="support-customer-head"><span class="support-avatar big">${esc((c.customerName||c.customerEmail||'C').charAt(0).toUpperCase())}</span><div><b>${esc(c.customerName||'Cliente Dingloft')}</b><small>${esc(c.customerEmail||'')}</small><div class="support-meta">${c.relatedProductName?`<span><i class="bi bi-box"></i> ${esc(c.relatedProductName)}</span>`:''}${c.orderNumber?`<span><i class="bi bi-receipt"></i> ${esc(c.orderNumber)}</span>`:''}</div>${activity}</div></div><div class="support-head-actions"><span class="support-state ${statusClass(c.status)}">${statusLabel(c.status)}</span>${c.assignedAgentName?`<span class="support-assigned support-assigned-agent">${avatarMarkup(c.assignedAgentName,"mini")}<span>${esc(c.assignedAgentName)} · ${esc(c.assignedAgentRole||'Soporte')}</span></span>`:''}${feedbackState}${deletion}<div><button class="btn small" id="supportResolveBtn"><i class="bi ${c.status==='resolved'?'bi-arrow-counterclockwise':'bi-check2-circle'}"></i> ${c.status==='resolved'?'Reabrir':'Finalizar chat'}</button><button class="btn small danger" id="supportDeleteBtn"><i class="bi bi-trash3"></i></button></div></div>`;hydrateAvatars($("supportChatHeader"));$("supportResolveBtn").onclick=()=>setStatus(c.status==='resolved'?'open':'resolved');$("supportDeleteBtn").onclick=deleteChat}
async function openChat(id){selectedId=id;renderList();const c=chats.find(x=>x.id===id);renderHeader(c);msgUnsub?.();presenceUnsub?.();msgUnsub=onSnapshot(query(collection(db,'supportChats',id,'messages'),orderBy('createdAt','asc'),limit(300)),s=>renderMessages(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{$('supportMessages').innerHTML='<div class="support-admin-empty">No se pudieron cargar los mensajes.</div>'});presenceUnsub=onSnapshot(doc(db,'supportChats',id,'presence','customer'),s=>{const d=s.exists()?s.data():{};const recent=Date.now()-(d.updatedAt?.toMillis?.()||0)<7000;$('supportCustomerTyping').innerHTML=d.typing===true&&recent?`<i class="bi bi-pencil"></i> ${esc(c?.customerName||'Cliente')} está escribiendo… <span>${esc(d.draft||'')}</span>`:''},()=>{});api('/admin/support/claim',{method:'POST',body:{chatId:id}}).catch(()=>{});api('/admin/support/read',{method:'POST',body:{chatId:id}}).catch(()=>{})}
function renderMessages(messages){const box=$('supportMessages');if(!box)return;box.innerHTML=messages.length?messages.map(m=>{const admin=m.senderType==='admin';const name=admin?(m.senderName||'Soporte Dingloft'):(chats.find(c=>c.id===selectedId)?.customerName||'Cliente');const imgs=(Array.isArray(m.attachments)?m.attachments:[]).map((a,i)=>`<img data-support-key="${esc(a.key||'')}" alt="Captura ${i+1}">`).join('');const body=`<div class="support-admin-msg-body"><div class="support-admin-who">${admin?`${esc(name)} · ${esc(m.senderRole||'')}`:esc(name)}</div><div class="support-admin-bubble">${imgs?`<div class="support-admin-images">${imgs}</div>`:''}${m.text?esc(m.text).replace(/\n/g,'<br>'):''}</div><small>${fmt(m.createdAt)}</small></div>`;return`<div class="support-admin-msg ${admin?'admin':'customer'}"><div class="support-admin-msg-row">${admin?`${body}${avatarMarkup(name)}`:body}</div></div>`}).join(''):'<div class="support-admin-empty">Todavía no hay mensajes.</div>';hydrateAvatars(box);box.querySelectorAll('img[data-support-key]').forEach(loadImage);requestAnimationFrame(()=>box.scrollTop=box.scrollHeight);api('/admin/support/read',{method:'POST',body:{chatId:selectedId}}).catch(()=>{})}
async function loadImage(img){const key=img.dataset.supportKey;if(!key)return;if(imageUrls.has(key)){img.src=imageUrls.get(key);return}try{const token=await user.getIdToken(false),r=await fetch(`${WORKER}/support/image?key=${encodeURIComponent(key)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});if(!r.ok)throw 0;const blob=await r.blob(),url=URL.createObjectURL(blob);imageUrls.set(key,url);img.src=url;img.onclick=()=>window.open(url,'_blank','noopener')}catch(_){img.alt='Imagen no disponible'}}
async function send(){const input=$('supportReply');const text=String(input.value||'').trim().slice(0,2000);if(!selectedId||!text)return;const btn=$('supportSend');btn.disabled=true;try{await api('/admin/support/message',{method:'POST',body:{chatId:selectedId,text}});input.value='';input.style.height='42px';await setTyping(false,'')}catch(e){window.alert(e.message||'No se pudo enviar')}finally{btn.disabled=false}}
async function setStatus(status){if(!selectedId)return;try{await api('/admin/support/status',{method:'POST',body:{chatId:selectedId,status}})}catch(e){alert(e.message)}}
async function deleteChat(){if(!selectedId)return;const c=chats.find(x=>x.id===selectedId);if(!confirm(`¿Eliminar definitivamente la conversación de ${c?.customerName||c?.customerEmail||'este cliente'}? También se borrarán sus imágenes de R2.`))return;try{await api('/admin/support/delete',{method:'POST',body:{chatId:selectedId}});selectedId='';msgUnsub?.();presenceUnsub?.();renderHeader(null)}catch(e){alert(e.message)}}
function typingChanged(draft){clearTimeout(typingIdle);typingIdle=setTimeout(()=>setTyping(false,''),2400);const wait=Math.max(0,700-(Date.now()-lastTyping));clearTimeout(typingTimer);typingTimer=setTimeout(()=>setTyping(true,String(draft||'').slice(0,500)),wait)}
async function setTyping(typing,draft){if(!selectedId||!agent)return;lastTyping=Date.now();try{await setDoc(doc(db,'supportChats',selectedId,'presence','admin'),{typing:typing===true,draft:'',agentName:agent.name,agentRole:agent.role,updatedAt:serverTimestamp()},{merge:true})}catch(_){}}
function bind(){bindPushMessages();const input=$('supportReply');input?.addEventListener('input',()=>{input.style.height='42px';input.style.height=Math.min(120,input.scrollHeight)+'px';typingChanged(input.value)});input?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});input?.addEventListener('blur',()=>setTyping(false,''));$('supportSend')?.addEventListener('click',send);$('supportSearch')?.addEventListener('input',renderList);$('supportFilter')?.addEventListener('change',renderList);$('supportRefresh')?.addEventListener('click',()=>api('/admin/support/cleanup',{method:'POST',body:{}}).catch(()=>{}));$('supportPushBtn')?.addEventListener('click',togglePushNotifications)}
function start(){bind();api('/admin/support/cleanup',{method:'POST',body:{}}).catch(()=>{});primePushInfrastructure().catch(()=>{});chatsUnsub=onSnapshot(query(collection(db,'supportChats'),orderBy('updatedAt','desc'),limit(250)),s=>{chats=s.docs.map(d=>({id:d.id,...d.data()}));badgeUpdate();renderList();consumePendingPushChat();if(selectedId){const c=chats.find(x=>x.id===selectedId);if(c)renderHeader(c);else{selectedId='';renderHeader(null)}}},e=>{console.warn('Support chats',e);$('supportConversationList').innerHTML='<div class="support-admin-empty">Firestore rechazó la lectura. Revisa las Rules de soporte.</div>'})}
function stop(){chatsUnsub?.();msgUnsub?.();presenceUnsub?.();pushPreparePromise=null;pushConfig=null;pushConfigured=false;pushRegistration=null;pushSubscription=null;chatsUnsub=msgUnsub=presenceUnsub=null;clearTimeout(typingTimer);clearTimeout(typingIdle);for(const u of imageUrls.values())URL.revokeObjectURL(u);imageUrls.clear()}
onAuthStateChanged(auth,u=>{stop();user=u;agent=AGENTS[String(u?.email||'').toLowerCase()]||null;if(u&&agent)start()});
