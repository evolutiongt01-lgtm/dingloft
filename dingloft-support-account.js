/* Dingloft Support · Customer realtime chat · v1.2 · Premium Support + Experiences */
import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyAKxQdUM49cVbBaXWJ5DF3s7EaNKlJRGhA",
  authDomain:"login-dingloft.firebaseapp.com",
  projectId:"login-dingloft",
  storageBucket:"login-dingloft.firebasestorage.app",
  messagingSenderId:"549466738202",
  appId:"1:549466738202:web:8bf305fe2c753e9d76cba3",
  measurementId:"G-R9SGZCDN13"
};
const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);
const WORKER=String(window.DINGLOFT_WORKER_BASE||"https://autumn-breeze-dfa0.evolutiongt01.workers.dev").replace(/\/$/,"");
const MAX_IMAGES=3,MAX_IMAGE_BYTES=5*1024*1024,MAX_TEXT=2000,TYPING_THROTTLE=700,TYPING_IDLE=2400;
const SUPPORT_AVATARS={"Tony Bac":"/img/tony-bac.webp","Cesar Matzar":"/img/cesar-matzar.webp"};
const PARAMS=new URLSearchParams(location.search);
const AUTO_OPEN=PARAMS.get("support")==="1"||PARAMS.get("supportFeedback")==="1";

