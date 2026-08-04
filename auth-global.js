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

onAuthStateChanged(auth, (user) => {
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

    // VALIDACIÓN ESTRICTA: Si es César o Antonio, inyectar el botón de Modo Admin automáticamente en el menú lateral
    if (user.email === 'evolutiongt01@gmail.com' || user.email === 'tepaz2025@gmail.com') {
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
