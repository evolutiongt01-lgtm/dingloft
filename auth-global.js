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
  const desktopAuthContainer = document.getElementById('desktop-auth-container');
  const mobileAuthContainer = document.getElementById('mobile-auth-container');
  const desktopAdminContainer = document.getElementById('desktop-admin-btn-container');
  const mobileAdminContainer = document.getElementById('mobile-admin-btn-container');

  if (user) {
    // Validar si es César o Antonio para mostrar el Modo Admin
    if (user.email === 'evolutiongt01@gmail.com' || user.email === 'tepaz2025@gmail.com') {
      if (desktopAdminContainer) desktopAdminContainer.style.display = 'block';
      if (mobileAdminContainer) mobileAdminContainer.style.display = 'block';
    }

    let displayName = "Usuario";
    if (user.displayName) {
      displayName = user.displayName.split(' ')[0];
    } else if (user.email) {
      displayName = user.email.split('@')[0];
    }

    let avatarHtml = '';
    if (user.photoURL) {
      avatarHtml = `<img src="${user.photoURL}" alt="Perfil" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">`;
    } else {
      const initial = displayName.charAt(0).toUpperCase();
      avatarHtml = `<div style="width: 28px; height: 28px; border-radius: 50%; background: #00e5ff; color: #000; display: grid; place-items: center; font-weight: bold; font-size: 14px;">${initial}</div>`;
    }

    if (desktopAuthContainer) {
      desktopAuthContainer.innerHTML = `
        <a href="account.html" class="text-white text-decoration-none small fw-semibold d-flex align-items-center gap-2" style="transition: color 0.3s;" onmouseover="this.style.color='#00e5ff'" onmouseout="this.style.color='#fff'">
          ${avatarHtml} Hola, ${displayName}
        </a>
      `;
    }

    if (mobileAuthContainer) {
      mobileAuthContainer.innerHTML = `
        <a href="account.html" class="btn btn-outline-custom w-100 text-center text-white text-decoration-none d-flex align-items-center justify-content-center gap-2">
          ${avatarHtml} Mi Cuenta
        </a>
      `;
    }
  } else {
    if (desktopAdminContainer) desktopAdminContainer.style.display = 'none';
    if (mobileAdminContainer) mobileAdminContainer.style.display = 'none';
  }
});