let user=null,supportData=null,chatState={},chatExists=false,chatUnsub=null,msgUnsub=null,adminPresenceUnsub=null;
let lastTypingWrite=0,typingTimer=null,typingIdleTimer=null,pendingImages=[],imageUrls=new Map();
let feedbackRating=0,experiencesLoaded=false,experiencesLoading=false;

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const time=v=>{if(!v)return"";const d=v?.toDate?v.toDate():new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit"})};
const dateLabel=v=>{if(!v)return"";const d=v?.toDate?v.toDate():new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleDateString("es-GT",{day:"numeric",month:"short",year:"numeric"})};
const initials=name=>String(name||"Soporte").trim().split(/\s+/).slice(0,2).map(x=>x.charAt(0)).join("").toUpperCase()||"DS";
function avatarMarkup(name,extra=""){const src=SUPPORT_AVATARS[String(name||"")]||"";return `<span class="dl-support-agent-avatar ${extra}" aria-hidden="true"><span>${esc(initials(name))}</span>${src?`<img data-support-avatar src="${esc(src)}" alt="">`:""}</span>`}
function hydrateAvatars(root=document){root.querySelectorAll?.("img[data-support-avatar]").forEach(img=>img.addEventListener("error",()=>img.remove(),{once:true}))}

async function api(path,{method="GET",body,raw,headers={}}={}){
  if(!user)throw new Error("Sesión no válida");
  const token=await user.getIdToken(false);
  const opts={method,cache:"no-store",headers:{Authorization:`Bearer ${token}`,...headers}};
  if(body!==undefined){opts.headers["content-type"]="application/json";opts.body=JSON.stringify(body)}
  if(raw!==undefined)opts.body=raw;
  const r=await fetch(WORKER+path,opts);
  const type=r.headers.get("content-type")||"";
  const data=type.includes("application/json")?await r.json().catch(()=>({})):null;
  if(!r.ok||(data&&data.ok===false))throw new Error(data?.error||`Error ${r.status}`);
  return data??r;
}

function inject(){
  if(document.getElementById("dlSupportRoot"))return;
  const style=document.createElement("style");
  style.id="dlSupportStyle";
  style.textContent=`
  .dl-support-root{position:relative;z-index:95;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .dl-support-launch{position:fixed;right:24px;bottom:24px;width:54px;height:54px;border-radius:17px;border:1px solid rgba(103,221,255,.24);background:linear-gradient(145deg,rgba(18,28,39,.98),rgba(5,10,16,.98));color:#dff8ff;display:none;place-items:center;font-size:20px;box-shadow:0 16px 44px rgba(0,0,0,.45),inset 0 1px rgba(255,255,255,.06);z-index:995;transition:.2s;cursor:pointer}
  .dl-support-launch:hover{transform:translateY(-2px);border-color:rgba(103,221,255,.5)}.dl-support-launch.show{display:grid}
  .dl-support-badge{position:absolute;right:-4px;top:-4px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#53ddff;color:#031018;border:2px solid #071018;display:none;place-items:center;font-size:9px;font-weight:900}.dl-support-badge.show{display:grid}
  .dl-support-panel{position:fixed;right:24px;bottom:88px;width:min(405px,calc(100vw - 32px));height:min(650px,calc(100vh - 125px));border:1px solid rgba(141,181,218,.17);background:rgba(7,12,18,.985);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border-radius:24px;box-shadow:0 25px 80px rgba(0,0,0,.58);z-index:994;display:none;grid-template-rows:auto auto 1fr;overflow:hidden}.dl-support-panel.open{display:grid}
  .dl-support-head{padding:15px 16px 12px;display:flex;align-items:center;gap:11px;border-bottom:1px solid rgba(255,255,255,.055)}
  .dl-support-headcopy{min-width:0;flex:1}.dl-support-headcopy b{display:block;color:#eef9ff;font-size:13px}.dl-support-headcopy small{display:block;color:#72869a;font-size:9px;margin-top:3px}
  .dl-support-close{width:34px;height:34px;border:0;border-radius:11px;background:rgba(255,255,255,.035);color:#8fa1b2;cursor:pointer}
  .dl-support-team-avatars{width:46px;height:36px;position:relative;flex:0 0 46px}.dl-support-team-avatars .dl-support-agent-avatar{position:absolute;top:1px;width:34px;height:34px}.dl-support-team-avatars .dl-support-agent-avatar:first-child{left:0}.dl-support-team-avatars .dl-support-agent-avatar:last-child{right:0;z-index:2}
  .dl-support-agent-avatar{width:30px;height:30px;border-radius:50%;position:relative;display:grid;place-items:center;flex:0 0 auto;overflow:hidden;background:linear-gradient(145deg,#182431,#0b1119);border:1px solid rgba(107,222,255,.28);box-shadow:0 0 0 2px #071018;color:#9eeeff;font-size:8px;font-weight:900;letter-spacing:.03em}.dl-support-agent-avatar>span{position:relative;z-index:1}.dl-support-agent-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;background:#0b1119}
  .dl-support-tabs{padding:8px 11px;display:grid;grid-template-columns:1fr 1fr;gap:5px;border-bottom:1px solid rgba(255,255,255,.05);background:#080d13}.dl-support-tab{height:33px;border:1px solid transparent;border-radius:10px;background:transparent;color:#74889b;font-size:9px;font-weight:800;cursor:pointer}.dl-support-tab.active{color:#e8f9ff;background:rgba(82,218,255,.075);border-color:rgba(82,218,255,.13)}
  .dl-support-view{min-height:0;display:none}.dl-support-view.active{display:grid}.dl-support-chat-view{grid-template-rows:auto minmax(0,1fr) auto}.dl-support-experience-view{overflow:auto;padding:14px;align-content:start;gap:12px}
  .dl-support-context-wrap{border-bottom:1px solid rgba(255,255,255,.05)}.dl-support-context{padding:8px 12px 7px;display:flex;gap:8px;align-items:center}.dl-support-context select{width:100%;min-width:0;background:#0a1119;border:1px solid rgba(151,188,220,.13);color:#c9d8e5;border-radius:11px;padding:9px 10px;font-size:10px;outline:0}.dl-support-status-note{padding:0 12px 8px;color:#71869a;font-size:8px;text-align:center}
  .dl-support-feedback{display:none;margin:2px 10px 10px;padding:13px;border-radius:15px;background:linear-gradient(145deg,rgba(83,221,255,.07),rgba(255,255,255,.018));border:1px solid rgba(83,221,255,.14)}.dl-support-feedback.show{display:block}.dl-support-feedback b{display:block;color:#e9f8ff;font-size:11px}.dl-support-feedback p{margin:5px 0 10px;color:#7d91a4;font-size:9px;line-height:1.5}.dl-support-stars{display:flex;gap:4px;margin-bottom:9px}.dl-support-star{width:31px;height:31px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#0a1118;color:#536679;font-size:15px;cursor:pointer}.dl-support-star.active{color:#ffd56b;border-color:rgba(255,213,107,.25);background:rgba(255,213,107,.055)}.dl-support-feedback textarea{width:100%;min-height:68px;max-height:100px;resize:vertical;box-sizing:border-box;border:1px solid rgba(255,255,255,.09);border-radius:11px;background:#091018;color:#e8f3f9;padding:9px;font:10px/1.45 Inter,system-ui,sans-serif;outline:0}.dl-support-feedback button.dl-feedback-submit{width:100%;height:36px;margin-top:8px;border-radius:10px;border:1px solid #dff8ff;background:#dff8ff;color:#061018;font-size:9px;font-weight:900;cursor:pointer}.dl-support-feedback button:disabled{opacity:.45}.dl-feedback-thanks{display:flex;align-items:center;gap:9px;color:#8ba1b4;font-size:9px;line-height:1.45}.dl-feedback-thanks i{font-size:17px;color:#73e6ff}
  .dl-support-messages{overflow:auto;padding:14px 13px 12px;display:flex;flex-direction:column;gap:11px;-webkit-overflow-scrolling:touch}.dl-support-empty{margin:auto;text-align:center;max-width:245px;color:#778a9c;font-size:10px;line-height:1.55}.dl-support-empty i{display:grid;width:46px;height:46px;margin:0 auto 10px;place-items:center;border-radius:15px;background:rgba(83,221,255,.06);border:1px solid rgba(83,221,255,.12);color:#6ee5ff;font-size:18px}
  .dl-support-msg{max-width:84%;display:grid;gap:4px}.dl-support-msg.customer{align-self:flex-end}.dl-support-msg.admin{align-self:flex-start}.dl-support-msg-row{display:flex;align-items:flex-end;gap:8px;min-width:0}.dl-support-msg.customer .dl-support-msg-row{justify-content:flex-end}.dl-support-msg-body{display:grid;gap:4px;min-width:0}.dl-support-msg.admin .dl-support-msg-body{max-width:calc(100% - 38px)}
  .dl-support-who{font-size:8px;color:#788c9e;padding:0 4px}.dl-support-msg.customer .dl-support-who{text-align:right}.dl-support-bubble{padding:9px 11px;border-radius:15px;font-size:11px;line-height:1.45;word-break:break-word}.dl-support-msg.customer .dl-support-bubble{background:#dff8ff;color:#071018;border-bottom-right-radius:5px}.dl-support-msg.admin .dl-support-bubble{background:#111b25;color:#e9f3fa;border:1px solid rgba(255,255,255,.06);border-bottom-left-radius:5px}.dl-support-time{font-size:7px;color:#63778a;padding:0 4px}.dl-support-msg.customer .dl-support-time{text-align:right}
  .dl-support-images{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-bottom:7px}.dl-support-images img{display:block;width:100%;aspect-ratio:1.2;object-fit:cover;border-radius:10px;background:#080d13;cursor:zoom-in}
  .dl-support-typing{min-height:19px;padding:0 15px 5px;color:#70dff7;font-size:9px}.dl-support-compose{border-top:1px solid rgba(255,255,255,.06);padding:9px 11px 11px;background:#080d13}.dl-support-preview{display:none;gap:6px;margin-bottom:8px;overflow:auto}.dl-support-preview.show{display:flex}.dl-support-preview-item{position:relative;flex:0 0 58px;height:58px}.dl-support-preview-item img{width:100%;height:100%;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.08)}.dl-support-preview-item button{position:absolute;right:-4px;top:-4px;width:20px;height:20px;border-radius:50%;border:1px solid #283744;background:#091018;color:#fff;font-size:11px}
  .dl-support-row{display:grid;grid-template-columns:40px minmax(0,1fr) 42px;gap:7px;align-items:end}.dl-support-attach,.dl-support-send{height:40px;border-radius:12px;border:1px solid rgba(141,181,218,.14);background:#0e1720;color:#9fb4c5;cursor:pointer}.dl-support-send{background:#dff8ff;color:#051017;border-color:#dff8ff}.dl-support-send:disabled,.dl-support-attach:disabled{opacity:.4}.dl-support-input{width:100%;min-height:40px;max-height:105px;resize:none;overflow:auto;background:#0d151e;border:1px solid rgba(141,181,218,.13);border-radius:13px;color:#eef7fc;padding:10px 11px;outline:0;font:11px/1.4 Inter,system-ui,sans-serif}.dl-support-input:focus{border-color:rgba(83,221,255,.32)}.dl-support-foot{margin-top:6px;color:#566a7c;font-size:7.5px;text-align:center}.dl-support-file{display:none}
  .dl-exp-hero{padding:15px;border-radius:17px;background:linear-gradient(145deg,rgba(82,218,255,.075),rgba(255,255,255,.018));border:1px solid rgba(82,218,255,.13)}.dl-exp-hero small{display:block;color:#70dff7;font-size:8px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.dl-exp-score{display:flex;align-items:end;gap:9px;margin-top:7px}.dl-exp-score b{font-size:26px;color:#f2fbff;letter-spacing:-.04em}.dl-exp-score span{color:#ffd56b;font-size:12px}.dl-exp-hero p{margin:6px 0 0;color:#758a9e;font-size:9px;line-height:1.45}
  .dl-exp-list{display:grid;gap:9px}.dl-exp-card{padding:12px;border:1px solid rgba(255,255,255,.065);border-radius:14px;background:#0a1017}.dl-exp-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.dl-exp-name{font-size:10px;font-weight:850;color:#eaf5fb}.dl-exp-verified{font-size:7px;color:#72dff8;border:1px solid rgba(83,221,255,.16);padding:3px 5px;border-radius:999px}.dl-exp-stars{color:#ffd56b;font-size:9px;letter-spacing:1px;margin-top:5px}.dl-exp-comment{margin:8px 0 0;color:#a5b5c3;font-size:9.5px;line-height:1.55}.dl-exp-meta{margin-top:8px;color:#586d80;font-size:7.5px;display:flex;gap:7px;flex-wrap:wrap}.dl-exp-demo{color:#d6b56a;border:1px solid rgba(255,210,103,.2);padding:2px 5px;border-radius:999px}
  @media(max-width:700px){.dl-support-launch{right:13px;bottom:calc(92px + env(safe-area-inset-bottom,0px));width:52px;height:52px;border-radius:16px}.dl-support-panel{right:8px;left:8px;bottom:calc(151px + env(safe-area-inset-bottom,0px));width:auto;height:min(590px,calc(100vh - 235px));border-radius:22px}}
  `;
  document.head.appendChild(style);

  const root=document.createElement("div");
  root.id="dlSupportRoot";
  root.className="dl-support-root";
  root.innerHTML=`
    <button class="dl-support-launch" id="dlSupportLaunch" aria-label="Abrir soporte">
      <i class="bi bi-chat-dots"></i><span class="dl-support-badge" id="dlSupportBadge">0</span>
    </button>
    <section class="dl-support-panel" id="dlSupportPanel" aria-label="Soporte Dingloft">
      <div class="dl-support-head">
        <div class="dl-support-team-avatars">${avatarMarkup("Tony Bac")}${avatarMarkup("Cesar Matzar")}</div>
        <div class="dl-support-headcopy"><b>Soporte Dingloft</b><small>Tony Bac · Cesar Matzar</small></div>
        <button class="dl-support-close" id="dlSupportClose" aria-label="Cerrar soporte"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="dl-support-tabs" role="tablist">
        <button class="dl-support-tab active" id="dlSupportTabChat" data-support-tab="chat" type="button">Conversación</button>
        <button class="dl-support-tab" id="dlSupportTabExperiences" data-support-tab="experiences" type="button">Experiencias</button>
      </div>
      <div class="dl-support-view dl-support-chat-view active" id="dlSupportViewChat">
        <div class="dl-support-context-wrap">
          <div class="dl-support-context"><select id="dlSupportProduct" aria-label="Compra relacionada"><option value="">Selecciona una compra (opcional)</option></select></div>
          <div class="dl-support-status-note" id="dlSupportStatusNote">Tu conversación queda vinculada a tu cuenta Dingloft.</div>
          <div class="dl-support-feedback" id="dlSupportFeedback"></div>
        </div>
        <div class="dl-support-messages" id="dlSupportMessages">
          <div class="dl-support-empty"><i class="bi bi-chat-heart"></i><b style="display:block;color:#dbeaf4;margin-bottom:5px">¿En qué podemos ayudarte?</b>Cuéntanos qué ocurre con tu compra. Puedes adjuntar hasta 3 capturas.</div>
        </div>
        <div>
          <div class="dl-support-typing" id="dlSupportTyping"></div>
          <div class="dl-support-compose">
            <div class="dl-support-preview" id="dlSupportPreview"></div>
            <div class="dl-support-row">
              <button class="dl-support-attach" id="dlSupportAttach" aria-label="Adjuntar imagen"><i class="bi bi-image"></i></button>
              <textarea class="dl-support-input" id="dlSupportInput" maxlength="2000" placeholder="Escribe tu mensaje…"></textarea>
              <button class="dl-support-send" id="dlSupportSend" aria-label="Enviar"><i class="bi bi-arrow-up"></i></button>
            </div>
            <input class="dl-support-file" id="dlSupportFile" type="file" accept="image/jpeg,image/png,image/webp" multiple>
            <div class="dl-support-foot">Soporte privado para clientes Dingloft · Capturas protegidas</div>
          </div>
        </div>
      </div>
      <div class="dl-support-view dl-support-experience-view" id="dlSupportViewExperiences">
        <div class="dl-exp-hero" id="dlExperienceHero"><small>Experiencias verificadas</small><div class="dl-exp-score"><b>—</b><span>★★★★★</span></div><p>Opiniones enviadas por clientes después de finalizar una conversación de soporte.</p></div>
        <div class="dl-exp-list" id="dlExperienceList"><div class="dl-support-empty">Cargando experiencias…</div></div>
      </div>
    </section>`;
  document.body.appendChild(root);
  hydrateAvatars(root);

  document.getElementById("dlSupportLaunch").addEventListener("click",()=>togglePanel(true));
  document.getElementById("dlSupportClose").addEventListener("click",()=>togglePanel(false));
  document.getElementById("dlSupportAttach").addEventListener("click",()=>document.getElementById("dlSupportFile").click());
  document.getElementById("dlSupportFile").addEventListener("change",handleFiles);
  document.getElementById("dlSupportSend").addEventListener("click",sendMessage);
  root.querySelectorAll("[data-support-tab]").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.supportTab)));
  const input=document.getElementById("dlSupportInput");
  input.addEventListener("input",()=>{autoSize(input);typingChanged(input.value)});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}});
  input.addEventListener("blur",()=>setTyping(false,""));
}

