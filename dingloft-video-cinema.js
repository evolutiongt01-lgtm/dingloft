(() => {
  'use strict';
  if (window.__DINGLOFT_VIDEO_CINEMA_V87__) return;
  window.__DINGLOFT_VIDEO_CINEMA_V87__ = true;

  const STYLE_ID='dingloft-cinema-video-style';
  const ua=navigator.userAgent||'';
  const touchMobile=/Android|iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints>0 && matchMedia('(max-width:1024px)').matches);

  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .dl-cinema-host{overflow:visible!important;position:relative!important;isolation:isolate;}
      .dl-cinema-video{--dl-cx:50%;--dl-cy:50%;position:relative;width:100%;aspect-ratio:16/9;border-radius:18px;isolation:isolate;transform:translateZ(0);}
      .ratio>.dl-cinema-video{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;aspect-ratio:auto!important;}
      .dl-cinema-video::before{content:"";position:absolute;z-index:-2;inset:-10%;border-radius:28px;background:radial-gradient(circle at var(--dl-cx) var(--dl-cy),rgba(91,211,255,.26),transparent 35%),radial-gradient(circle at 82% 14%,rgba(113,88,255,.20),transparent 34%),radial-gradient(circle at 12% 86%,rgba(27,151,255,.13),transparent 31%);filter:blur(28px);opacity:.52;transform:scale(.96);transition:opacity .45s ease,transform .6s cubic-bezier(.16,1,.3,1);pointer-events:none;}
      .dl-cinema-video::after{content:"";position:absolute;z-index:3;inset:0;border-radius:18px;pointer-events:none;border:1px solid rgba(171,225,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 -40px 80px rgba(0,0,0,.18),0 18px 44px rgba(0,0,0,.34),0 0 0 1px rgba(83,195,255,.04);background:linear-gradient(125deg,rgba(255,255,255,.07),transparent 20%,transparent 73%,rgba(107,79,255,.05));}
      .dl-cinema-video iframe,.dl-cinema-video video{position:relative;z-index:1;display:block;width:100%!important;height:100%!important;border:0!important;border-radius:18px!important;background:#030507;object-fit:cover;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);}
      .dl-cinema-video .dl-cinema-shine{position:absolute;z-index:2;inset:0;border-radius:18px;pointer-events:none;overflow:hidden;}
      .dl-cinema-video .dl-cinema-shine::before{content:"";position:absolute;top:-45%;bottom:-45%;left:-35%;width:22%;background:linear-gradient(90deg,transparent,rgba(192,236,255,.13),transparent);filter:blur(7px);transform:rotate(14deg) translateX(-160%);opacity:0;}
      .dl-cinema-video.is-visible::before{opacity:.86;transform:scale(1.02);animation:dlAmbient 7s ease-in-out infinite alternate;}
      .dl-cinema-video.is-visible .dl-cinema-shine::before{opacity:.58;animation:dlSweep 7.8s cubic-bezier(.16,1,.3,1) infinite;}
      .dl-cinema-video:hover::before{opacity:1;transform:scale(1.045);}
      @keyframes dlAmbient{0%{filter:blur(28px) hue-rotate(0deg)}100%{filter:blur(34px) hue-rotate(18deg)}}
      @keyframes dlSweep{0%,58%{transform:rotate(14deg) translateX(-180%)}78%,100%{transform:rotate(14deg) translateX(760%)}}

      .dl-video-poster{position:absolute;z-index:4;inset:0;width:100%;height:100%;padding:0;border:0;border-radius:inherit;overflow:hidden;cursor:pointer;background:#05070a;color:#fff;text-align:left;-webkit-tap-highlight-color:transparent;touch-action:pan-y;}
      .dl-video-poster-bg{position:absolute;inset:0;background-position:center;background-size:cover;transform:scale(1.015);filter:saturate(.92) brightness(.70);transition:transform .35s ease,filter .35s ease;}
      .dl-video-poster::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,4,8,.10),rgba(2,4,8,.30) 52%,rgba(2,4,8,.72));pointer-events:none;}
      .dl-video-poster-ui{position:absolute;z-index:2;inset:auto 14px 14px 14px;display:flex;align-items:center;gap:10px;}
      .dl-video-play{width:48px;height:48px;flex:none;border-radius:16px;display:grid;place-items:center;background:rgba(246,252,255,.96);color:#061018;box-shadow:0 12px 34px rgba(0,0,0,.36);}
      .dl-video-play svg{width:21px;height:21px;fill:currentColor;transform:translateX(1px);}
      .dl-video-copy{min-width:0}.dl-video-copy small{display:block;color:#9bdfff;font:800 .54rem/1.1 -apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,sans-serif;letter-spacing:.13em;text-transform:uppercase;margin-bottom:5px}.dl-video-copy strong{display:block;color:#fff;font:800 .76rem/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 8px rgba(0,0,0,.5)}
      .dl-video-poster:active .dl-video-poster-bg{transform:scale(1.035);filter:saturate(1) brightness(.78)}

      .dl-video-modal-v87{position:fixed;inset:0;z-index:2147483647;background:rgba(2,4,7,.985);display:flex;align-items:center;justify-content:center;padding:calc(68px + env(safe-area-inset-top,0px)) 12px calc(24px + env(safe-area-inset-bottom,0px));backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);}
      .dl-video-modal-frame{position:relative;width:min(100%,960px);aspect-ratio:16/9;border-radius:20px;overflow:hidden;background:#000;border:1px solid rgba(255,255,255,.10);box-shadow:0 28px 90px rgba(0,0,0,.65);}
      .dl-video-modal-frame.vertical{width:min(88vw,460px);height:min(78dvh,760px);aspect-ratio:9/16;}
      .dl-video-modal-frame iframe{width:100%;height:100%;border:0;display:block;background:#000;}
      .dl-video-modal-close{position:absolute;z-index:3;top:calc(12px + env(safe-area-inset-top,0px));right:max(12px,env(safe-area-inset-right,0px));width:44px;height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.13);background:rgba(16,20,27,.86);color:#eaf6ff;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 10px 30px rgba(0,0,0,.35)}
      .dl-video-modal-close svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;}
      .dl-video-modal-hint{position:absolute;z-index:2;left:50%;bottom:calc(8px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);padding:7px 11px;border-radius:999px;background:rgba(8,12,18,.74);border:1px solid rgba(255,255,255,.09);color:#8da0b4;font:700 .58rem/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,sans-serif;white-space:nowrap;pointer-events:none;}

      @media(max-width:768px){
        .dl-cinema-video{border-radius:15px}.dl-cinema-video iframe,.dl-cinema-video video,.dl-cinema-video::after,.dl-cinema-video .dl-cinema-shine{border-radius:15px}.dl-cinema-video::before{inset:-7%;filter:blur(20px);opacity:.58}.dl-cinema-video::after{box-shadow:inset 0 1px 0 rgba(255,255,255,.10),inset 0 -26px 58px rgba(0,0,0,.16),0 13px 30px rgba(0,0,0,.28)}
        .dl-video-poster{touch-action:pan-y!important}.dl-video-play{width:46px;height:46px;border-radius:15px}.dl-video-copy strong{font-size:.72rem}
      }
      @media(prefers-reduced-motion:reduce){.dl-cinema-video::before,.dl-cinema-video .dl-cinema-shine::before{animation:none!important}.dl-video-poster-bg{transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  const observer='IntersectionObserver' in window
    ? new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('is-visible',e.isIntersecting)),{threshold:.28})
    : null;

  const isYouTube=(el)=>{
    if(el?.tagName!=='IFRAME') return false;
    const src=(el.getAttribute('src')||'').toLowerCase();
    return src.includes('youtube.com')||src.includes('youtu.be');
  };

  const youtubeId=(src)=>{
    try{
      const u=new URL(src,location.href);
      if(u.hostname.includes('youtu.be')) return u.pathname.split('/').filter(Boolean)[0]||'';
      const parts=u.pathname.split('/').filter(Boolean);
      const embedAt=parts.indexOf('embed');
      if(embedAt>=0 && parts[embedAt+1]) return parts[embedAt+1];
      return u.searchParams.get('v')||'';
    }catch(_){return '';}
  };

  const normalizedYouTube=(src,autoplay=false)=>{
    try{
      const u=new URL(src,location.href);
      u.searchParams.set('playsinline','1');
      u.searchParams.set('rel','0');
      u.searchParams.set('modestbranding','1');
      if(autoplay) u.searchParams.set('autoplay','1');
      return u.href;
    }catch(_){return src;}
  };

  let activeModal=null;
  let savedBody=null;
  let savedScrollY=0;

  const mobileChromeHosts=()=>['dlMobileHeaderV71','dlMobileDockV71'].map(id=>document.getElementById(id)).filter(Boolean);
  const setChromeHidden=(hidden)=>{
    mobileChromeHosts().forEach(el=>{
      if(hidden){
        el.dataset.dlVideoPrevOpacity=el.style.getPropertyValue('opacity')||'';
        el.dataset.dlVideoPrevVisibility=el.style.getPropertyValue('visibility')||'';
        el.dataset.dlVideoPrevPointer=el.style.getPropertyValue('pointer-events')||'';
        el.style.setProperty('opacity','0','important');
        el.style.setProperty('visibility','hidden','important');
        el.style.setProperty('pointer-events','none','important');
      }else{
        el.style.setProperty('opacity','1','important');
        el.style.setProperty('visibility','visible','important');
        el.style.setProperty('pointer-events','auto','important');
        delete el.dataset.dlVideoPrevOpacity; delete el.dataset.dlVideoPrevVisibility; delete el.dataset.dlVideoPrevPointer;
      }
    });
  };

  const lockForVideo=()=>{
    const body=document.body;
    if(!body) return;
    savedScrollY=window.scrollY||window.pageYOffset||0;
    savedBody={
      position:body.style.position,top:body.style.top,left:body.style.left,right:body.style.right,width:body.style.width,
      overflow:body.style.overflow,touchAction:body.style.touchAction
    };
    document.documentElement.classList.add('dl-video-modal-open');
    body.style.setProperty('position','fixed','important');
    body.style.setProperty('top',`${-savedScrollY}px`,'important');
    body.style.setProperty('left','0','important');
    body.style.setProperty('right','0','important');
    body.style.setProperty('width','100%','important');
    body.style.setProperty('overflow','hidden','important');
    body.style.setProperty('touch-action','none','important');
    setChromeHidden(true);
  };

  const restoreFromVideo=()=>{
    const body=document.body;
    document.documentElement.classList.remove('dl-video-modal-open');
    if(body && savedBody){
      const restore=(prop,val)=>val ? body.style.setProperty(prop,val) : body.style.removeProperty(prop);
      restore('position',savedBody.position); restore('top',savedBody.top); restore('left',savedBody.left); restore('right',savedBody.right);
      restore('width',savedBody.width); restore('overflow',savedBody.overflow); restore('touch-action',savedBody.touchAction);
    }
    savedBody=null;
    setChromeHidden(false);
    requestAnimationFrame(()=>window.scrollTo(0,savedScrollY));
  };

  const closeModal=()=>{
    if(!activeModal) return;
    const modal=activeModal;
    activeModal=null;
    modal.remove();
    restoreFromVideo();
  };

  const openMobileVideo=(src,title,vertical)=>{
    closeModal();
    lockForVideo();
    const modal=document.createElement('div');
    modal.className='dl-video-modal-v87';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label',title||'Video Dingloft');
    const close=document.createElement('button');
    close.type='button'; close.className='dl-video-modal-close'; close.setAttribute('aria-label','Cerrar video');
    close.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"></path></svg>';
    const frame=document.createElement('div');
    frame.className=`dl-video-modal-frame${vertical?' vertical':''}`;
    const iframe=document.createElement('iframe');
    iframe.dataset.dlCinemaModal='1';
    iframe.src=normalizedYouTube(src,true);
    iframe.title=title||'Video Dingloft';
    iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen=true;
    iframe.setAttribute('playsinline','');
    frame.appendChild(iframe);
    const hint=document.createElement('div'); hint.className='dl-video-modal-hint'; hint.textContent='Cierra el video para seguir navegando';
    modal.append(close,frame,hint);
    close.addEventListener('click',closeModal);
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
    document.body.appendChild(modal);
    activeModal=modal;
  };

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeModal)closeModal();});
  addEventListener('pagehide',()=>{if(activeModal)closeModal();},{passive:true});

  const makeMobilePoster=(shell,iframe)=>{
    const src=iframe.getAttribute('src')||'';
    const id=youtubeId(src);
    const title=iframe.getAttribute('title')||'Video Dingloft';
    const vertical=Boolean(shell.closest('.ratio-9x16'));
    const poster=document.createElement('button');
    poster.type='button'; poster.className='dl-video-poster'; poster.setAttribute('aria-label',`Reproducir ${title}`);
    const bg=document.createElement('span'); bg.className='dl-video-poster-bg';
    if(id) bg.style.backgroundImage=`url("https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg")`;
    const ui=document.createElement('span'); ui.className='dl-video-poster-ui';
    ui.innerHTML='<span class="dl-video-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></span><span class="dl-video-copy"><small>Video Dingloft</small><strong></strong></span>';
    ui.querySelector('strong').textContent=title;
    poster.append(bg,ui);
    poster.addEventListener('click',()=>openMobileVideo(src,title,vertical));
    iframe.remove();
    shell.insertBefore(poster,shell.firstChild);
  };

  const wrap=(media)=>{
    if(!(media instanceof Element) || media.dataset.dlCinemaModal==='1' || media.closest('.dl-cinema-video')) return;
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
    const shine=document.createElement('span'); shine.className='dl-cinema-shine'; shell.appendChild(shine);
    media.setAttribute('playsinline','');
    if(media.tagName==='VIDEO') media.setAttribute('webkit-playsinline','');
    if(media.tagName==='IFRAME') media.setAttribute('loading','lazy');

    if(touchMobile && isYouTube(media)){
      makeMobilePoster(shell,media);
    }else if(isYouTube(media)){
      media.src=normalizedYouTube(media.getAttribute('src')||'',false);
    }

    shell.addEventListener('pointermove',e=>{
      const r=shell.getBoundingClientRect();
      shell.style.setProperty('--dl-cx',`${((e.clientX-r.left)/Math.max(1,r.width))*100}%`);
      shell.style.setProperty('--dl-cy',`${((e.clientY-r.top)/Math.max(1,r.height))*100}%`);
    },{passive:true});
    shell.addEventListener('pointerleave',()=>{shell.style.setProperty('--dl-cx','50%');shell.style.setProperty('--dl-cy','50%')},{passive:true});
    observer?.observe(shell);
  };

  const scan=()=>document.querySelectorAll('iframe[src*="youtube" i],iframe[src*="youtu.be" i],iframe[src*="vimeo" i],video').forEach(wrap);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',scan,{once:true}); else scan();
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();
