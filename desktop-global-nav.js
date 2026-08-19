(() => {
'use strict';
if(window.top!==window.self)return;
const DESKTOP=matchMedia('(min-width:900px) and (pointer:fine)').matches;
if(!DESKTOP)return;
const file=(location.pathname.split('/').filter(Boolean).pop()||'index.html').toLowerCase();
if(file==='desktop-shell.html')return;
const src=`${location.pathname.split('/').filter(Boolean).pop()||'index.html'}${location.search}${location.hash}`;
const u=new URL('/desktop-shell.html',location.origin);u.searchParams.set('src',src);
location.replace(`${u.pathname}${u.search}`);
})();