function autoSize(el){el.style.height="40px";el.style.height=`${Math.min(105,Math.max(40,el.scrollHeight))}px`}
function selectedContext(){const sel=document.getElementById("dlSupportProduct");return supportData?.contexts?.find(x=>x.key===sel?.value)||null}
function fillContexts(){
  const sel=document.getElementById("dlSupportProduct");if(!sel)return;
  sel.innerHTML='<option value="">Selecciona una compra (opcional)</option>';
  for(const c of supportData?.contexts||[]){const o=document.createElement("option");o.value=c.key;o.textContent=`${c.productName} · ${c.orderNumber}`;sel.appendChild(o)}
}
function togglePanel(open){
  const p=document.getElementById("dlSupportPanel");if(!p)return;
  p.classList.toggle("open",open);
  if(open){startConversationListeners();markRead();if(PARAMS.get("supportFeedback")==="1")switchTab("chat");setTimeout(()=>document.getElementById("dlSupportInput")?.focus(),100)}
  else{stopMessageListeners();setTyping(false,"")}
}
function switchTab(tab){
  const experiences=tab==="experiences";
  document.getElementById("dlSupportTabChat")?.classList.toggle("active",!experiences);
  document.getElementById("dlSupportTabExperiences")?.classList.toggle("active",experiences);
  document.getElementById("dlSupportViewChat")?.classList.toggle("active",!experiences);
  document.getElementById("dlSupportViewExperiences")?.classList.toggle("active",experiences);
  if(experiences)loadExperiences();
  else{startConversationListeners();markRead()}
}

