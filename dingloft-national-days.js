(() => {
  'use strict';

  // Dingloft National Days · v6
  // 100% local: no Firebase, no backend, no geolocalización precisa, no APIs externas.
  // En la fecha oficial celebra globalmente; 4 días antes muestra una cuenta regresiva
  // del país local inferido únicamente desde zona horaria/idioma del dispositivo.
  if (window.DingloftNationalDays || window.__DINGLOFT_NATIONAL_DAYS_V6__) return;
  window.__DINGLOFT_NATIONAL_DAYS_V6__ = true;

  const VERSION = '6';
  const LEAD_DAYS = 4;
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

  const TIMEZONE_COUNTRY = {
    'America/Guatemala':'GT','America/Mexico_City':'MX','America/Cancun':'MX','America/Monterrey':'MX','America/Tijuana':'MX',
    'America/New_York':'US','America/Chicago':'US','America/Denver':'US','America/Los_Angeles':'US','America/Phoenix':'US','Pacific/Honolulu':'US',
    'America/Toronto':'CA','America/Vancouver':'CA','America/Edmonton':'CA','America/Winnipeg':'CA','America/Halifax':'CA',
    'America/Belize':'BZ','America/Costa_Rica':'CR','America/El_Salvador':'SV','America/Tegucigalpa':'HN','America/Managua':'NI','America/Panama':'PA',
    'America/Havana':'CU','America/Santo_Domingo':'DO','America/Port-au-Prince':'HT','America/Jamaica':'JM','America/Puerto_Rico':'PR',
    'America/Bogota':'CO','America/Lima':'PE','America/Caracas':'VE','America/Guayaquil':'EC','America/La_Paz':'BO','America/Asuncion':'PY',
    'America/Santiago':'CL','America/Argentina/Buenos_Aires':'AR','America/Montevideo':'UY','America/Sao_Paulo':'BR',
    'Europe/Madrid':'ES','Europe/Lisbon':'PT','Europe/London':'GB','Europe/Dublin':'IE','Europe/Paris':'FR','Europe/Berlin':'DE','Europe/Rome':'IT',
    'Europe/Amsterdam':'NL','Europe/Brussels':'BE','Europe/Zurich':'CH','Europe/Vienna':'AT','Europe/Warsaw':'PL','Europe/Prague':'CZ','Europe/Bratislava':'SK',
    'Europe/Budapest':'HU','Europe/Bucharest':'RO','Europe/Athens':'GR','Europe/Sofia':'BG','Europe/Belgrade':'RS','Europe/Zagreb':'HR','Europe/Ljubljana':'SI',
    'Europe/Oslo':'NO','Europe/Stockholm':'SE','Europe/Copenhagen':'DK','Europe/Helsinki':'FI','Europe/Tallinn':'EE','Europe/Riga':'LV','Europe/Vilnius':'LT',
    'Europe/Kyiv':'UA','Europe/Moscow':'RU','Europe/Istanbul':'TR',
    'Asia/Tokyo':'JP','Asia/Seoul':'KR','Asia/Shanghai':'CN','Asia/Hong_Kong':'HK','Asia/Taipei':'TW','Asia/Singapore':'SG','Asia/Kuala_Lumpur':'MY',
    'Asia/Bangkok':'TH','Asia/Jakarta':'ID','Asia/Manila':'PH','Asia/Kolkata':'IN','Asia/Karachi':'PK','Asia/Dhaka':'BD','Asia/Kathmandu':'NP',
    'Asia/Dubai':'AE','Asia/Riyadh':'SA','Asia/Qatar':'QA','Asia/Kuwait':'KW','Asia/Jerusalem':'IL','Asia/Amman':'JO','Asia/Beirut':'LB',
    'Australia/Sydney':'AU','Australia/Melbourne':'AU','Australia/Brisbane':'AU','Australia/Perth':'AU','Pacific/Auckland':'NZ',
    'Africa/Cairo':'EG','Africa/Johannesburg':'ZA','Africa/Nairobi':'KE','Africa/Lagos':'NG','Africa/Casablanca':'MA','Africa/Accra':'GH','Africa/Addis_Ababa':'ET'
  };


  const NEARBY_GROUP_DAYS = 1;
  const pad = n => String(n).padStart(2,'0');
  const localKey = d => `${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dayStamp = d => `${d.getFullYear()}-${localKey(d)}`;
  const atNoon = d => new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0,0);
  const dateFromKey = (dateKey, year) => {
    const [m,d]=String(dateKey||'').split('-').map(Number);
    return new Date(Number(year)||new Date().getFullYear(),(m||1)-1,d||1,12,0,0,0);
  };
  const daysBetween = (fromDate, toDate) => Math.max(0,Math.round((atNoon(toDate).getTime()-atNoon(fromDate).getTime())/86400000));
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

  function inferredCountryCode() {
    const explicit=String(window.DINGLOFT_NATIONAL_COUNTRY||'').trim().toUpperCase();
    if(CALENDAR.some(e=>e.code===explicit)) return explicit;
    try {
      const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
      if(TIMEZONE_COUNTRY[tz] && CALENDAR.some(e=>e.code===TIMEZONE_COUNTRY[tz])) return TIMEZONE_COUNTRY[tz];
    } catch(_) {}
    const langs=[];
    try { if(Array.isArray(navigator.languages)) langs.push(...navigator.languages); } catch(_) {}
    try { if(navigator.language) langs.push(navigator.language); } catch(_) {}
    for(const lang of langs){
      const match=String(lang||'').match(/[-_]([A-Za-z]{2})(?:$|[-_])/);
      const code=match?.[1]?.toUpperCase();
      if(code && CALENDAR.some(e=>e.code===code)) return code;
    }
    return '';
  }

  function withTiming(event, date, daysUntil) {
    return {...event,daysUntil,targetStamp:dayStamp(date),targetKey:localKey(date),targetYear:date.getFullYear()};
  }

  function sortEvents(events, preferred='') {
    return events.slice().sort((a,b)=>{
      const aPref=a.code===preferred?0:1;
      const bPref=b.code===preferred?0:1;
      if(aPref!==bPref) return aPref-bPref;
      const aTime=dateFromKey(a.targetKey||a.date,a.targetYear||new Date().getFullYear()).getTime();
      const bTime=dateFromKey(b.targetKey||b.date,b.targetYear||new Date().getFullYear()).getTime();
      if(aTime!==bTime) return aTime-bTime;
      return a.country.localeCompare(b.country,'es');
    });
  }

  function uniqueEvents(events){
    const seen=new Set();
    return events.filter(event=>{
      const key=`${event.code}-${event.targetKey||event.date}`;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function nearbyGroupedEvents(anchorDate, now, preferredCode='') {
    const items=[];
    const today=atNoon(now);
    for(let offset=-NEARBY_GROUP_DAYS; offset<=NEARBY_GROUP_DAYS; offset++){
      const probe=new Date(anchorDate.getFullYear(),anchorDate.getMonth(),anchorDate.getDate()+offset,12,0,0,0);
      if(probe.getTime()<today.getTime()) continue;
      const list=eventsFor(localKey(probe),probe.getFullYear()).map(event=>withTiming(event,probe,daysBetween(now,probe)));
      items.push(...list);
    }
    return sortEvents(uniqueEvents(items), preferredCode);
  }

  function exactEventsForDate(now) {
    const preferred=inferredCountryCode();
    const todayEvents=eventsFor(localKey(now),now.getFullYear());
    if(!todayEvents.length) return [];
    return nearbyGroupedEvents(now, now, preferred);
  }

  function upcomingLocalEvent(now, leadDays=LEAD_DAYS) {
    const code=inferredCountryCode();
    if(!code) return [];
    for(let offset=1; offset<=leadDays; offset++){
      const probe=new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset,12,0,0,0);
      const event=eventsFor(localKey(probe),probe.getFullYear()).find(e=>e.code===code);
      if(event) return nearbyGroupedEvents(probe, now, code);
    }
    return [];
  }

  function displayEvents(now) {
    const exact=exactEventsForDate(now);
    return exact.length ? exact : upcomingLocalEvent(now);
  }

  const MONTHS=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const eventDateLabel = event => {
    const [m,d]=String(event.targetKey||event.date||'').split('-').map(Number);
    return Number.isFinite(m)&&Number.isFinite(d) ? `${d} ${MONTHS[m-1]||''}` : '';
  };
  const kickerFor = event => event.daysUntil===0 ? 'HOY CELEBRAMOS' : event.daysUntil===1 ? 'FALTA 1 DÍA' : `FALTAN ${event.daysUntil} DÍAS`;
  const countdownFor = event => event.daysUntil===0 ? 'HOY' : String(event.daysUntil);
  const thanksFor = event => `Gracias ${event.country} por confiar en Dingloft`;

  function injectStyle() {
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #${ROOT_ID}{position:fixed;top:calc(var(--dgn-total-h,68px) + 5px);left:10px;z-index:2147481200;width:min(324px,calc(100vw - 20px));font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f7f8fa;pointer-events:none;-webkit-font-smoothing:antialiased}
      #${ROOT_ID} *{box-sizing:border-box}
      .dl-nd-card{--nd-accent:#b7ff34;position:relative;overflow:hidden;pointer-events:auto;border:1px solid rgba(255,255,255,.13);border-radius:18px;background:linear-gradient(135deg,rgba(7,10,13,.985),rgba(7,10,13,.97));box-shadow:0 18px 46px rgba(0,0,0,.34);transform-origin:top left;animation:dlNdIn .5s cubic-bezier(.2,.85,.2,1) both;isolation:isolate}
      .dl-nd-card::before{content:"";position:absolute;inset:-35% -20%;z-index:-2;pointer-events:none;background:radial-gradient(circle at 78% 22%,rgba(183,255,52,.2),transparent 28%),radial-gradient(circle at 20% 80%,rgba(93,156,255,.08),transparent 30%);animation:dlNdAura 7s ease-in-out infinite}
      .dl-nd-card::after{content:"";position:absolute;left:-45%;top:0;width:32%;height:100%;z-index:-1;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.08),transparent);transform:skewX(-14deg);animation:dlNdSweep 6.2s ease-in-out infinite}
      .dl-nd-edge{position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--nd-accent);box-shadow:0 0 22px rgba(183,255,52,.3);opacity:.95}
      .dl-nd-inner{position:relative;display:grid;grid-template-columns:58px minmax(0,1fr) 44px;gap:10px;align-items:center;padding:11px 12px 10px 13px;min-height:78px}
      .dl-nd-flagbox{height:52px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:linear-gradient(145deg,#141b22,#0b1014);display:grid;place-items:center;position:relative;overflow:hidden}
      .dl-nd-flagbox::before{content:"";position:absolute;width:46px;height:46px;border-radius:50%;border:1px solid rgba(183,255,52,.15);opacity:.7;animation:dlNdRing 3.8s ease-in-out infinite}
      .dl-nd-flag{position:relative;font-size:30px;line-height:1;filter:drop-shadow(0 7px 10px rgba(0,0,0,.3));transform-origin:50% 70%;animation:dlNdFlag 3.1s ease-in-out infinite}
      .dl-nd-copy{min-width:0}
      .dl-nd-kicker{display:flex;align-items:center;gap:6px;color:var(--nd-accent);font-size:8.5px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-kicker::before{content:"";width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ddff95 0 28%,var(--nd-accent) 30% 100%);box-shadow:0 0 0 3px rgba(183,255,52,.07),0 0 13px rgba(183,255,52,.18);animation:dlNdDot 1.9s ease-in-out infinite}
      .dl-nd-country{margin:0;color:#fff;font-size:16px;line-height:1.06;font-weight:850;letter-spacing:-.035em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-label{margin:3px 0 0;color:#c7ced6;font-size:8.5px;line-height:1.25;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-thanks{margin:3px 0 0;color:#8e98a4;font-size:8px;line-height:1.25;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-countdown{height:42px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.035);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
      .dl-nd-count-value{color:#fff;font-size:15px;line-height:1;font-weight:900;letter-spacing:-.04em}
      .dl-nd-count-label{color:#6f7a84;font-size:5.5px;line-height:1;font-weight:900;letter-spacing:.15em;text-transform:uppercase}
      .dl-nd-card.is-today .dl-nd-countdown{border-color:rgba(183,255,52,.32);background:rgba(183,255,52,.1)}
      .dl-nd-card.is-today .dl-nd-count-value{color:var(--nd-accent);font-size:10px;letter-spacing:.1em}
      .dl-nd-close{position:absolute;right:6px;top:6px;width:20px;height:20px;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(8,11,14,.7);color:#707a84;display:grid;place-items:center;padding:0;cursor:pointer;opacity:0;transform:translateY(-2px);transition:opacity .2s,transform .2s,background .2s,color .2s,border-color .2s;z-index:3}
      .dl-nd-card:hover .dl-nd-close,.dl-nd-close:focus-visible{opacity:1;transform:none}.dl-nd-close:hover{background:#fff;color:#090b0e;border-color:#fff}.dl-nd-close svg{width:10px;height:10px}
      .dl-nd-spark,.dl-nd-burst{position:absolute;pointer-events:none}
      .dl-nd-spark{width:3px;height:3px;border-radius:50%;background:var(--nd-accent);opacity:0;animation:dlNdSpark 3.6s ease-in-out infinite}
      .dl-nd-s1{top:11px;right:62px;animation-delay:.15s}.dl-nd-s2{top:36px;right:24px;animation-delay:1.1s}.dl-nd-s3{bottom:12px;left:74px;animation-delay:2s}.dl-nd-s4{top:17px;left:92px;animation-delay:2.7s}
      .dl-nd-burst{width:18px;height:18px;opacity:0;animation:dlNdBurst 4.4s ease-in-out infinite}
      .dl-nd-b1{top:13px;right:92px;animation-delay:.6s}.dl-nd-b2{bottom:12px;right:38px;animation-delay:2.25s}
      .dl-nd-burst::before,.dl-nd-burst::after{content:"";position:absolute;left:50%;top:50%;width:1.5px;height:10px;border-radius:999px;background:linear-gradient(180deg,rgba(183,255,52,.92),rgba(183,255,52,0));transform-origin:50% 100%}
      .dl-nd-burst::after{transform:translate(-50%,-50%) rotate(90deg)}
      .dl-nd-burst::before{transform:translate(-50%,-50%) rotate(15deg)}
      .dl-nd-card.is-switching .dl-nd-flag,.dl-nd-card.is-switching .dl-nd-copy,.dl-nd-card.is-switching .dl-nd-countdown{animation:dlNdSwap .32s ease both}
      @keyframes dlNdIn{from{opacity:0;transform:translateY(-12px) scale(.965)}to{opacity:1;transform:none}}
      @keyframes dlNdFlag{0%,100%{transform:translateY(0) rotate(-1.5deg) scale(1)}45%{transform:translateY(-3px) rotate(1.5deg) scale(1.025)}70%{transform:translateY(-1px) rotate(-.6deg) scale(1.01)}}
      @keyframes dlNdRing{0%,100%{opacity:.35;transform:scale(.82)}50%{opacity:.8;transform:scale(1.05)}}
      @keyframes dlNdDot{0%,100%{opacity:.65;transform:scale(.85)}50%{opacity:1;transform:scale(1.18)}}
      @keyframes dlNdAura{0%,100%{transform:translate3d(-1%,0,0) scale(1)}50%{transform:translate3d(2%,-1%,0) scale(1.04)}}
      @keyframes dlNdSweep{0%,62%{opacity:0;transform:translateX(0) skewX(-14deg)}72%{opacity:1}88%,100%{opacity:0;transform:translateX(560%) skewX(-14deg)}}
      @keyframes dlNdSpark{0%,70%,100%{opacity:0;transform:translateY(3px) scale(.35)}77%{opacity:.95;transform:translateY(-2px) scale(1.85)}84%{opacity:0;transform:translateY(-6px) scale(.65)}}
      @keyframes dlNdBurst{0%,72%,100%{opacity:0;transform:translateY(4px) scale(.4)}79%{opacity:.9;transform:translateY(-1px) scale(1)}88%{opacity:0;transform:translateY(-5px) scale(.72)}}
      @keyframes dlNdSwap{0%{opacity:1;transform:none}45%{opacity:0;transform:translateY(5px)}100%{opacity:1;transform:none}}
      @media(max-width:620px){#${ROOT_ID}{top:calc(var(--dgn-total-h,64px) + 5px);left:8px;width:min(310px,calc(100vw - 16px))}.dl-nd-inner{grid-template-columns:54px minmax(0,1fr) 42px;padding:10px 11px 9px 12px;gap:9px}.dl-nd-flagbox{height:48px}.dl-nd-country{font-size:15px}.dl-nd-kicker{font-size:8px}.dl-nd-label{font-size:8px}.dl-nd-thanks{font-size:7.5px}}
      @media(hover:none){.dl-nd-close{opacity:.82;transform:none}}
      html.dgn-cart-open #${ROOT_ID},body.dl-support-open #${ROOT_ID}{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transition:opacity .16s ease,visibility .16s ease}
      @media(prefers-reduced-motion:reduce){.dl-nd-card,.dl-nd-card::before,.dl-nd-card::after,.dl-nd-flagbox::before,.dl-nd-flag,.dl-nd-kicker::before,.dl-nd-spark,.dl-nd-burst,.dl-nd-card.is-switching .dl-nd-flag,.dl-nd-card.is-switching .dl-nd-copy,.dl-nd-card.is-switching .dl-nd-countdown{animation:none!important;transition:none!important}}
      @media print{#${ROOT_ID}{display:none!important}}
    `;
    (document.head||document.documentElement).appendChild(s);
  }

  let rotateTimer=0;
  let currentEvents=[];
  let activeIndex=0;

  function remove() {
    clearInterval(rotateTimer);
    rotateTimer=0;
    document.getElementById(ROOT_ID)?.remove();
  }

  function paint(index, animate=true) {
    const root=document.getElementById(ROOT_ID); if(!root||!currentEvents.length) return;
    activeIndex=((index%currentEvents.length)+currentEvents.length)%currentEvents.length;
    const event=currentEvents[activeIndex];
    const card=root.querySelector('.dl-nd-card');
    if(animate){card?.classList.add('is-switching');setTimeout(()=>card?.classList.remove('is-switching'),330)}
    card?.classList.toggle('is-today',event.daysUntil===0);
    card?.classList.toggle('is-upcoming',event.daysUntil>0);
    root.querySelector('.dl-nd-flag').textContent=flag(event.code);
    root.querySelector('.dl-nd-kicker').textContent=kickerFor(event);
    root.querySelector('.dl-nd-country').textContent=event.country;
    root.querySelector('.dl-nd-label').textContent=`${event.label} · ${eventDateLabel(event)}`;
    root.querySelector('.dl-nd-thanks').textContent=thanksFor(event);
    root.querySelector('.dl-nd-count-value').textContent=countdownFor(event);
    root.querySelector('.dl-nd-count-label').textContent=event.daysUntil===0?'FIESTA':'DÍAS';
  }

  function render(events, stamp, options={}) {
    remove();
    if(!events.length) return false;
    if(!options.force){
      try{if(localStorage.getItem(STORAGE_PREFIX+stamp)==='1') return false}catch(_){}
    }
    injectStyle();
    currentEvents=events;activeIndex=0;
    const root=document.createElement('div'); root.id=ROOT_ID; root.setAttribute('role','status'); root.setAttribute('aria-live','polite');
    root.innerHTML=`<section class="dl-nd-card" aria-label="Celebración nacional">
      <span class="dl-nd-edge" aria-hidden="true"></span>
      <i class="dl-nd-spark dl-nd-s1"></i><i class="dl-nd-spark dl-nd-s2"></i><i class="dl-nd-spark dl-nd-s3"></i><i class="dl-nd-spark dl-nd-s4"></i>
      <i class="dl-nd-burst dl-nd-b1"></i><i class="dl-nd-burst dl-nd-b2"></i>
      <button class="dl-nd-close" type="button" aria-label="Ocultar celebración por hoy" title="Ocultar por hoy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="dl-nd-inner">
        <div class="dl-nd-flagbox" aria-hidden="true"><span class="dl-nd-flag"></span></div>
        <div class="dl-nd-copy"><div class="dl-nd-kicker"></div><h3 class="dl-nd-country"></h3><p class="dl-nd-label"></p><p class="dl-nd-thanks"></p></div>
        <div class="dl-nd-countdown" aria-hidden="true"><strong class="dl-nd-count-value"></strong><span class="dl-nd-count-label"></span></div>
      </div>
    </section>`;
    (document.body||document.documentElement).appendChild(root);
    paint(0,false);
    root.querySelector('.dl-nd-close').addEventListener('click',()=>{try{localStorage.setItem(STORAGE_PREFIX+stamp,'1')}catch(_){} remove()});
    restartRotation();
    return true;
  }

  function restartRotation() {
    clearInterval(rotateTimer);rotateTimer=0;
    if(currentEvents.length<2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    rotateTimer=setInterval(()=>paint(activeIndex+1),4200);
  }

  let renderedDayStamp='';
  let rolloverTimer=0;

  function renderToday() {
    const now=new Date();
    renderedDayStamp=dayStamp(now);
    return render(displayEvents(now),renderedDayStamp);
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
    const [m,d]=clean.split('-').map(Number);
    if(!Number.isFinite(m)||!Number.isFinite(d)) return false;
    const date=new Date(Number(year)||new Date().getFullYear(),m-1,d,12,0,0,0);
    const preferred=inferredCountryCode();
    const events=nearbyGroupedEvents(date,date,preferred).map(event=>event.targetKey===localKey(date) ? {...event,daysUntil:0} : event);
    return render(events,`preview-${date.getFullYear()}-${clean}`,{force:true});
  }

  function preview(countryCode, daysUntil=0) {
    const code=String(countryCode||'').toUpperCase();
    const base=CALENDAR.find(e=>e.code===code);
    if(!base)return false;
    const days=Math.max(0,Math.min(LEAD_DAYS,Number(daysUntil)||0));
    const [m,d]=base.date.split('-').map(Number);
    const target=new Date(new Date().getFullYear(),m-1,d,12,0,0,0);
    const baseNow=new Date(target.getFullYear(),target.getMonth(),target.getDate()-days,12,0,0,0);
    const events=nearbyGroupedEvents(target,baseNow,code);
    return render(events,`preview-${code}-${days}`,{force:true});
  }

  function previewCountdown(countryCode, daysUntil=LEAD_DAYS){ return preview(countryCode,daysUntil); }

  window.DingloftNationalDays={
    version:VERSION,
    leadDays:LEAD_DAYS,
    nearbyGroupDays:NEARBY_GROUP_DAYS,
    count:CALENDAR.length,
    events:CALENDAR.slice(),
    inferredCountry:inferredCountryCode,
    today:renderToday,
    preview,
    previewCountdown,
    previewDate,
    hide:remove
  };

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
