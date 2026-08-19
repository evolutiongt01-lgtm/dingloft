(() => {
  'use strict';
  const banner = document.getElementById('siteInstallBanner');
  if (!banner) return;
  const installBtn = document.getElementById('siteInstallAction');
  const closeBtn = document.getElementById('siteInstallClose');
  const guide = document.getElementById('siteInstallGuide');
  const guideClose = document.getElementById('siteInstallGuideClose');
  const guideTitle = document.getElementById('siteInstallGuideTitle');
  const guideText = document.getElementById('siteInstallGuideText');
  const guideSteps = document.getElementById('siteInstallSteps');
  const title = document.getElementById('siteInstallTitle');
  const text = document.getElementById('siteInstallText');
  const keyDismiss = 'dingloft_install_banner_dismissed_at';
  const keyInstalled = 'dingloft_installed_at';

  const ua = navigator.userAgent || '';
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
  const isWindows = /Windows/i.test(ua);
  let deferredPrompt = null;

  function shouldSuppress() {
    const dismissed = Number(localStorage.getItem(keyDismiss) || 0);
    return dismissed && (Date.now() - dismissed < 5 * 24 * 60 * 60 * 1000);
  }
  function hideBanner() {
    banner.classList.remove('show');
  }
  function showBanner() {
    if (isStandalone() || localStorage.getItem(keyInstalled)) return hideBanner();
    if (shouldSuppress()) return hideBanner();
    if (title && text) {
      if (isIOS) {
        title.textContent = 'Instala Dingloft como app';
        text.textContent = 'Ábrelo más rápido desde tu pantalla de inicio.';
      } else if (isAndroid) {
        title.textContent = 'Instala Dingloft como app';
        text.textContent = 'Añádelo a tu Android para abrirlo como una app real.';
      } else if (isMac || isWindows) {
        title.textContent = 'Instala Dingloft como app';
        text.textContent = 'Ábrelo más rápido y conserva la experiencia completa desde tu escritorio.';
      } else {
        title.textContent = 'Instala Dingloft';
        text.textContent = 'Añádelo como app para entrar más rápido.';
      }
    }
    setTimeout(() => banner.classList.add('show'), 900);
  }
  function dismiss() {
    localStorage.setItem(keyDismiss, String(Date.now()));
    hideBanner();
  }
  function getGuideCopy() {
    if (isIOS) {
      return {
        title: 'Instala Dingloft en tu iPhone',
        text: 'Úsalo como una app con acceso rápido desde la pantalla de inicio.',
        steps: [
          'Toca el botón Compartir del navegador.',
          'Elige “Añadir a pantalla de inicio”.',
          'Pulsa “Añadir” y abre Dingloft desde el icono.'
        ]
      };
    }
    if (isAndroid) {
      return {
        title: 'Instala Dingloft en Android',
        text: 'Añádelo a tu pantalla principal y úsalo como una app independiente.',
        steps: [
          'Toca “Instalar” cuando aparezca el aviso de Android.',
          'Si no aparece, abre el menú ⋮ del navegador.',
          'Elige “Instalar aplicación” o “Añadir a pantalla principal”.'
        ]
      };
    }
    if (isMac || isWindows) {
      return {
        title: 'Instala Dingloft en tu escritorio',
        text: 'En Chrome o Edge puedes instalar Dingloft y abrirlo como una app independiente.',
        steps: [
          'Haz clic en “Instalar” si el navegador lo permite.',
          'Si no aparece el aviso, busca el icono de instalación en la barra de direcciones.',
          'Acepta la instalación y abre Dingloft desde tu escritorio o dock.'
        ]
      };
    }
    return {
      title: 'Instala Dingloft',
      text: 'Añádelo como app desde tu navegador.',
      steps: [
        'Busca la opción de instalar o añadir a inicio.',
        'Confirma la instalación.',
        'Abre Dingloft desde el nuevo icono.'
      ]
    };
  }
  function openGuide() {
    const copy = getGuideCopy();
    if (guideTitle) guideTitle.textContent = copy.title;
    if (guideText) guideText.textContent = copy.text;
    if (guideSteps) guideSteps.innerHTML = copy.steps.map((step, i) => `<div class="site-install-step"><span>${i+1}</span><p>${step}</p></div>`).join('');
    guide?.classList.add('show');
  }
  async function install() {
    if (isStandalone()) return hideBanner();
    if (deferredPrompt) {
      try {
        const prompt = deferredPrompt;
        deferredPrompt = null;
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          localStorage.setItem(keyInstalled, String(Date.now()));
          hideBanner();
          return;
        }
      } catch(e) {}
    }
    openGuide();
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    showBanner();
  });
  window.addEventListener('appinstalled', () => {
    localStorage.setItem(keyInstalled, String(Date.now()));
    hideBanner();
  });
  document.addEventListener('DOMContentLoaded', () => {
    installBtn?.addEventListener('click', install);
    closeBtn?.addEventListener('click', dismiss);
    guideClose?.addEventListener('click', () => guide?.classList.remove('show'));
    guide?.addEventListener('click', e => { if (e.target === guide) guide.classList.remove('show'); });
    // show on iOS immediately, on desktop/mobile when prompt exists or as a soft CTA
    if (isIOS || isMac || isWindows) showBanner();
    else setTimeout(showBanner, 1200);
  });
})();