function startBaseListeners(){
  chatUnsub?.();
  chatUnsub=onSnapshot(doc(db,"supportChats",user.uid),snap=>{
    chatExists=snap.exists();
    chatState=chatExists?snap.data():{};
    const n=Math.max(0,Number(chatState.unreadCustomer||0));
    const badge=document.getElementById("dlSupportBadge");
    if(badge){badge.textContent=n>99?"99+":String(n);badge.classList.toggle("show",n>0)}
    const note=document.getElementById("dlSupportStatusNote");
    if(note){
      if(chatState.status==="resolved")note.textContent="Conversación finalizada. Puedes volver a escribir si necesitas retomar el caso.";
      else if(chatState.assignedAgentName)note.textContent=`${chatState.assignedAgentName} · ${chatState.assignedAgentRole||"Soporte Dingloft"}`;
      else note.textContent="Tu conversación queda vinculada a tu cuenta Dingloft.";
    }
    renderFeedback();
  },()=>{});

  adminPresenceUnsub?.();
  adminPresenceUnsub=onSnapshot(doc(db,"supportChats",user.uid,"presence","admin"),snap=>{
    const d=snap.exists()?snap.data():{};
    const age=Date.now()-(d.updatedAt?.toMillis?.()||0);
    const el=document.getElementById("dlSupportTyping");
    if(el)el.textContent=d.typing===true&&age<7000?`${d.agentName||"Soporte Dingloft"} está escribiendo…`:"";
  },()=>{});
}

