(() => {
  'use strict';

  // Dingloft National Days · v3
  // Componente visual 100% local: no Firebase, no backend, no geolocalización, no APIs externas.
  // Una fecha patria/nacional principal por país/estado; fechas móviles especiales se resuelven abajo.
  if (window.DingloftNationalDays || window.__DINGLOFT_NATIONAL_DAYS_V3__) return;
  window.__DINGLOFT_NATIONAL_DAYS_V3__ = true;

  const VERSION = '3';
  const ROOT_ID = 'dlNationalDayRoot';
  const STYLE_ID = 'dlNationalDayStyle';
  const STORAGE_PREFIX = 'dingloft_national_day_hidden_';

  const CALENDAR = [
    ['AD','Andorra','09-08','Día Nacional'],
    ['AE','Emiratos Árabes Unidos','12-02','Día Nacional'],
    ['AF','Afganistán','08-19','Día de la Independencia'],
    ['AG','Antigua y Barbuda','11-01','Día de la Independencia'],
    ['AL','Albania','11-28','Día de la Independencia'],
    ['AM','Armenia','09-21','Día de la Independencia'],
    ['AO','Angola','11-11','Día de la Independencia'],
    ['AR','Argentina','07-09','Día de la Independencia'],
    ['AT','Austria','10-26','Día Nacional'],
    ['AU','Australia','01-26','Día de Australia'],
    ['AZ','Azerbaiyán','05-28','Día de la Independencia'],
    ['BA','Bosnia y Herzegovina','03-01','Día de la Independencia'],
    ['BB','Barbados','11-30','Día de la Independencia'],
    ['BD','Bangladés','03-26','Día de la Independencia'],
    ['BE','Bélgica','07-21','Día Nacional'],
    ['BF','Burkina Faso','12-11','Día Nacional'],
    ['BG','Bulgaria','03-03','Día de la Liberación'],
    ['BH','Baréin','12-16','Día Nacional'],
    ['BI','Burundi','07-01','Día de la Independencia'],
    ['BJ','Benín','08-01','Día de la Independencia'],
    ['BN','Brunéi','02-23','Día Nacional'],
    ['BO','Bolivia','08-06','Día de la Independencia'],
    ['BR','Brasil','09-07','Día de la Independencia'],
    ['BS','Bahamas','07-10','Día de la Independencia'],
    ['BT','Bután','12-17','Día Nacional'],
    ['BW','Botsuana','09-30','Día de la Independencia'],
    ['BY','Bielorrusia','07-03','Día de la Independencia'],
    ['BZ','Belice','09-21','Día de la Independencia'],
    ['CA','Canadá','07-01','Día de Canadá'],
    ['CD','República Democrática del Congo','06-30','Día de la Independencia'],
    ['CF','República Centroafricana','12-01','Día Nacional'],
    ['CG','República del Congo','08-15','Día Nacional'],
    ['CH','Suiza','08-01','Día Nacional'],
    ['CI','Costa de Marfil','08-07','Día de la Independencia'],
    ['CL','Chile','09-18','Día de la Independencia'],
    ['CM','Camerún','05-20','Día Nacional'],
    ['CN','China','10-01','Día Nacional'],
    ['CO','Colombia','07-20','Día de la Independencia'],
    ['CR','Costa Rica','09-15','Día de la Independencia'],
    ['CU','Cuba','01-01','Día de la Liberación'],
    ['CV','Cabo Verde','07-05','Día de la Independencia'],
    ['CY','Chipre','10-01','Día de la Independencia'],
    ['CZ','Chequia','10-28','Día del Estado Independiente'],
    ['DE','Alemania','10-03','Día de la Unidad Alemana'],
    ['DJ','Yibuti','06-27','Día de la Independencia'],
    ['DK','Dinamarca','06-05','Día de la Constitución'],
    ['DM','Dominica','11-03','Día de la Independencia'],
    ['DO','República Dominicana','02-27','Día de la Independencia'],
    ['DZ','Argelia','07-05','Día de la Independencia'],
    ['EC','Ecuador','08-10','Día de la Independencia'],
    ['EE','Estonia','02-24','Día de la Independencia'],
    ['EG','Egipto','07-23','Día de la Revolución'],
    ['ER','Eritrea','05-24','Día de la Independencia'],
    ['ES','España','10-12','Fiesta Nacional'],
    ['ET','Etiopía','05-28','Día Nacional'],
    ['FI','Finlandia','12-06','Día de la Independencia'],
    ['FJ','Fiyi','10-10','Día de Fiyi'],
    ['FM','Micronesia','11-03','Día de la Independencia'],
    ['FR','Francia','07-14','Fiesta Nacional'],
    ['GA','Gabón','08-17','Día de la Independencia'],
    ['GB','Reino Unido','06-15','Celebración nacional'],
    ['GD','Granada','02-07','Día de la Independencia'],
    ['GE','Georgia','05-26','Día de la Independencia'],
    ['GH','Ghana','03-06','Día de la Independencia'],
    ['GM','Gambia','02-18','Día de la Independencia'],
    ['GN','Guinea','10-02','Día de la Independencia'],
    ['GQ','Guinea Ecuatorial','10-12','Día de la Independencia'],
    ['GR','Grecia','03-25','Día de la Independencia'],
    ['GT','Guatemala','09-15','Día de la Independencia'],
    ['GW','Guinea-Bisáu','09-24','Día de la Independencia'],
    ['GY','Guyana','05-26','Día de la Independencia'],
    ['HN','Honduras','09-15','Día de la Independencia'],
    ['HR','Croacia','05-30','Día Nacional'],
    ['HT','Haití','01-01','Día de la Independencia'],
    ['HU','Hungría','08-20','Día de San Esteban'],
    ['ID','Indonesia','08-17','Día de la Independencia'],
    ['IE','Irlanda','03-17','Día de San Patricio'],
    ['IL','Israel','05-14','Día de la Independencia'],
    ['IN','India','08-15','Día de la Independencia'],
    ['IQ','Irak','10-03','Día de la Independencia'],
    ['IR','Irán','02-11','Día de la Revolución Islámica'],
    ['IS','Islandia','06-17','Día Nacional'],
    ['IT','Italia','06-02','Día de la República'],
    ['JM','Jamaica','08-06','Día de la Independencia'],
    ['JO','Jordania','05-25','Día de la Independencia'],
    ['JP','Japón','02-11','Día de la Fundación Nacional'],
    ['KE','Kenia','12-12','Día de Jamhuri'],
    ['KG','Kirguistán','08-31','Día de la Independencia'],
    ['KH','Camboya','11-09','Día de la Independencia'],
    ['KI','Kiribati','07-12','Día de la Independencia'],
    ['KM','Comoras','07-06','Día Nacional'],
    ['KN','San Cristóbal y Nieves','09-19','Día de la Independencia'],
    ['KP','Corea del Norte','09-09','Día de la Fundación de la República'],
    ['KR','Corea del Sur','08-15','Día de la Liberación Nacional'],
    ['KW','Kuwait','02-25','Día Nacional'],
    ['KZ','Kazajistán','12-16','Día de la Independencia'],
    ['LA','Laos','12-02','Día Nacional'],
    ['LB','Líbano','11-22','Día de la Independencia'],
    ['LC','Santa Lucía','02-22','Día de la Independencia'],
    ['LI','Liechtenstein','08-15','Día Nacional'],
    ['LK','Sri Lanka','02-04','Día de la Independencia'],
    ['LR','Liberia','07-26','Día de la Independencia'],
    ['LS','Lesoto','10-04','Día de la Independencia'],
    ['LT','Lituania','02-16','Día de la Restauración del Estado'],
    ['LU','Luxemburgo','06-23','Día Nacional'],
    ['LV','Letonia','11-18','Día de la Proclamación'],
    ['LY','Libia','12-24','Día de la Independencia'],
    ['MA','Marruecos','11-18','Día de la Independencia'],
    ['MC','Mónaco','11-19','Día Nacional'],
    ['MD','Moldavia','08-27','Día de la Independencia'],
    ['ME','Montenegro','05-21','Día de la Independencia'],
    ['MG','Madagascar','06-26','Día de la Independencia'],
    ['MH','Islas Marshall','05-01','Día de la Constitución'],
    ['MK','Macedonia del Norte','09-08','Día de la Independencia'],
    ['ML','Malí','09-22','Día de la Independencia'],
    ['MM','Myanmar','01-04','Día de la Independencia'],
    ['MN','Mongolia','11-26','Día de la República'],
    ['MR','Mauritania','11-28','Día de la Independencia'],
    ['MT','Malta','09-21','Día de la Independencia'],
    ['MU','Mauricio','03-12','Día de la Independencia'],
    ['MV','Maldivas','07-26','Día de la Independencia'],
    ['MW','Malaui','07-06','Día de la Independencia'],
    ['MX','México','09-16','Día de la Independencia'],
    ['MY','Malasia','08-31','Día Nacional'],
    ['MZ','Mozambique','06-25','Día de la Independencia'],
    ['NA','Namibia','03-21','Día de la Independencia'],
    ['NE','Níger','12-18','Día de la República'],
    ['NG','Nigeria','10-01','Día de la Independencia'],
    ['NI','Nicaragua','09-15','Día de la Independencia'],
    ['NL','Países Bajos','04-27','Día del Rey'],
    ['NO','Noruega','05-17','Día de la Constitución'],
    ['NP','Nepal','09-19','Día de la Constitución'],
    ['NR','Nauru','01-31','Día de la Independencia'],
    ['NZ','Nueva Zelanda','02-06','Día de Waitangi'],
    ['OM','Omán','11-20','Día Nacional'],
    ['PA','Panamá','11-03','Día de la Separación'],
    ['PE','Perú','07-28','Día de la Independencia'],
    ['PG','Papúa Nueva Guinea','09-16','Día de la Independencia'],
    ['PH','Filipinas','06-12','Día de la Independencia'],
    ['PK','Pakistán','08-14','Día de la Independencia'],
    ['PL','Polonia','11-11','Día de la Independencia'],
    ['PS','Palestina','11-15','Día de la Independencia'],
    ['PT','Portugal','06-10','Día de Portugal'],
    ['PW','Palaos','10-01','Día de la Independencia'],
    ['PY','Paraguay','05-14','Día de la Independencia'],
    ['QA','Catar','12-18','Día Nacional'],
    ['RO','Rumania','12-01','Día de la Gran Unión'],
    ['RS','Serbia','02-15','Día Nacional'],
    ['RU','Rusia','06-12','Día de Rusia'],
    ['RW','Ruanda','07-01','Día de la Independencia'],
    ['SA','Arabia Saudita','09-23','Día Nacional'],
    ['SB','Islas Salomón','07-07','Día de la Independencia'],
    ['SC','Seychelles','06-29','Día Nacional'],
    ['SD','Sudán','01-01','Día de la Independencia'],
    ['SE','Suecia','06-06','Día Nacional'],
    ['SG','Singapur','08-09','Día Nacional'],
    ['SI','Eslovenia','06-25','Día de la Estatalidad'],
    ['SK','Eslovaquia','09-01','Día de la Constitución'],
    ['SL','Sierra Leona','04-27','Día de la Independencia'],
    ['SM','San Marino','09-03','Día de la Fundación'],
    ['SN','Senegal','04-04','Día de la Independencia'],
    ['SO','Somalia','07-01','Día de la Independencia'],
    ['SR','Surinam','11-25','Día de la Independencia'],
    ['SS','Sudán del Sur','07-09','Día de la Independencia'],
    ['ST','Santo Tomé y Príncipe','07-12','Día de la Independencia'],
    ['SV','El Salvador','09-15','Día de la Independencia'],
    ['SY','Siria','04-17','Día de la Evacuación'],
    ['SZ','Esuatini','09-06','Día de la Independencia'],
    ['TD','Chad','08-11','Día de la Independencia'],
    ['TG','Togo','04-27','Día de la Independencia'],
    ['TH','Tailandia','12-05','Día Nacional'],
    ['TJ','Tayikistán','09-09','Día de la Independencia'],
    ['TL','Timor-Leste','05-20','Día de la Independencia'],
    ['TM','Turkmenistán','09-27','Día de la Independencia'],
    ['TN','Túnez','03-20','Día de la Independencia'],
    ['TO','Tonga','06-04','Día de la Emancipación'],
    ['TR','Turquía','10-29','Día de la República'],
    ['TT','Trinidad y Tobago','08-31','Día de la Independencia'],
    ['TV','Tuvalu','10-01','Día de la Independencia'],
    ['TW','Taiwán','10-10','Día Nacional'],
    ['TZ','Tanzania','12-09','Día de la Independencia'],
    ['UA','Ucrania','08-24','Día de la Independencia'],
    ['UG','Uganda','10-09','Día de la Independencia'],
    ['US','Estados Unidos','07-04','Día de la Independencia'],
    ['UY','Uruguay','08-25','Día de la Independencia'],
    ['UZ','Uzbekistán','09-01','Día de la Independencia'],
    ['VA','Ciudad del Vaticano','02-11','Día de los Pactos de Letrán'],
    ['VC','San Vicente y las Granadinas','10-27','Día de la Independencia'],
    ['VE','Venezuela','07-05','Día de la Independencia'],
    ['VN','Vietnam','09-02','Día Nacional'],
    ['VU','Vanuatu','07-30','Día de la Independencia'],
    ['WS','Samoa','06-01','Día de la Independencia'],
    ['XK','Kosovo','02-17','Día de la Independencia'],
    ['YE','Yemen','05-22','Día de la Unidad'],
    ['ZA','Sudáfrica','04-27','Día de la Libertad'],
    ['ZM','Zambia','10-24','Día de la Independencia'],
    ['ZW','Zimbabue','04-18','Día de la Independencia'],
  ].map(([code,country,date,label]) => ({code,country,date,label}));

  // Algunas celebraciones no usan una fecha gregoriana fija.
  const ISRAEL_OBSERVED = {
    2024:'05-14', 2025:'05-01', 2026:'04-22', 2027:'05-12', 2028:'05-02',
    2029:'04-19', 2030:'05-08', 2031:'04-29', 2032:'04-15', 2033:'05-04',
    2034:'04-25', 2035:'05-15', 2036:'05-01'
  };

  const pad = n => String(n).padStart(2,'0');
  const localKey = d => `${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dayStamp = d => `${d.getFullYear()}-${localKey(d)}`;
  const flag = code => {
    const clean=String(code||'').toUpperCase();
    if(!/^[A-Z]{2}$/.test(clean)) return '🏳️';
    return [...clean].map(c=>String.fromCodePoint(127397+c.charCodeAt(0))).join('');
  };
  const thirdSaturdayOfJune = year => {
    const d=new Date(year,5,1,12,0,0,0);
    const offset=(6-d.getDay()+7)%7;
    d.setDate(1+offset+14);
    return localKey(d);
  };

  function eventsFor(dateKey, year) {
    const result=CALENDAR.filter(item=>item.date===dateKey && !['GB','IL'].includes(item.code));
    if(dateKey===thirdSaturdayOfJune(year)) result.push({code:'GB',country:'Reino Unido',date:dateKey,label:'Cumpleaños oficial del Rey'});
    const il=ISRAEL_OBSERVED[year] || '05-14';
    if(dateKey===il) result.push({code:'IL',country:'Israel',date:dateKey,label:'Día de la Independencia'});
    return result;
  }

  function injectStyle() {
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #${ROOT_ID}{position:fixed;top:max(82px,calc(env(safe-area-inset-top) + 70px));right:18px;z-index:2147481200;width:min(374px,calc(100vw - 28px));font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f7f8fa;pointer-events:none;-webkit-font-smoothing:antialiased}
      #${ROOT_ID} *{box-sizing:border-box}
      .dl-nd-card{position:relative;overflow:hidden;pointer-events:auto;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:#0a0d10;box-shadow:0 22px 56px rgba(0,0,0,.28);transform-origin:top right;animation:dlNdIn .52s cubic-bezier(.2,.85,.2,1) both}
      .dl-nd-card::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 88% 12%,rgba(183,255,52,.16),transparent 31%),linear-gradient(120deg,rgba(255,255,255,.045),transparent 44%)}
      .dl-nd-card::after{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#b7ff34;opacity:.92}
      .dl-nd-inner{position:relative;display:grid;grid-template-columns:72px minmax(0,1fr) 30px;gap:13px;align-items:center;padding:15px 14px 15px 16px}
      .dl-nd-flagbox{height:60px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#11161b;display:grid;place-items:center;position:relative;overflow:hidden}
      .dl-nd-flag{font-size:38px;line-height:1;filter:drop-shadow(0 8px 12px rgba(0,0,0,.25));animation:dlNdFlag 3.4s ease-in-out infinite}
      .dl-nd-copy{min-width:0}
      .dl-nd-kicker{display:flex;align-items:center;gap:6px;color:#b7ff34;font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;margin-bottom:5px}
      .dl-nd-kicker::before{content:"";width:5px;height:5px;border-radius:50%;background:#b7ff34;box-shadow:0 0 0 4px rgba(183,255,52,.08)}
      .dl-nd-country{margin:0;color:#fff;font-size:16px;line-height:1.08;font-weight:850;letter-spacing:-.025em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-label{margin:5px 0 0;color:#aab2bc;font-size:10px;line-height:1.35;font-weight:600}
      .dl-nd-close{width:28px;height:28px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#12171d;color:#89939f;display:grid;place-items:center;padding:0;cursor:pointer;transition:background .2s,color .2s,border-color .2s,transform .2s}
      .dl-nd-close:hover{background:#fff;color:#090b0e;border-color:#fff;transform:scale(1.03)}
      .dl-nd-close svg{width:13px;height:13px}
      .dl-nd-multi{position:relative;display:flex;align-items:center;gap:7px;border-top:1px solid rgba(255,255,255,.08);padding:8px 15px 9px 16px;background:rgba(255,255,255,.018)}
      .dl-nd-multi small{margin-right:auto;color:#747f8b;font-size:7px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}
      .dl-nd-mini{font-size:18px;line-height:1;opacity:.48;filter:saturate(.8);transition:opacity .25s,transform .25s;cursor:pointer}
      .dl-nd-mini.active{opacity:1;transform:translateY(-1px) scale(1.06);filter:none}
      .dl-nd-count{min-width:24px;height:18px;padding:0 6px;border-radius:999px;background:#b7ff34;color:#090b0e;display:grid;place-items:center;font-size:8px;font-weight:950}
      .dl-nd-spark{position:absolute;width:3px;height:3px;border-radius:50%;background:#b7ff34;opacity:0;pointer-events:none;animation:dlNdSpark 3.7s ease-in-out infinite}
      .dl-nd-s1{top:13px;right:62px;animation-delay:.15s}.dl-nd-s2{top:37px;right:31px;animation-delay:1.1s}.dl-nd-s3{bottom:14px;left:82px;animation-delay:2.05s}
      .dl-nd-card.is-switching .dl-nd-flag,.dl-nd-card.is-switching .dl-nd-copy{animation:dlNdSwap .3s ease both}
      .dl-nd-card.is-compact .dl-nd-inner{grid-template-columns:42px minmax(0,1fr) 28px;padding:9px 10px 9px 12px;gap:10px}
      .dl-nd-card.is-compact .dl-nd-flagbox{height:38px;border-radius:10px}.dl-nd-card.is-compact .dl-nd-flag{font-size:25px}
      .dl-nd-card.is-compact .dl-nd-label,.dl-nd-card.is-compact .dl-nd-multi{display:none}.dl-nd-card.is-compact .dl-nd-country{font-size:12px}.dl-nd-card.is-compact .dl-nd-kicker{font-size:6.7px;margin-bottom:2px}
      @keyframes dlNdIn{from{opacity:0;transform:translateY(-10px) scale(.97)}to{opacity:1;transform:none}}
      @keyframes dlNdFlag{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-3px) rotate(1deg)}}
      @keyframes dlNdSpark{0%,72%,100%{opacity:0;transform:scale(.4)}78%{opacity:.9;transform:scale(1.9)}84%{opacity:0;transform:scale(.7)}}
      @keyframes dlNdSwap{0%{opacity:1;transform:none}45%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:none}}
      @media(max-width:620px){#${ROOT_ID}{top:max(72px,calc(env(safe-area-inset-top) + 62px));right:10px;width:calc(100vw - 20px)}.dl-nd-inner{grid-template-columns:62px minmax(0,1fr) 30px;padding:13px 12px 13px 14px}.dl-nd-flagbox{height:54px}.dl-nd-country{font-size:14px}}
      html.dgn-cart-open #${ROOT_ID},body.dl-support-open #${ROOT_ID}{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transition:opacity .16s ease,visibility .16s ease}
      @media(prefers-reduced-motion:reduce){.dl-nd-card,.dl-nd-flag,.dl-nd-spark,.dl-nd-card.is-switching .dl-nd-flag,.dl-nd-card.is-switching .dl-nd-copy{animation:none!important;transition:none!important}}
      @media print{#${ROOT_ID}{display:none!important}}
    `;
    (document.head||document.documentElement).appendChild(s);
  }

  let rotateTimer=0;
  let compactTimer=0;
  let currentEvents=[];
  let activeIndex=0;
  let activeStamp='';

  function remove() {
    clearInterval(rotateTimer); clearTimeout(compactTimer);
    rotateTimer=0; compactTimer=0;
    document.getElementById(ROOT_ID)?.remove();
  }

  function paint(index, animate=true) {
    const root=document.getElementById(ROOT_ID); if(!root||!currentEvents.length) return;
    activeIndex=((index%currentEvents.length)+currentEvents.length)%currentEvents.length;
    const event=currentEvents[activeIndex];
    const card=root.querySelector('.dl-nd-card');
    if(animate){card?.classList.add('is-switching');setTimeout(()=>card?.classList.remove('is-switching'),310)}
    root.querySelector('.dl-nd-flag').textContent=flag(event.code);
    root.querySelector('.dl-nd-country').textContent=event.country;
    root.querySelector('.dl-nd-label').textContent=event.label;
    root.querySelectorAll('.dl-nd-mini').forEach((node,i)=>node.classList.toggle('active',i===activeIndex));
  }

  function render(events, stamp, options={}) {
    remove();
    if(!events.length) return false;
    if(!options.force){
      try{if(localStorage.getItem(STORAGE_PREFIX+stamp)==='1') return false}catch(_){}
    }
    injectStyle();
    currentEvents=events;activeIndex=0;activeStamp=stamp;
    const root=document.createElement('div'); root.id=ROOT_ID; root.setAttribute('role','status'); root.setAttribute('aria-live','polite');
    const multi=events.length>1;
    root.innerHTML=`<section class="dl-nd-card" aria-label="Celebración nacional del día">
      <i class="dl-nd-spark dl-nd-s1"></i><i class="dl-nd-spark dl-nd-s2"></i><i class="dl-nd-spark dl-nd-s3"></i>
      <div class="dl-nd-inner">
        <div class="dl-nd-flagbox" aria-hidden="true"><span class="dl-nd-flag"></span></div>
        <div class="dl-nd-copy"><div class="dl-nd-kicker">${multi?`Hoy celebramos · ${events.length} países`:'Hoy celebramos'}</div><h3 class="dl-nd-country"></h3><p class="dl-nd-label"></p></div>
        <button class="dl-nd-close" type="button" aria-label="Ocultar celebración por hoy" title="Ocultar por hoy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      ${multi?`<div class="dl-nd-multi"><small>Fiestas patrias de hoy</small>${events.map((e,i)=>`<button class="dl-nd-mini ${i===0?'active':''}" type="button" data-index="${i}" aria-label="${e.country}">${flag(e.code)}</button>`).join('')}<span class="dl-nd-count">${events.length}</span></div>`:''}
    </section>`;
    (document.body||document.documentElement).appendChild(root);
    paint(0,false);
    root.querySelector('.dl-nd-close').addEventListener('click',()=>{try{localStorage.setItem(STORAGE_PREFIX+stamp,'1')}catch(_){} remove()});
    root.querySelectorAll('.dl-nd-mini').forEach(btn=>btn.addEventListener('click',()=>{paint(Number(btn.dataset.index)||0);restartRotation()}));
    const card=root.querySelector('.dl-nd-card');
    card.addEventListener('click',e=>{if(e.target.closest('button'))return;if(card.classList.contains('is-compact')){card.classList.remove('is-compact');clearTimeout(compactTimer);compactTimer=setTimeout(()=>card.classList.add('is-compact'),12000)}});
    compactTimer=setTimeout(()=>card?.classList.add('is-compact'),12000);
    restartRotation();
    return true;
  }

  function restartRotation() {
    clearInterval(rotateTimer);rotateTimer=0;
    if(currentEvents.length<2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    rotateTimer=setInterval(()=>paint(activeIndex+1),4800);
  }

  let renderedDayStamp='';
  let rolloverTimer=0;

  function renderToday() {
    const now=new Date();
    renderedDayStamp=dayStamp(now);
    return render(eventsFor(localKey(now),now.getFullYear()),renderedDayStamp);
  }

  function scheduleLocalRollover(){
    clearTimeout(rolloverTimer);
    const now=new Date();
    const next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,2,0);
    rolloverTimer=setTimeout(()=>{
      remove();
      renderToday();
      scheduleLocalRollover();
    },Math.max(1000,next.getTime()-now.getTime()));
  }

  function syncLocalDay(){
    const now=new Date();
    if(dayStamp(now)!==renderedDayStamp){
      remove();
      renderToday();
      scheduleLocalRollover();
    }
  }

  function previewDate(dateKey, year=(new Date()).getFullYear()) {
    const clean=String(dateKey||'').trim();
    const events=eventsFor(clean,Number(year)||new Date().getFullYear());
    return render(events,`preview-${year}-${clean}`,{force:true});
  }
  function preview(countryCode) {
    const code=String(countryCode||'').toUpperCase();
    const base=CALENDAR.find(e=>e.code===code);
    if(!base)return false;
    return render([base],`preview-${code}`,{force:true});
  }

  window.DingloftNationalDays={version:VERSION,count:CALENDAR.length,events:CALENDAR.slice(),today:renderToday,preview,previewDate,hide:remove};

  if(window.self!==window.top) return;
  if(/^\/(?:admin|admin\.html|commerce-admin|commerce-admin\.html)(?:\/|$)/i.test(location.pathname)) return;
  const start=()=>{
    renderToday();
    scheduleLocalRollover();
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncLocalDay()},{passive:true});
    window.addEventListener('pageshow',syncLocalDay,{passive:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
