/* Dingloft Support · Customer realtime chat · v2.0 · robust mobile image picker + upload */
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
let supportScrollLock=null,supportCloseTimer=null;

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
  .dl-support-root{position:relative;z-index:95;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827}
  .dl-support-backdrop{position:fixed;inset:0;border:0;padding:0;margin:0;background:rgba(2,6,12,.58);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:993;opacity:0;visibility:hidden;pointer-events:none;cursor:default;transition:opacity .22s ease,visibility 0s linear .34s}.dl-support-root.panel-open .dl-support-backdrop{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .24s ease,visibility 0s}
  .dl-support-launch{position:fixed;right:24px;bottom:24px;width:54px;height:54px;border-radius:18px;border:1px solid rgba(15,23,42,.12);background:#fff;color:#111827;display:none;place-items:center;font-size:21px;box-shadow:0 16px 46px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.8) inset;z-index:995;transition:transform .18s ease,box-shadow .18s ease;cursor:pointer}
  .dl-support-launch:hover{transform:translateY(-2px);box-shadow:0 20px 52px rgba(0,0,0,.32)}.dl-support-launch.show{display:grid}.dl-support-root.panel-open .dl-support-launch{opacity:0;pointer-events:none;transform:translateY(8px)}
  .dl-support-badge{position:absolute;right:-4px;top:-4px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#111827;color:#fff;border:2px solid #fff;display:none;place-items:center;font-size:9px;font-weight:900}.dl-support-badge.show{display:grid}
  .dl-support-panel{position:fixed;right:28px;top:94px;bottom:auto;width:min(400px,calc(100vw - 40px));height:min(610px,calc(100dvh - 122px));border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.985);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-radius:24px;box-shadow:0 26px 80px rgba(0,0,0,.27);z-index:994;display:grid;grid-template-rows:auto auto 1fr;overflow:hidden;color:#111827;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(12px) scale(.975);transform-origin:100% 20%;will-change:transform,opacity;transition:opacity .20s ease,transform .26s cubic-bezier(.4,0,1,1),visibility 0s linear .28s}.dl-support-panel.open{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0) scale(1);transition:opacity .22s ease,transform .42s cubic-bezier(.16,1,.3,1),visibility 0s}.dl-support-root.desktop-shell .dl-support-panel{top:150px;height:min(590px,calc(100dvh - 176px))}
  .dl-support-head{padding:16px 16px 13px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #edf0f3;background:#fff}
  .dl-support-headcopy{min-width:0;flex:1}.dl-support-headcopy b{display:block;color:#101828;font-size:15px;font-weight:850;letter-spacing:-.02em}.dl-support-headcopy small{display:flex;align-items:center;gap:5px;color:#7a8492;font-size:10.5px;margin-top:3px}.dl-support-headcopy small i{font-size:10px;color:#64748b}
  .dl-support-close{width:36px;height:36px;border:1px solid #edf0f3;border-radius:12px;background:#f7f8fa;color:#596474;cursor:pointer}.dl-support-close:hover{background:#eef1f4;color:#111827}
  .dl-support-team-avatars{width:48px;height:36px;position:relative;flex:0 0 48px}.dl-support-team-avatars .dl-support-agent-avatar{position:absolute;top:1px;width:34px;height:34px}.dl-support-team-avatars .dl-support-agent-avatar:first-child{left:0}.dl-support-team-avatars .dl-support-agent-avatar:last-child{right:0;z-index:2}
  .dl-support-agent-avatar{width:30px;height:30px;border-radius:50%;position:relative;display:grid;place-items:center;flex:0 0 auto;overflow:hidden;background:#f0f2f5;border:1px solid #e0e5ea;box-shadow:0 0 0 2px #fff;color:#344054;font-size:8px;font-weight:900;letter-spacing:.03em}.dl-support-agent-avatar>span{position:relative;z-index:1}.dl-support-agent-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;background:#eef1f4}
  .dl-support-tabs{padding:8px 10px;display:grid;grid-template-columns:1fr 1fr;gap:6px;border-bottom:1px solid #edf0f3;background:#fafbfc}.dl-support-tab{height:36px;border:1px solid transparent;border-radius:11px;background:transparent;color:#7a8492;font-size:10.5px;font-weight:850;cursor:pointer}.dl-support-tab.active{color:#111827;background:#fff;border-color:#e6e9ed;box-shadow:0 1px 3px rgba(16,24,40,.06)}
  .dl-support-view{min-height:0;display:none;background:#fff}.dl-support-view.active{display:grid}.dl-support-chat-view{grid-template-rows:auto minmax(0,1fr) auto}.dl-support-experience-view{overflow:auto;padding:14px;align-content:start;gap:12px;background:#f8f9fb}
  .dl-support-context-wrap{border-bottom:1px solid #edf0f3;background:#fff}.dl-support-context{padding:10px 12px 7px;display:flex;gap:8px;align-items:center}.dl-support-context select{width:100%;min-width:0;background:#f8fafc;border:1px solid #e2e7ec;color:#344054;border-radius:12px;padding:10px 11px;font-size:12px;outline:0}.dl-support-context select:focus{border-color:#b9c2cc;box-shadow:0 0 0 3px rgba(17,24,39,.04)}.dl-support-status-note{padding:0 12px 9px;color:#98a2b3;font-size:9.5px;text-align:center}
  .dl-support-feedback{display:none;margin:2px 10px 10px;padding:13px;border-radius:16px;background:#f7f8fa;border:1px solid #e7eaee}.dl-support-feedback.show{display:block}.dl-support-feedback b{display:block;color:#101828;font-size:11px}.dl-support-feedback p{margin:5px 0 10px;color:#667085;font-size:9px;line-height:1.5}.dl-support-stars{display:flex;gap:4px;margin-bottom:9px}.dl-support-star{width:31px;height:31px;border:1px solid #e4e7ec;border-radius:9px;background:#fff;color:#c2c8d0;font-size:15px;cursor:pointer}.dl-support-star.active{color:#e8ad21;border-color:#f0d99e;background:#fffaf0}.dl-support-feedback textarea{width:100%;min-height:68px;max-height:100px;resize:vertical;box-sizing:border-box;border:1px solid #e1e6eb;border-radius:11px;background:#fff;color:#101828;padding:9px;font:10px/1.45 Inter,system-ui,sans-serif;outline:0}.dl-support-feedback button.dl-feedback-submit{width:100%;height:36px;margin-top:8px;border-radius:10px;border:1px solid #111827;background:#111827;color:#fff;font-size:9px;font-weight:900;cursor:pointer}.dl-support-feedback button:disabled{opacity:.45}.dl-feedback-thanks{display:flex;align-items:center;gap:9px;color:#667085;font-size:9px;line-height:1.45}.dl-feedback-thanks i{font-size:17px;color:#111827}
  .dl-support-messages{overflow:auto;padding:16px 14px 13px;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch;background:#fff}.dl-support-empty{margin:auto;text-align:center;max-width:270px;color:#667085;font-size:12px;line-height:1.55}.dl-support-empty i{display:grid;width:46px;height:46px;margin:0 auto 10px;place-items:center;border-radius:15px;background:#f4f6f8;border:1px solid #e7eaee;color:#344054;font-size:18px}
  .dl-support-msg{max-width:84%;display:grid;gap:4px}.dl-support-msg.customer{align-self:flex-end}.dl-support-msg.admin{align-self:flex-start}.dl-support-msg-row{display:flex;align-items:flex-end;gap:8px;min-width:0}.dl-support-msg.customer .dl-support-msg-row{justify-content:flex-end}.dl-support-msg-body{display:grid;gap:4px;min-width:0}.dl-support-msg.admin .dl-support-msg-body{max-width:calc(100% - 38px)}
  .dl-support-who{font-size:9.5px;color:#8b95a3;padding:0 4px}.dl-support-msg.customer .dl-support-who{text-align:right}.dl-support-bubble{padding:10px 12px;border-radius:16px;font-size:12.5px;line-height:1.45;word-break:break-word;box-shadow:0 1px 1px rgba(16,24,40,.03)}.dl-support-msg.customer .dl-support-bubble{background:#111827;color:#fff;border-bottom-right-radius:5px}.dl-support-msg.admin .dl-support-bubble{background:#f3f5f7;color:#1d2939;border:1px solid #e8ebef;border-bottom-left-radius:5px}.dl-support-time{font-size:8.5px;color:#a2abb6;padding:0 4px}.dl-support-msg.customer .dl-support-time{text-align:right}
  .dl-support-images{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-bottom:7px}.dl-support-images img{display:block;width:100%;max-height:145px;object-fit:cover;border-radius:11px;background:#e9edf1;cursor:zoom-in}.dl-support-images img:only-child{grid-column:1/-1;max-height:205px}
  .dl-support-typing{min-height:19px;padding:0 15px 5px;color:#667085;font-size:9px;background:#fff}.dl-support-compose{border-top:1px solid #e9edf1;padding:9px 11px 11px;background:#fafbfc}.dl-support-preview{display:none;gap:7px;margin-bottom:8px;overflow:auto;padding-top:2px}.dl-support-preview.show{display:flex}.dl-support-preview-item{position:relative;flex:0 0 60px;height:60px}.dl-support-preview-item img{width:100%;height:100%;object-fit:cover;border-radius:12px;border:1px solid #e1e6eb;background:#fff}.dl-support-preview-item button{position:absolute;right:-4px;top:-4px;width:21px;height:21px;border-radius:50%;border:2px solid #fff;background:#111827;color:#fff;font-size:11px;box-shadow:0 2px 7px rgba(0,0,0,.16)}
  .dl-support-row{display:grid;grid-template-columns:42px minmax(0,1fr) 44px;gap:7px;align-items:end}.dl-support-attach,.dl-support-send{height:42px;border-radius:13px;border:1px solid #e1e6eb;background:#fff;color:#475467;cursor:pointer}.dl-support-attach:hover{background:#f3f5f7}.dl-support-send{background:#111827;color:#fff;border-color:#111827}.dl-support-send:hover{background:#1f2937}.dl-support-send:disabled,.dl-support-attach:disabled{opacity:.4}.dl-support-input{width:100%;min-height:42px;max-height:108px;resize:none;overflow:auto;background:#fff;border:1px solid #dfe4e9;border-radius:14px;color:#101828;padding:10px 12px;outline:0;font:13px/1.4 Inter,system-ui,sans-serif}.dl-support-input::placeholder{color:#98a2b3}.dl-support-input:focus{border-color:#aab4bf;box-shadow:0 0 0 3px rgba(17,24,39,.04)}.dl-support-foot{margin-top:7px;color:#98a2b3;font-size:7.5px;text-align:center}.dl-support-file{position:fixed!important;left:-10000px!important;top:auto!important;width:1px!important;height:1px!important;opacity:0!important;overflow:hidden!important}.dl-support-attach{display:grid;place-items:center;text-decoration:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
  .dl-exp-hero{padding:15px;border-radius:17px;background:#fff;border:1px solid #e5e9ed;box-shadow:0 1px 2px rgba(16,24,40,.03)}.dl-exp-hero small{display:block;color:#667085;font-size:8px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.dl-exp-score{display:flex;align-items:end;gap:9px;margin-top:7px}.dl-exp-score b{font-size:26px;color:#111827;letter-spacing:-.04em}.dl-exp-score span{color:#e8ad21;font-size:12px}.dl-exp-hero p{margin:6px 0 0;color:#667085;font-size:9px;line-height:1.45}
  .dl-exp-list{display:grid;gap:9px}.dl-exp-card{padding:12px;border:1px solid #e5e9ed;border-radius:14px;background:#fff}.dl-exp-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.dl-exp-name{font-size:10px;font-weight:850;color:#101828}.dl-exp-verified{font-size:7px;color:#344054;border:1px solid #d9dee4;background:#f8fafc;padding:3px 5px;border-radius:999px}.dl-exp-stars{color:#e8ad21;font-size:9px;letter-spacing:1px;margin-top:5px}.dl-exp-comment{margin:8px 0 0;color:#475467;font-size:9.5px;line-height:1.55}.dl-exp-meta{margin-top:8px;color:#98a2b3;font-size:7.5px;display:flex;gap:7px;flex-wrap:wrap}.dl-exp-demo{color:#7a5d16;border:1px solid #ead7a0;background:#fffaf0;padding:3px 6px;border-radius:999px;font-weight:800;letter-spacing:.04em}.dl-exp-section-title{padding:2px 2px 0;color:#667085;font-size:8px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}
  @media(max-width:700px){
    .dl-support-root{max-width:100vw;overflow-x:clip}.dl-support-launch{right:12px;bottom:72px;width:50px;height:50px;border-radius:17px}
    /* Mobile: soporte se comporta como una vista nativa a pantalla completa.
       Cubre el contenido de Cuenta y el dock para que nada del fondo se mueva o se asome. */
    .dl-support-root.panel-open{position:fixed;inset:0;z-index:2147483000;pointer-events:none}
    .dl-support-root.panel-open .dl-support-backdrop{z-index:2147483001;pointer-events:auto;background:rgba(2,6,12,.58);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
    .dl-support-panel{left:6px!important;right:6px!important;top:6px!important;bottom:6px!important;width:auto!important;height:auto!important;min-height:0!important;max-height:none!important;border:1px solid rgba(15,23,42,.10)!important;border-radius:30px!important;box-shadow:0 28px 90px rgba(0,0,0,.34),0 1px 0 rgba(255,255,255,.72) inset!important;z-index:2147483002!important;overscroll-behavior:contain;pointer-events:none;background:#fff;transform:translateY(34px) scale(.965);transform-origin:50% 100%;opacity:0;visibility:hidden;transition:opacity .18s ease,transform .25s cubic-bezier(.4,0,1,1),visibility 0s linear .28s}
    .dl-support-panel.open{pointer-events:auto;opacity:1;visibility:visible;transform:translateY(0) scale(1);transition:opacity .22s ease,transform .46s cubic-bezier(.16,1,.3,1),visibility 0s}
    .dl-support-head{padding-top:max(14px,env(safe-area-inset-top,0px))}
    .dl-support-head{padding:12px 12px 10px;gap:9px}.dl-support-headcopy b{font-size:12.5px}.dl-support-headcopy small{font-size:8px}.dl-support-close{width:32px;height:32px;border-radius:10px}
    .dl-support-team-avatars{width:42px;height:32px;flex-basis:42px}.dl-support-team-avatars .dl-support-agent-avatar{width:30px;height:30px}.dl-support-tabs{padding:6px 8px;gap:5px}.dl-support-tab{height:31px;font-size:8.5px}
    .dl-support-context{padding:7px 9px 5px}.dl-support-context select{padding:8px 9px;font-size:9px;border-radius:10px}.dl-support-status-note{padding:0 9px 6px;font-size:7.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .dl-support-messages{padding:11px 10px 9px;gap:9px;overscroll-behavior:contain}.dl-support-msg{max-width:88%}.dl-support-bubble{padding:8px 10px;font-size:10.5px}.dl-support-who{font-size:7.5px}.dl-support-time{font-size:7px}.dl-support-images img{max-height:120px}.dl-support-images img:only-child{max-height:175px}
    .dl-support-typing{min-height:16px;padding:0 11px 3px;font-size:8px}.dl-support-compose{padding:7px 8px 8px}.dl-support-row{grid-template-columns:39px minmax(0,1fr) 41px;gap:6px}.dl-support-attach,.dl-support-send{height:39px;border-radius:12px}.dl-support-input{min-height:39px;padding:9px 10px;font-size:16px;line-height:1.25;border-radius:12px}.dl-support-foot{display:none}
    .dl-support-experience-view{padding:10px}.dl-exp-hero{padding:12px}.dl-exp-list{gap:7px}.dl-exp-card{padding:10px}
  }
  @media(prefers-reduced-motion:reduce){.dl-support-panel,.dl-support-panel.open,.dl-support-backdrop,.dl-support-root.panel-open .dl-support-backdrop,.dl-support-launch{transition:none!important;animation:none!important}}
  @media(max-width:380px){.dl-support-launch{right:10px;bottom:70px}.dl-support-context select{font-size:8.5px}.dl-support-headcopy small{max-width:205px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
  `;
  document.head.appendChild(style);

  const root=document.createElement("div");
  root.id="dlSupportRoot";
  root.className=`dl-support-root${window.top!==window.self?" desktop-shell":""}`;
  root.innerHTML=`
    <button class="dl-support-backdrop" id="dlSupportBackdrop" aria-label="Cerrar soporte" tabindex="-1"></button>
    <button class="dl-support-launch" id="dlSupportLaunch" aria-label="Abrir soporte">
      <i class="bi bi-chat-dots"></i><span class="dl-support-badge" id="dlSupportBadge">0</span>
    </button>
    <section class="dl-support-panel" id="dlSupportPanel" aria-label="Soporte Dingloft">
      <div class="dl-support-head">
        <div class="dl-support-team-avatars">${avatarMarkup("Tony Bac")}${avatarMarkup("Cesar Matzar")}</div>
        <div class="dl-support-headcopy"><b>Soporte Dingloft</b><small><i class="bi bi-shield-lock"></i> Canal privado · Protegido por Evolution Group</small></div>
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
          <div class="dl-support-empty"><i class="bi bi-chat-heart"></i><b style="display:block;color:#101828;margin-bottom:5px">¿En qué podemos ayudarte?</b>Cuéntanos qué ocurre con tu compra. Puedes adjuntar hasta 3 capturas.</div>
        </div>
        <div>
          <div class="dl-support-typing" id="dlSupportTyping"></div>
          <div class="dl-support-compose">
            <div class="dl-support-preview" id="dlSupportPreview"></div>
            <div class="dl-support-row">
              <label class="dl-support-attach" id="dlSupportAttach" for="dlSupportFile" role="button" tabindex="0" aria-label="Adjuntar imagen"><i class="bi bi-image"></i></label>
              <textarea class="dl-support-input" id="dlSupportInput" maxlength="2000" placeholder="Escribe tu mensaje…"></textarea>
              <button class="dl-support-send" id="dlSupportSend" aria-label="Enviar"><i class="bi bi-arrow-up"></i></button>
            </div>
            <input class="dl-support-file" id="dlSupportFile" type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif" multiple>
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
  document.getElementById("dlSupportBackdrop").addEventListener("click",()=>togglePanel(false));
  const attachLabel=document.getElementById("dlSupportAttach"),fileInput=document.getElementById("dlSupportFile");
  // The native <label for=file> path is intentionally used on touch devices.
  // iOS Safari/PWA can ignore programmatic .click() calls on visually-hidden file inputs.
  attachLabel.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();fileInput.click()}});
  fileInput.addEventListener("change",handleFiles);
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
function mobileSupportMode(){return window.matchMedia?.("(max-width:700px)")?.matches===true}
function lockSupportBackground(){
  if(!mobileSupportMode()||supportScrollLock)return;
  const body=document.body,html=document.documentElement,y=Math.max(0,window.scrollY||window.pageYOffset||0);
  supportScrollLock={y,bodyPosition:body.style.position,bodyTop:body.style.top,bodyLeft:body.style.left,bodyRight:body.style.right,bodyWidth:body.style.width,bodyOverflow:body.style.overflow,htmlOverflow:html.style.overflow,htmlOverscroll:html.style.overscrollBehavior};
  html.style.overflow="hidden";html.style.overscrollBehavior="none";
  body.style.position="fixed";body.style.top=`-${y}px`;body.style.left="0";body.style.right="0";body.style.width="100%";body.style.overflow="hidden";
}
function unlockSupportBackground(){
  if(!supportScrollLock)return;
  const body=document.body,html=document.documentElement,s=supportScrollLock;supportScrollLock=null;
  body.style.position=s.bodyPosition;body.style.top=s.bodyTop;body.style.left=s.bodyLeft;body.style.right=s.bodyRight;body.style.width=s.bodyWidth;body.style.overflow=s.bodyOverflow;
  html.style.overflow=s.htmlOverflow;html.style.overscrollBehavior=s.htmlOverscroll;
  requestAnimationFrame(()=>window.scrollTo(0,s.y));
}
function togglePanel(open){
  const p=document.getElementById("dlSupportPanel"),root=document.getElementById("dlSupportRoot");if(!p||!root)return;
  if(supportCloseTimer){clearTimeout(supportCloseTimer);supportCloseTimer=null}
  if(open){
    root.classList.add("panel-open");
    lockSupportBackground();
    requestAnimationFrame(()=>requestAnimationFrame(()=>p.classList.add("open")));
    startConversationListeners();markRead();
    if(PARAMS.get("supportFeedback")==="1")switchTab("chat");
    if(!mobileSupportMode())setTimeout(()=>document.getElementById("dlSupportInput")?.focus(),180);
    return;
  }
  p.classList.remove("open");
  stopMessageListeners();setTyping(false,"");
  const finishClose=()=>{root.classList.remove("panel-open");unlockSupportBackground();supportCloseTimer=null};
  if(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)finishClose();
  else supportCloseTimer=setTimeout(finishClose,mobileSupportMode()?290:280);
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
    box.innerHTML='<div class="dl-support-empty"><i class="bi bi-chat-heart"></i><b style="display:block;color:#101828;margin-bottom:5px">¿En qué podemos ayudarte?</b>Cuéntanos qué ocurre con tu compra. Puedes adjuntar hasta 3 capturas.</div>';
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

const DIRECT_IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp"]);
const MAX_SOURCE_IMAGE_BYTES=25*1024*1024;
function imageExt(file){return String(file?.name||"").toLowerCase().split(".").pop()||""}
function looksLikeImage(file){return String(file?.type||"").toLowerCase().startsWith("image/")||["jpg","jpeg","png","webp","heic","heif"].includes(imageExt(file))}
function needsImageConversion(file){
  const type=String(file?.type||"").toLowerCase();
  const ext=imageExt(file);
  return !DIRECT_IMAGE_TYPES.has(type)||["heic","heif"].includes(ext)||file.size>MAX_IMAGE_BYTES;
}
async function convertImageToJpeg(file){
  if(file.size>MAX_SOURCE_IMAGE_BYTES)throw new Error("La foto es demasiado grande. Elige una imagen de menos de 25 MB.");
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{
      const el=new Image();
      el.onload=()=>resolve(el);
      el.onerror=()=>reject(new Error("Este formato de foto no pudo convertirse. Prueba compartirla como JPG, PNG o una captura de pantalla."));
      el.src=url;
    });
    const maxSide=2200;
    const w=Number(img.naturalWidth||img.width||0),h=Number(img.naturalHeight||img.height||0);
    if(!w||!h)throw new Error("No pudimos leer esta imagen.");
    const scale=Math.min(1,maxSide/Math.max(w,h));
    const cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
    const canvas=document.createElement("canvas");canvas.width=cw;canvas.height=ch;
    const ctx=canvas.getContext("2d",{alpha:false});
    if(!ctx)throw new Error("Tu navegador no pudo preparar la imagen.");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,cw,ch);ctx.drawImage(img,0,0,cw,ch);
    let quality=.88,blob=null;
    for(let i=0;i<5;i++){
      blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
      if(blob&&blob.size<=MAX_IMAGE_BYTES)break;
      quality=Math.max(.62,quality-.07);
    }
    if(!blob)throw new Error("No pudimos preparar la imagen.");
    if(blob.size>MAX_IMAGE_BYTES)throw new Error("No pudimos reducir la foto a menos de 5 MB.");
    const base=String(file.name||"captura").replace(/\.[^.]+$/,"" ).slice(0,120)||"captura";
    return new File([blob],`${base}.jpg`,{type:"image/jpeg",lastModified:Date.now()});
  }finally{URL.revokeObjectURL(url)}
}
async function prepareSupportImage(file){
  if(!looksLikeImage(file))throw new Error("Selecciona una imagen válida.");
  const type=String(file.type||"").toLowerCase();
  if(!needsImageConversion(file)&&DIRECT_IMAGE_TYPES.has(type))return file;
  return convertImageToJpeg(file);
}
async function handleFiles(e){
  const input=e.currentTarget||e.target;
  const files=[...(input?.files||[])];
  // Reset after copying the FileList so the same photo can be selected again later.
  if(input)input.value="";
  if(!files.length)return;
  const attach=document.getElementById("dlSupportAttach");
  if(attach){attach.setAttribute("aria-disabled","true");attach.style.pointerEvents="none";attach.style.opacity=".45"}
  try{
    for(const original of files){
      if(pendingImages.length>=MAX_IMAGES){feedback(`Puedes adjuntar máximo ${MAX_IMAGES} imágenes por mensaje.`);break}
      try{
        const file=await prepareSupportImage(original);
        pendingImages.push({file,url:URL.createObjectURL(file)});
        renderPreviews();
      }catch(err){feedback(err?.message||"No pudimos preparar esa imagen.")}
    }
  }finally{
    if(attach){attach.removeAttribute("aria-disabled");attach.style.pointerEvents="";attach.style.opacity=""}
  }
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
  const uploadType=String(file?.type||"").toLowerCase()==="image/jpg"?"image/jpeg":String(file?.type||"image/jpeg").toLowerCase();
  if(!["image/jpeg","image/png","image/webp"].includes(uploadType))throw new Error("No pudimos convertir la foto a un formato compatible.");
  const doUpload=async(forceRefresh=false)=>{
    const token=await user.getIdToken(forceRefresh);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),45000);
    try{
      return await fetch(WORKER+"/support/image",{
        method:"POST",
        headers:{Authorization:`Bearer ${token}`,"content-type":uploadType,"x-file-name":encodeURIComponent(file.name||"captura.jpg")},
        body:file,
        cache:"no-store",
        signal:controller.signal
      });
    }finally{clearTimeout(timer)}
  };
  let r;
  try{r=await doUpload(false)}catch(err){
    if(err?.name==="AbortError")throw new Error("La imagen tardó demasiado en subir. Revisa tu conexión e inténtalo de nuevo.");
    throw new Error("No pudimos conectar con el servidor para subir la imagen.");
  }
  // A stale Firebase token is common after an app has been left open for a long time.
  if(r.status===401){try{r=await doUpload(true)}catch(err){if(err?.name==="AbortError")throw new Error("La imagen tardó demasiado en subir.");throw err}}
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d.ok===false){
    const message=d?.error||d?.code||`No se pudo subir la imagen (HTTP ${r.status})`;
    throw new Error(message);
  }
  if(!d?.attachment?.key)throw new Error("El servidor no confirmó la imagen subida.");
  return d.attachment;
}

async function sendMessage(){
  const input=document.getElementById("dlSupportInput"),btn=document.getElementById("dlSupportSend"),attach=document.getElementById("dlSupportAttach");
  const text=String(input.value||"").trim().slice(0,MAX_TEXT);
  if(!text&&!pendingImages.length)return;
  btn.disabled=true;if(attach){attach.setAttribute("aria-disabled","true");attach.style.pointerEvents="none";attach.style.opacity=".45"}
  try{
    const attachments=[];
    for(const item of pendingImages)attachments.push(await uploadImage(item.file));
    const ctx=selectedContext();
    await api("/support/message",{method:"POST",body:{text,attachments,relatedPurchaseId:ctx?.purchaseId||"",relatedProductSku:ctx?.productSku||"",relatedProductName:ctx?.productName||"",orderNumber:ctx?.orderNumber||""}});
    input.value="";autoSize(input);
    pendingImages.forEach(x=>URL.revokeObjectURL(x.url));pendingImages=[];renderPreviews();
    await setTyping(false,"");
  }catch(e){feedback(e.message||"No se pudo enviar el mensaje")}
  finally{btn.disabled=false;if(attach){attach.removeAttribute("aria-disabled");attach.style.pointerEvents="";attach.style.opacity=""}}
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
    const experiences=Array.isArray(d.experiences)?d.experiences:[];
    const count=Number(d.count||experiences.length);
    const average=Number(d.average||0);
    if(hero)hero.innerHTML=`<small>Experiencias verificadas</small><div class="dl-exp-score"><b>${count?average.toFixed(1):"—"}</b><span>${count?"★★★★★":"☆☆☆☆☆"}</span></div><p>${count?`${count} experiencia${count===1?"":"s"} reales y verificadas de nuestros clientes.`:"Las calificaciones verificadas aparecerán aquí después de que un cliente finalice y valore su soporte."}</p>`;
    const realMarkup=experiences.map(x=>{
      const verified=x.verifiedPurchase?'<span class="dl-exp-verified"><i class="bi bi-patch-check"></i> Compra verificada</span>':x.verifiedLegacy?'<span class="dl-exp-verified"><i class="bi bi-patch-check"></i> Cliente verificado</span>':'';
      return `
      <article class="dl-exp-card">
        <div class="dl-exp-top"><span class="dl-exp-name">${esc(x.customerName||"Cliente Dingloft")}</span>${verified}</div>
        <div class="dl-exp-stars">${"★".repeat(Math.max(1,Math.min(5,Number(x.rating||5))))}</div>
        <p class="dl-exp-comment">${esc(x.comment||"")}</p>
        <div class="dl-exp-meta"><span>${esc(x.serviceLabel||"Soporte Dingloft")}</span><span>${dateLabel(x.createdAt)}</span></div>
      </article>`}).join("");
    if(list)list.innerHTML=realMarkup
      ? `<div class="dl-exp-section-title">Opiniones verificadas de clientes</div>${realMarkup}`
      : `<div class="dl-support-empty"><i class="bi bi-patch-check" style="font-size:24px;display:block;margin-bottom:10px"></i><b style="display:block;color:#111827;margin-bottom:6px">Aún no hay experiencias verificadas</b>Las opiniones aparecerán aquí cuando un cliente con compra verificada finalice su soporte y envíe su calificación.</div>`;
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
window.addEventListener("pagehide",unlockSupportBackground);
window.addEventListener("beforeunload",unlockSupportBackground);
