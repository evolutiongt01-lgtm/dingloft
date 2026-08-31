// auth-global.js - Sincronización global de sesión y Modo Admin para Dingloft
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKxQdUM49cVbBaXWJ5DF3s7EaNKlJRGhA",
  authDomain: "login-dingloft.firebaseapp.com",
  projectId: "login-dingloft",
  storageBucket: "login-dingloft.firebasestorage.app",
  messagingSenderId: "549466738202",
  appId: "1:549466738202:web:8bf305fe2c753e9d76cba3",
  measurementId: "G-R9SGZCDN13"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, async (user) => {
  const authContainerGlobal = document.getElementById('auth-container-global');
  const sideMenuLinks = document.querySelector('.side-menu-drawer .d-flex.flex-column');

  if (user) {
    let displayName = "Usuario";
    if (user.displayName) {
      displayName = user.displayName.split(' ')[0];
    } else if (user.email) {
      displayName = user.email.split('@')[0];
    }

    let avatarHtml = user.photoURL 
      ? `<img src="${user.photoURL}" alt="Perfil">`
      : `<div class="avatar-fallback">${displayName.charAt(0).toUpperCase()}</div>`;

    // Actualizar avatar en la Navbar principal de tus páginas de producto
    if (authContainerGlobal) {
      authContainerGlobal.innerHTML = `
        <a href="account.html" class="mobile-nav-avatar" title="Ir a Mi Cuenta">
          ${avatarHtml}
        </a>
      `;
    }

    // El Worker valida propietarios, administradores históricos y empleados activos.
    let adminAllowed=false;
    try{const token=await user.getIdToken(false),r=await fetch('https://autumn-breeze-dfa0.evolutiongt01.workers.dev/admin/session',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});adminAllowed=r.ok}catch(_){}
    if (adminAllowed) {
      if (sideMenuLinks && !document.getElementById('admin-sidebar-link')) {
        const adminLinkHTML = `
          <a href="admin.html" id="admin-sidebar-link" class="side-menu-link" style="background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.3); margin-top: 5px;">
            <i class="bi bi-shield-lock-fill" style="color: #ff5050;"></i> <span style="color: #ff5050;">Modo Admin</span>
          </a>
        `;
        sideMenuLinks.insertAdjacentHTML('beforeend', adminLinkHTML);
      }
    }

  } else {
    if (authContainerGlobal) {
      authContainerGlobal.innerHTML = `
        <a href="login.html" class="mobile-liquid-btn" title="Iniciar Sesión">
          <i class="bi bi-person-fill"></i>
        </a>
      `;
    }
    // Remover link de admin si cierra sesión
    const existingAdminLink = document.getElementById('admin-sidebar-link');
    if (existingAdminLink) existingAdminLink.remove();
  }
});


// Dingloft · Aviso administrativo de reseñas v109
// Los comentarios siguen guardándose exactamente como antes en Firestore.
// Este puente solo avisa al Worker DESPUÉS del submit; el Worker verifica que
// el comentario realmente exista antes de notificar a Administración.
const DINGLOFT_NOTIFY_WORKER = String(window.DINGLOFT_WORKER_BASE || 'https://autumn-breeze-dfa0.evolutiongt01.workers.dev').replace(/\/$/, '');
const DINGLOFT_REVIEW_PAGE = {
  '/sketchup': ['sketchup_comments_final','SketchUp Pro 2026'],
  '/autocad': ['autocad_comments_final','AutoCAD 2026'],
  '/cinema4d': ['cinema4d_comments_final','Cinema 4D'],
  '/logic': ['logic_comments_final','Logic Pro'],
  '/mainstage': ['mainstage_comments_final','MainStage'],
  '/nord': ['nord_comments_final','Nord Stage'],
  '/office': ['office_comments_final','Office'],
  '/rhodes': ['rhodes_comments_final','Rhodes'],
  '/yamahakeys': ['yamahakeys_comments_final','Yamaha Premium Keys'],
  '/esword': ['esword_comments_v1','Biblias E-Sword'],
  '/dual': ['product_comments_pianos_v5','Pianos / Librerías']
};
function dingloftReviewRoute(){
  let path=(location.pathname||'/').toLowerCase().replace(/\.html$/,'').replace(/\/$/,'')||'/';
  return DINGLOFT_REVIEW_PAGE[path]||null;
}
async function dingloftNotifyReview(payload, attempt=0){
  const user=auth.currentUser;
  if(!user)return;
  try{
    const token=await user.getIdToken(false);
    const response=await fetch(`${DINGLOFT_NOTIFY_WORKER}/reviews/notify-admin`,{
      method:'POST',
      headers:{Authorization:`Bearer ${token}`,'content-type':'application/json',Accept:'application/json'},
      body:JSON.stringify(payload),
      cache:'no-store'
    });
    if(response.ok)return;
  }catch(_){}
  if(attempt<3)setTimeout(()=>dingloftNotifyReview(payload,attempt+1),700*(attempt+1));
}
document.addEventListener('submit',event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||form.id!=='comment-form')return;
  const route=dingloftReviewRoute();
  if(!route||!auth.currentUser)return;
  const name=document.getElementById('comment-name')?.value?.trim()||auth.currentUser.displayName||auth.currentUser.email?.split('@')[0]||'Usuario';
  const rating=Number(document.getElementById('comment-rating')?.value||5);
  const text=document.getElementById('comment-text')?.value?.trim()||'';
  if(!text)return;
  const [collection,productName]=route;
  const payload={collection,productName,name,rating,text};
  // Damos tiempo al addDoc original para escribir Firestore. Si tarda más,
  // el propio puente reintenta silenciosamente sin duplicar notificaciones.
  setTimeout(()=>dingloftNotifyReview(payload,0),650);
},true);
