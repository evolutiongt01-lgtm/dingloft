(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
  const isMobile = isIOS || isAndroid || matchMedia('(max-width: 767px)').matches;
  let deferredPrompt = null;

  function hideInstallUI(){
    $('installAppBtn')?.classList.remove('visible');
    $('installCard')?.classList.remove('show');
    document.body.classList.add('pwa-installed');
  }
  function showInstallUI(){
    if (isStandalone() || localStorage.getItem('dingloft_installed_at')) return hideInstallUI();
    if (!isMobile && !isMac) return hideInstallUI();
    $('installAppBtn')?.classList.add('visible');
    const dismissed = Number(localStorage.getItem('dingloft_install_dismissed_at') || 0);
    if (!dismissed || Date.now() - dismissed > 5 * 24 * 60 * 60 * 1000) {
      setTimeout(() => $('installCard')?.classList.add('show'), 1200);
    }
  }
  function platformCopy(){
    if (isIOS) return {
      title:'Instala Dingloft en tu iPhone',
      text:'Úsalo como una app: pantalla completa, acceso rápido y navegación móvil.',
      steps:[
        ['1','Toca el botón Compartir del navegador.'],
        ['2','Elige “Añadir a pantalla de inicio”.'],
        ['3','Pulsa “Añadir” y abre Dingloft desde el icono.']
      ]
    };
    if (isMac) return {
      title:'Instala Dingloft en tu Mac',
      text:'Añádelo al Dock y ábrelo como una app independiente.',
      steps:[
        ['1','En Safari usa Archivo → Añadir al Dock.'],
        ['2','En Chrome usa el icono de instalación de la barra de direcciones.'],
        ['3','Abre Dingloft desde el Dock o Launchpad.']
      ]
    };
    return {
      title:'Instala Dingloft en Android',
      text:'Añádelo a tu pantalla principal y úsalo como una app independiente.',
      steps:[
        ['1','Toca “Instalar” cuando aparezca el aviso de Android.'],
        ['2','Si no aparece, abre el menú ⋮ del navegador.'],
        ['3','Elige “Instalar aplicación” o “Añadir a pantalla principal”.']
      ]
    };
  }
  function openGuide(){
    const copy=platformCopy();
    if ($('installGuideTitle')) $('installGuideTitle').textContent=copy.title;
    if ($('installGuideText')) $('installGuideText').textContent=copy.text;
    if ($('installSteps')) $('installSteps').innerHTML=copy.steps.map(([n,t])=>`<div class="install-step"><span>${n}</span><p>${t}</p></div>`).join('');
    $('installGuide')?.classList.add('show');
  }
  async function install(){
    if (isStandalone()) return hideInstallUI();
    if (deferredPrompt) {
      const p=deferredPrompt;
      deferredPrompt=null;
      try {
        await p.prompt();
        const choice=await p.userChoice;
        if (choice?.outcome === 'accepted') hideInstallUI();
        else showInstallUI();
      } catch (_) { openGuide(); }
      return;
    }
    openGuide();
  }
  function dismiss(){
    localStorage.setItem('dingloft_install_dismissed_at', String(Date.now()));
    $('installCard')?.classList.remove('show');
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt=e;
    showInstallUI();
  });
  window.addEventListener('appinstalled', () => {
    localStorage.setItem('dingloft_installed_at', String(Date.now()));
    hideInstallUI();
  });
  matchMedia('(display-mode: standalone)').addEventListener?.('change', e => { if(e.matches) hideInstallUI(); });

  document.addEventListener('DOMContentLoaded', () => {
    $('installAppBtn')?.addEventListener('click', install);
    $('installCardAction')?.addEventListener('click', install);
    $('installCardClose')?.addEventListener('click', dismiss);
    $('installGuideClose')?.addEventListener('click', () => $('installGuide')?.classList.remove('show'));
    $('installGuide')?.addEventListener('click', e => { if(e.target === $('installGuide')) $('installGuide')?.classList.remove('show'); });
    showInstallUI();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg=await navigator.serviceWorker.register('/sw.js?v=23', { scope:'/', updateViaCache:'none' });
        reg.update().catch(()=>{});
      } catch (err) { console.warn('Dingloft PWA:', err); }
    });
  }
})();
