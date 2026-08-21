(() => {
  'use strict';
  const STYLE_ID='dingloft-cinema-video-style';
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .dl-cinema-host{overflow:visible!important;position:relative!important;isolation:isolate;}
      .dl-cinema-video{--dl-cx:50%;--dl-cy:50%;position:relative;width:100%;aspect-ratio:16/9;border-radius:18px;isolation:isolate;transform:translateZ(0);}
      .ratio>.dl-cinema-video{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;aspect-ratio:auto!important;}
      .dl-cinema-video::before{content:"";position:absolute;z-index:-2;inset:-10%;border-radius:28px;background:
        radial-gradient(circle at var(--dl-cx) var(--dl-cy),rgba(91,211,255,.26),transparent 35%),
        radial-gradient(circle at 82% 14%,rgba(113,88,255,.20),transparent 34%),
        radial-gradient(circle at 12% 86%,rgba(27,151,255,.13),transparent 31%);
        filter:blur(28px);opacity:.52;transform:scale(.96);transition:opacity .45s ease,transform .6s cubic-bezier(.16,1,.3,1);pointer-events:none;}
      .dl-cinema-video::after{content:"";position:absolute;z-index:3;inset:0;border-radius:18px;pointer-events:none;border:1px solid rgba(171,225,255,.18);box-shadow:
        inset 0 1px 0 rgba(255,255,255,.12),inset 0 -40px 80px rgba(0,0,0,.18),0 18px 44px rgba(0,0,0,.34),0 0 0 1px rgba(83,195,255,.04);
        background:linear-gradient(125deg,rgba(255,255,255,.07),transparent 20%,transparent 73%,rgba(107,79,255,.05));}
      .dl-cinema-video iframe,.dl-cinema-video video{position:relative;z-index:1;display:block;width:100%!important;height:100%!important;border:0!important;border-radius:18px!important;background:#030507;object-fit:cover;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);}
      .dl-cinema-video .dl-cinema-shine{position:absolute;z-index:2;inset:0;border-radius:18px;pointer-events:none;overflow:hidden;}
      .dl-cinema-video .dl-cinema-shine::before{content:"";position:absolute;top:-45%;bottom:-45%;left:-35%;width:22%;background:linear-gradient(90deg,transparent,rgba(192,236,255,.13),transparent);filter:blur(7px);transform:rotate(14deg) translateX(-160%);opacity:0;}
      .dl-cinema-video.is-visible::before{opacity:.86;transform:scale(1.02);animation:dlAmbient 7s ease-in-out infinite alternate;}
      .dl-cinema-video.is-visible .dl-cinema-shine::before{opacity:.58;animation:dlSweep 7.8s cubic-bezier(.16,1,.3,1) infinite;}
      .dl-cinema-video:hover::before{opacity:1;transform:scale(1.045);}
      @keyframes dlAmbient{0%{filter:blur(28px) hue-rotate(0deg)}100%{filter:blur(34px) hue-rotate(18deg)}}
      @keyframes dlSweep{0%,58%{transform:rotate(14deg) translateX(-180%)}78%,100%{transform:rotate(14deg) translateX(760%)}}
      @media(max-width:768px){.dl-cinema-video{border-radius:15px}.dl-cinema-video iframe,.dl-cinema-video video,.dl-cinema-video::after,.dl-cinema-video .dl-cinema-shine{border-radius:15px}.dl-cinema-video::before{inset:-7%;filter:blur(20px);opacity:.58}.dl-cinema-video::after{box-shadow:inset 0 1px 0 rgba(255,255,255,.10),inset 0 -26px 58px rgba(0,0,0,.16),0 13px 30px rgba(0,0,0,.28)}}
      @media(prefers-reduced-motion:reduce){.dl-cinema-video::before,.dl-cinema-video .dl-cinema-shine::before{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  const wrap=(media)=>{
    if(!(media instanceof Element)||media.closest('.dl-cinema-video')) return;
    const src=(media.getAttribute('src')||'').toLowerCase();
    const isVideo=media.tagName==='VIDEO'||media.tagName==='IFRAME';
    if(!isVideo) return;
    if(media.tagName==='IFRAME' && !(src.includes('youtube.com')||src.includes('youtu.be')||src.includes('vimeo.com'))) return;
    const parent=media.parentElement;
    if(!parent) return;
    parent.classList.add('dl-cinema-host');
    const shell=document.createElement('div');
    shell.className='dl-cinema-video';
    parent.insertBefore(shell,media);
    shell.appendChild(media);
    const shine=document.createElement('span');
    shine.className='dl-cinema-shine';
    shell.appendChild(shine);
    media.setAttribute('playsinline','');
    if(media.tagName==='VIDEO') media.setAttribute('webkit-playsinline','');
    shell.addEventListener('pointermove',e=>{
      const r=shell.getBoundingClientRect();
      shell.style.setProperty('--dl-cx',`${((e.clientX-r.left)/Math.max(1,r.width))*100}%`);
      shell.style.setProperty('--dl-cy',`${((e.clientY-r.top)/Math.max(1,r.height))*100}%`);
    },{passive:true});
    shell.addEventListener('pointerleave',()=>{shell.style.setProperty('--dl-cx','50%');shell.style.setProperty('--dl-cy','50%')},{passive:true});
    observer?.observe(shell);
  };
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('is-visible',e.isIntersecting)),{threshold:.28}):null;
  const scan=()=>document.querySelectorAll('iframe[src*="youtube" i],iframe[src*="youtu.be" i],iframe[src*="vimeo" i],video').forEach(wrap);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',scan,{once:true}); else scan();
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();