function startConversationListeners(){
  if(msgUnsub)return;
  const q=query(collection(db,"supportChats",user.uid,"messages"),orderBy("createdAt","asc"),limit(250));
  msgUnsub=onSnapshot(q,s=>renderMessages(s.docs.map(x=>({id:x.id,...x.data()}))),()=>{
    const box=document.getElementById("dlSupportMessages");
    if(box)box.innerHTML='<div class="dl-support-empty">No pudimos cargar la conversación. Intenta nuevamente.</div>';
  });
}
function stopMessageListeners(){msgUnsub?.();msgUnsub=null}

function renderMessages(messages){
  const box=document.getElementById("dlSupportMessages");if(!box)return;
  if(!messages.length){
    box.innerHTML='<div class="dl-support-empty"><i class="bi bi-chat-heart"></i><b style="display:block;color:#dbeaf4;margin-bottom:5px">¿En qué podemos ayudarte?</b>Cuéntanos qué ocurre con tu compra. Puedes adjuntar hasta 3 capturas.</div>';
    return;
  }
  box.innerHTML=messages.map(m=>{
    const admin=m.senderType==="admin";
    const name=m.senderName||"Soporte Dingloft";
    const who=admin?`${esc(name)}${m.senderRole?` · ${esc(m.senderRole)}`:""}`:"Tú";
    const imgs=(Array.isArray(m.attachments)?m.attachments:[]).map((a,i)=>`<img data-support-key="${esc(a.key||"")}" alt="Captura adjunta ${i+1}">`).join("");
    const body=`<div class="dl-support-msg-body"><div class="dl-support-who">${who}</div><div class="dl-support-bubble">${imgs?`<div class="dl-support-images">${imgs}</div>`:""}${m.text?esc(m.text).replace(/\n/g,"<br>"):""}</div><div class="dl-support-time">${time(m.createdAt)}</div></div>`;
    return`<div class="dl-support-msg ${admin?"admin":"customer"}"><div class="dl-support-msg-row">${admin?avatarMarkup(name):""}${body}</div></div>`;
  }).join("");
  hydrateAvatars(box);
  box.querySelectorAll("img[data-support-key]").forEach(loadImage);
  requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight});
  markRead();
}
async function loadImage(img){
  const key=img.dataset.supportKey;if(!key)return;
  if(imageUrls.has(key)){img.src=imageUrls.get(key);return}
  try{
    const token=await user.getIdToken(false);
    const r=await fetch(`${WORKER}/support/image?key=${encodeURIComponent(key)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    if(!r.ok)throw 0;
    const blob=await r.blob(),url=URL.createObjectURL(blob);
    imageUrls.set(key,url);img.src=url;
    img.addEventListener("click",()=>window.open(url,"_blank","noopener"));
  }catch(_){img.alt="Imagen no disponible"}
}

function handleFiles(e){
  const files=[...(e.target.files||[])];
  for(const file of files){
    if(pendingImages.length>=MAX_IMAGES)break;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){feedback("Solo se permiten JPG, PNG o WebP.");continue}
    if(file.size>MAX_IMAGE_BYTES){feedback("Cada imagen debe pesar máximo 5 MB.");continue}
    pendingImages.push({file,url:URL.createObjectURL(file)});
  }
  e.target.value="";
  renderPreviews();
}
function renderPreviews(){
  const box=document.getElementById("dlSupportPreview");
  box.classList.toggle("show",pendingImages.length>0);
  box.innerHTML=pendingImages.map((x,i)=>`<div class="dl-support-preview-item"><img src="${x.url}" alt="Vista previa"><button type="button" data-remove="${i}" aria-label="Quitar imagen">×</button></div>`).join("");
  box.querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>{
    const i=Number(b.dataset.remove);URL.revokeObjectURL(pendingImages[i]?.url||"");pendingImages.splice(i,1);renderPreviews()
  }))
}
async function uploadImage(file){
  const token=await user.getIdToken(false);
  const r=await fetch(WORKER+"/support/image",{method:"POST",headers:{Authorization:`Bearer ${token}`,"content-type":file.type,"x-file-name":encodeURIComponent(file.name||"captura")},body:file});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d.ok===false)throw new Error(d.error||"No se pudo subir la imagen");
  return d.attachment;
}

async function sendMessage(){
  const input=document.getElementById("dlSupportInput"),btn=document.getElementById("dlSupportSend"),attach=document.getElementById("dlSupportAttach");
  const text=String(input.value||"").trim().slice(0,MAX_TEXT);
  if(!text&&!pendingImages.length)return;
  btn.disabled=true;attach.disabled=true;
  try{
    const attachments=[];
    for(const item of pendingImages)attachments.push(await uploadImage(item.file));
    const ctx=selectedContext();
    await api("/support/message",{method:"POST",body:{text,attachments,relatedPurchaseId:ctx?.purchaseId||"",relatedProductSku:ctx?.productSku||"",relatedProductName:ctx?.productName||"",orderNumber:ctx?.orderNumber||""}});
    input.value="";autoSize(input);
    pendingImages.forEach(x=>URL.revokeObjectURL(x.url));pendingImages=[];renderPreviews();
    await setTyping(false,"");
  }catch(e){feedback(e.message||"No se pudo enviar el mensaje")}
  finally{btn.disabled=false;attach.disabled=false}
}
async function markRead(){if(!user||!document.getElementById("dlSupportPanel")?.classList.contains("open"))return;api("/support/read",{method:"POST",body:{}}).catch(()=>{})}

function renderFeedback(){
  const box=document.getElementById("dlSupportFeedback");if(!box)return;
  if(chatState.feedbackStatus==="pending"&&chatState.feedbackRequestId){
    box.classList.add("show");
    box.innerHTML=`
      <b>¿Cómo fue tu experiencia?</b>
      <p>Tu caso fue finalizado. Califica la atención y comparte un comentario breve.</p>
      <div class="dl-support-stars" aria-label="Calificación">
        ${[1,2,3,4,5].map(n=>`<button class="dl-support-star ${feedbackRating>=n?"active":""}" type="button" data-rating="${n}" aria-label="${n} estrella${n===1?"":"s"}">★</button>`).join("")}
      </div>
      <textarea id="dlFeedbackComment" maxlength="900" placeholder="Cuéntanos cómo fue la atención…"></textarea>
      <button class="dl-feedback-submit" id="dlFeedbackSubmit" type="button">Enviar experiencia</button>`;
    box.querySelectorAll("[data-rating]").forEach(btn=>btn.addEventListener("click",()=>{
      feedbackRating=Number(btn.dataset.rating)||0;renderFeedback()
    }));
    document.getElementById("dlFeedbackSubmit")?.addEventListener("click",submitFeedback);
  }else if(chatState.feedbackStatus==="submitted"&&chatState.status==="resolved"){
    box.classList.add("show");
    box.innerHTML=`<div class="dl-feedback-thanks"><i class="bi bi-patch-check"></i><span><b style="display:block;margin-bottom:2px">Gracias por compartir tu experiencia.</b>Tu opinión ya forma parte de Experiencias de soporte.</span></div>`;
  }else{
    box.classList.remove("show");box.innerHTML="";feedbackRating=0;
  }
}
async function submitFeedback(){
  const btn=document.getElementById("dlFeedbackSubmit"),comment=String(document.getElementById("dlFeedbackComment")?.value||"").trim();
  if(feedbackRating<1){feedback("Selecciona de 1 a 5 estrellas.");return}
  if(comment.length<5){feedback("Escribe un comentario de al menos 5 caracteres.");return}
  btn.disabled=true;
  try{
    await api("/support/feedback",{method:"POST",body:{rating:feedbackRating,comment,requestId:chatState.feedbackRequestId||""}});
    experiencesLoaded=false;feedbackRating=0;
  }catch(e){feedback(e.message||"No pudimos guardar tu experiencia")}
  finally{btn.disabled=false}
}

async function loadExperiences(force=false){
  if(experiencesLoading||(!force&&experiencesLoaded))return;
  experiencesLoading=true;
  const list=document.getElementById("dlExperienceList"),hero=document.getElementById("dlExperienceHero");
  if(list)list.innerHTML='<div class="dl-support-empty">Cargando experiencias…</div>';
  try{
    const d=await api("/support/experiences");
    let experiences=Array.isArray(d.experiences)?d.experiences:[];
    let demo=false;
    if(!experiences.length&&/^(localhost|127\.0\.0\.1)$/i.test(location.hostname)){
      demo=true;
      experiences=[
        {customerName:"Cliente demo",rating:5,comment:"Me orientaron paso a paso para instalar SketchUp 2026. Servicio 10/10.",serviceLabel:"SketchUp Pro 2026",agentName:"Tony Bac",createdAt:new Date().toISOString(),verifiedPurchase:false},
        {customerName:"Cliente demo",rating:5,comment:"Contraté soporte remoto y ellos hicieron toda la instalación. Muy buena atención y todo quedó funcionando.",serviceLabel:"Soporte remoto",agentName:"Cesar Matzar",createdAt:new Date().toISOString(),verifiedPurchase:false},
        {customerName:"Cliente demo",rating:5,comment:"Tuve un problema con mi descarga y soporte lo resolvió rápido. Excelente seguimiento.",serviceLabel:"Soporte Dingloft",agentName:"Tony Bac",createdAt:new Date().toISOString(),verifiedPurchase:false}
      ];
    }
    const count=demo?experiences.length:Number(d.count||experiences.length);
    const average=demo?5:Number(d.average||0);
    if(hero)hero.innerHTML=`<small>Experiencias ${demo?"de demostración":"verificadas"}</small><div class="dl-exp-score"><b>${count?average.toFixed(1):"—"}</b><span>${count?"★★★★★":"☆☆☆☆☆"}</span></div><p>${count?`${count} experiencia${count===1?"":"s"} ${demo?"para previsualizar el diseño.":"de clientes con compra verificada."}`:"Las experiencias reales aparecerán aquí después de que un cliente finalice y califique su soporte."}</p>`;
    if(list)list.innerHTML=experiences.length?experiences.map(x=>`
      <article class="dl-exp-card">
        <div class="dl-exp-top"><span class="dl-exp-name">${esc(x.customerName||"Cliente Dingloft")}</span>${demo?'<span class="dl-exp-demo">DEMO</span>':(x.verifiedPurchase?'<span class="dl-exp-verified"><i class="bi bi-patch-check"></i> Compra verificada</span>':"")}</div>
        <div class="dl-exp-stars">${"★".repeat(Math.max(1,Math.min(5,Number(x.rating||5))))}</div>
        <p class="dl-exp-comment">${esc(x.comment||"")}</p>
        <div class="dl-exp-meta"><span>${esc(x.serviceLabel||"Soporte Dingloft")}</span><span>Atendido por ${esc(x.agentName||"Equipo Dingloft")}</span><span>${dateLabel(x.createdAt)}</span></div>
      </article>`).join(""):'<div class="dl-support-empty"><i class="bi bi-stars"></i><b style="display:block;color:#dbeaf4;margin-bottom:5px">Aún no hay experiencias publicadas</b>Las opiniones reales aparecerán aquí después de finalizar casos de soporte.</div>';
    experiencesLoaded=true;
  }catch(e){
    if(list)list.innerHTML='<div class="dl-support-empty">No pudimos cargar las experiencias en este momento.</div>';
  }finally{experiencesLoading=false}
}

function typingChanged(draft){
  clearTimeout(typingIdleTimer);
  typingIdleTimer=setTimeout(()=>setTyping(false,""),TYPING_IDLE);
  const wait=Math.max(0,TYPING_THROTTLE-(Date.now()-lastTypingWrite));
  clearTimeout(typingTimer);
  typingTimer=setTimeout(()=>setTyping(true,String(draft||"").slice(0,500)),wait);
}
async function setTyping(typing,draft){
  if(!user||!supportData?.eligible||!chatExists)return;
  lastTypingWrite=Date.now();
  try{
    await setDoc(doc(db,"supportChats",user.uid,"presence","customer"),{
      typing:typing===true,
      draft:typing?String(draft||"").slice(0,500):"",
      updatedAt:serverTimestamp()
    },{merge:true});
  }catch(_){}
}
function feedback(message){
  if(typeof window.showAccountFeedbackV81==="function")window.showAccountFeedbackV81({state:"error",kicker:"Soporte Dingloft",title:"No pudimos completar la acción",detail:message,icon:"bi bi-chat-square-dots",duration:3800});
  else alert(message);
}
function cleanup(){
  chatUnsub?.();msgUnsub?.();adminPresenceUnsub?.();chatUnsub=msgUnsub=adminPresenceUnsub=null;
  clearTimeout(typingTimer);clearTimeout(typingIdleTimer);
  for(const u of imageUrls.values())URL.revokeObjectURL(u);imageUrls.clear();
  pendingImages.forEach(x=>URL.revokeObjectURL(x.url));pendingImages=[];
  document.getElementById("dlSupportRoot")?.remove();document.getElementById("dlSupportStyle")?.remove();
  supportData=null;chatState={};chatExists=false;experiencesLoaded=false;experiencesLoading=false;feedbackRating=0;
}

onAuthStateChanged(auth,async u=>{
  cleanup();user=u;if(!u)return;
  try{
    const d=await api("/support/me");
    if(!d?.eligible)return;
    supportData=d;inject();fillContexts();
    document.getElementById("dlSupportLaunch")?.classList.add("show");
    startBaseListeners();
    if(AUTO_OPEN)setTimeout(()=>togglePanel(true),180);
  }catch(e){console.warn("Dingloft Support:",e?.message||e)}
});
