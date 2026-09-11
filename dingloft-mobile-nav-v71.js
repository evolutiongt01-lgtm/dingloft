/* Dingloft Mobile Nav compatibility bridge · v121
   Navbar UI moved to /dingloft-global-nav.js.
   Kept only because older pages still reference this filename. */
(() => {
  'use strict';
  if (window.self !== window.top) return;
  const file=(location.pathname.split('/').filter(Boolean).pop()||'').toLowerCase();
  if(file.includes('admin')||file==='commerce-admin'||file==='app'||file==='desktop-shell')return;
  const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'')||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)||
    (navigator.maxTouchPoints>0&&matchMedia('(max-width:1024px)').matches);
  if(!mobile)return;
  if(document.querySelector('script[data-dgn-global-loader]'))return;
  const s=document.createElement('script');
  s.src='/dingloft-global-nav.js?v=124';
  s.defer=true;
  s.dataset.dgnGlobalLoader='124';
  document.head.appendChild(s);
})();
