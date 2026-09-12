(() => {
  'use strict';

  // Dingloft National Days · v4
  // 100% local: no Firebase, no backend, no geolocalización precisa, no APIs externas.
  // En la fecha oficial celebra globalmente; 4 días antes muestra una cuenta regresiva
  // del país local inferido únicamente desde zona horaria/idioma del dispositivo.
  if (window.DingloftNationalDays || window.__DINGLOFT_NATIONAL_DAYS_V4__) return;
  window.__DINGLOFT_NATIONAL_DAYS_V4__ = true;

  const VERSION = '4';
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

  function exactEventsForDate(now) {
    const preferred=inferredCountryCode();
    const events=eventsFor(localKey(now),now.getFullYear()).map(e=>withTiming(e,now,0));
    return events.sort((a,b)=>(a.code===preferred?-1:0)-(b.code===preferred?-1:0) || a.country.localeCompare(b.country,'es'));
  }

  function upcomingLocalEvent(now, leadDays=LEAD_DAYS) {
    const code=inferredCountryCode();
    if(!code) return [];
    for(let offset=1; offset<=leadDays; offset++){
      const probe=new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset,12,0,0,0);
      const event=eventsFor(localKey(probe),probe.getFullYear()).find(e=>e.code===code);
      if(event) return [withTiming(event,probe,offset)];
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
  const kickerFor = event => event.daysUntil===0 ? 'Hoy celebramos' : event.daysUntil===1 ? 'Mañana celebramos' : `Faltan ${event.daysUntil} días`;
  const countdownFor = event => event.daysUntil===0 ? 'HOY' : String(event.daysUntil);

  function injectStyle() {
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #${ROOT_ID}{position:fixed;top:max(82px,calc(env(safe-area-inset-top) + 70px));right:18px;z-index:2147481200;width:min(388px,calc(100vw - 28px));font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f7f8fa;pointer-events:none;-webkit-font-smoothing:antialiased}
      #${ROOT_ID} *{box-sizing:border-box}
      .dl-nd-card{--nd-accent:#b7ff34;position:relative;overflow:hidden;pointer-events:auto;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:#080b0e;box-shadow:0 24px 64px rgba(0,0,0,.32);transform-origin:top right;animation:dlNdIn .58s cubic-bezier(.2,.85,.2,1) both;isolation:isolate}
      .dl-nd-card::before{content:"";position:absolute;inset:-35% -20%;z-index:-2;pointer-events:none;background:radial-gradient(circle at 78% 22%,rgba(183,255,52,.18),transparent 27%),radial-gradient(circle at 14% 82%,rgba(255,255,255,.075),transparent 28%);animation:dlNdAura 6s ease-in-out infinite}
      .dl-nd-card::after{content:"";position:absolute;left:-45%;top:0;width:32%;height:100%;z-index:-1;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.085),transparent);transform:skewX(-14deg);animation:dlNdSweep 6.2s ease-in-out infinite}
      .dl-nd-edge{position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--nd-accent);box-shadow:0 0 20px rgba(183,255,52,.32);opacity:.95}
      .dl-nd-inner{position:relative;display:grid;grid-template-columns:76px minmax(0,1fr) 48px;gap:13px;align-items:center;padding:16px 14px 13px 17px}
      .dl-nd-flagbox{height:64px;border:1px solid rgba(255,255,255,.11);border-radius:16px;background:linear-gradient(145deg,#151b21,#0d1115);display:grid;place-items:center;position:relative;overflow:hidden}
      .dl-nd-flagbox::before{content:"";position:absolute;width:62px;height:62px;border-radius:50%;border:1px solid rgba(183,255,52,.16);opacity:.75;animation:dlNdRing 3.8s ease-in-out infinite}
      .dl-nd-flag{position:relative;font-size:40px;line-height:1;filter:drop-shadow(0 9px 13px rgba(0,0,0,.3));transform-origin:50% 70%;animation:dlNdFlag 3.1s ease-in-out infinite}
      .dl-nd-copy{min-width:0}
      .dl-nd-kicker{display:flex;align-items:center;gap:7px;color:var(--nd-accent);font-size:8px;font-weight:900;letter-spacing:.17em;text-transform:uppercase;margin-bottom:5px}
      .dl-nd-kicker::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--nd-accent);box-shadow:0 0 0 4px rgba(183,255,52,.08);animation:dlNdDot 1.9s ease-in-out infinite}
      .dl-nd-country{margin:0;color:#fff;font-size:17px;line-height:1.08;font-weight:850;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-label{margin:5px 0 0;color:#aab2bc;font-size:10px;line-height:1.35;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-countdown{height:50px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.035);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
      .dl-nd-count-value{color:#fff;font-size:18px;line-height:1;font-weight:900;letter-spacing:-.04em}
      .dl-nd-count-label{color:#6f7a84;font-size:6px;line-height:1;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
      .dl-nd-card.is-today .dl-nd-countdown{border-color:rgba(183,255,52,.32);background:rgba(183,255,52,.09)}
      .dl-nd-card.is-today .dl-nd-count-value{color:var(--nd-accent);font-size:12px;letter-spacing:.08em}
      .dl-nd-progress{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding:0 15px 13px 17px}
      .dl-nd-progress-step{height:3px;border-radius:999px;background:rgba(255,255,255,.075);overflow:hidden}
      .dl-nd-progress-step::after{content:"";display:block;width:100%;height:100%;background:var(--nd-accent);transform:scaleX(0);transform-origin:left;transition:transform .42s cubic-bezier(.2,.8,.2,1)}
      .dl-nd-progress-step.on::after{transform:scaleX(1)}
      .dl-nd-multi{position:relative;display:flex;align-items:center;gap:8px;border-top:1px solid rgba(255,255,255,.075);padding:9px 14px 10px 17px;background:rgba(255,255,255,.018)}
      .dl-nd-multi small{flex:0 0 auto;color:#747f8b;font-size:7px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}
      .dl-nd-flags{display:flex;align-items:center;gap:6px;min-width:0;overflow-x:auto;scrollbar-width:none}.dl-nd-flags::-webkit-scrollbar{display:none}
      .dl-nd-mini{flex:0 0 auto;border:0;background:transparent;padding:0;font-size:18px;line-height:1;opacity:.4;filter:saturate(.75);transition:opacity .25s,transform .25s;cursor:pointer}
      .dl-nd-mini.active{opacity:1;transform:translateY(-1px) scale(1.08);filter:none}
      .dl-nd-count{flex:0 0 auto;min-width:24px;height:18px;padding:0 6px;border-radius:999px;background:var(--nd-accent);color:#090b0e;display:grid;place-items:center;font-size:8px;font-weight:950}
      .dl-nd-close{position:absolute;right:8px;top:8px;width:25px;height:25px;border:1px solid rgba(255,255,255,.09);border-radius:8px;background:rgba(8,11,14,.72);color:#7d8791;display:grid;place-items:center;padding:0;cursor:pointer;opacity:0;transform:translateY(-2px);transition:opacity .2s,transform .2s,background .2s,color .2s,border-color .2s;z-index:3}
      .dl-nd-card:hover .dl-nd-close,.dl-nd-close:focus-visible{opacity:1;transform:none}.dl-nd-close:hover{background:#fff;color:#090b0e;border-color:#fff}.dl-nd-close svg{width:12px;height:12px}
      .dl-nd-spark{position:absolute;width:3px;height:3px;border-radius:50%;background:var(--nd-accent);opacity:0;pointer-events:none;animation:dlNdSpark 3.6s ease-in-out infinite}
      .dl-nd-s1{top:13px;right:64px;animation-delay:.15s}.dl-nd-s2{top:42px;right:30px;animation-delay:1.1s}.dl-nd-s3{bottom:17px;left:92px;animation-delay:2s}.dl-nd-s4{top:20px;left:114px;animation-delay:2.7s}
      .dl-nd-card.is-today .dl-nd-spark{animation-duration:2.7s}.dl-nd-card.is-today .dl-nd-flag{animation-duration:2.5s}
      .dl-nd-card.is-switching .dl-nd-flag,.dl-nd-card.is-switching .dl-nd-copy,.dl-nd-card.is-switching .dl-nd-countdown{animation:dlNdSwap .32s ease both}
      .dl-nd-card.is-compact{width:216px;margin-left:auto}
      .dl-nd-card.is-compact .dl-nd-inner{grid-template-columns:42px minmax(0,1fr);padding:9px 11px 9px 12px;gap:10px}
      .dl-nd-card.is-compact .dl-nd-flagbox{height:38px;border-radius:10px}.dl-nd-card.is-compact .dl-nd-flagbox::before{width:36px;height:36px}.dl-nd-card.is-compact .dl-nd-flag{font-size:25px}
      .dl-nd-card.is-compact .dl-nd-label,.dl-nd-card.is-compact .dl-nd-countdown,.dl-nd-card.is-compact .dl-nd-progress,.dl-nd-card.is-compact .dl-nd-multi,.dl-nd-card.is-compact .dl-nd-close{display:none}.dl-nd-card.is-compact .dl-nd-country{font-size:12px}.dl-nd-card.is-compact .dl-nd-kicker{font-size:6.7px;margin-bottom:2px}
      @keyframes dlNdIn{from{opacity:0;transform:translateY(-12px) scale(.965)}to{opacity:1;transform:none}}
      @keyframes dlNdFlag{0%,100%{transform:translateY(0) rotate(-1.5deg) scale(1)}45%{transform:translateY(-3px) rotate(1.5deg) scale(1.025)}70%{transform:translateY(-1px) rotate(-.6deg) scale(1.01)}}
      @keyframes dlNdRing{0%,100%{opacity:.35;transform:scale(.82)}50%{opacity:.8;transform:scale(1.05)}}
      @keyframes dlNdDot{0%,100%{opacity:.65;transform:scale(.85)}50%{opacity:1;transform:scale(1.25)}}
      @keyframes dlNdAura{0%,100%{transform:translate3d(-1%,0,0) scale(1)}50%{transform:translate3d(2%,-1%,0) scale(1.04)}}
      @keyframes dlNdSweep{0%,62%{opacity:0;transform:translateX(0) skewX(-14deg)}72%{opacity:1}88%,100%{opacity:0;transform:translateX(560%) skewX(-14deg)}}
      @keyframes dlNdSpark{0%,70%,100%{opacity:0;transform:translateY(3px) scale(.35)}77%{opacity:.95;transform:translateY(-2px) scale(1.85)}84%{opacity:0;transform:translateY(-6px) scale(.65)}}
      @keyframes dlNdSwap{0%{opacity:1;transform:none}45%{opacity:0;transform:translateY(5px)}100%{opacity:1;transform:none}}
      @media(max-width:620px){#${ROOT_ID}{top:max(72px,calc(env(safe-area-inset-top) + 62px));right:10px;width:calc(100vw - 20px)}.dl-nd-inner{grid-template-columns:62px minmax(0,1fr) 45px;padding:14px 12px 12px 14px}.dl-nd-flagbox{height:56px}.dl-nd-country{font-size:15px}.dl-nd-progress{padding:0 12px 12px 14px}.dl-nd-card.is-compact{width:205px}}
      @media(hover:none){.dl-nd-close{opacity:.82;transform:none}}
      html.dgn-cart-open #${ROOT_ID},body.dl-support-open #${ROOT_ID}{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transition:opacity .16s ease,visibility .16s ease}
      @media(prefers-reduced-motion:reduce){.dl-nd-card,.dl-nd-card::before,.dl-nd-card::after,.dl-nd-flagbox::before,.dl-nd-flag,.dl-nd-kicker::before,.dl-nd-spark,.dl-nd-card.is-switching .dl-nd-flag,.dl-nd-card.is-switching .dl-nd-copy,.dl-nd-card.is-switching .dl-nd-countdown{animation:none!important;transition:none!important}}
      @media print{#${ROOT_ID}{display:none!important}}
    `;
    (document.head||document.documentElement).appendChild(s);
  }

  let rotateTimer=0;
  let compactTimer=0;
  let currentEvents=[];
  let activeIndex=0;

  function remove() {
    clearInterval(rotateTimer); clearTimeout(compactTimer);
    rotateTimer=0; compactTimer=0;
    document.getElementById(ROOT_ID)?.remove();
  }

  function setProgress(root,event){
    const completed=Math.max(1,Math.min(5,5-Number(event.daysUntil||0)));
    root.querySelectorAll('.dl-nd-progress-step').forEach((node,i)=>node.classList.toggle('on',i<completed));
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
    root.querySelector('.dl-nd-label').textContent=`${eventDateLabel(event)} · ${event.label}`;
    root.querySelector('.dl-nd-count-value').textContent=countdownFor(event);
    root.querySelector('.dl-nd-count-label').textContent=event.daysUntil===0?'FIESTA':'DÍAS';
    setProgress(root,event);
    root.querySelectorAll('.dl-nd-mini').forEach((node,i)=>node.classList.toggle('active',i===activeIndex));
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
    const multi=events.length>1;
    root.innerHTML=`<section class="dl-nd-card" aria-label="Celebración nacional">
      <span class="dl-nd-edge" aria-hidden="true"></span>
      <i class="dl-nd-spark dl-nd-s1"></i><i class="dl-nd-spark dl-nd-s2"></i><i class="dl-nd-spark dl-nd-s3"></i><i class="dl-nd-spark dl-nd-s4"></i>
      <button class="dl-nd-close" type="button" aria-label="Ocultar celebración por hoy" title="Ocultar por hoy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="dl-nd-inner">
        <div class="dl-nd-flagbox" aria-hidden="true"><span class="dl-nd-flag"></span></div>
        <div class="dl-nd-copy"><div class="dl-nd-kicker"></div><h3 class="dl-nd-country"></h3><p class="dl-nd-label"></p></div>
        <div class="dl-nd-countdown" aria-hidden="true"><strong class="dl-nd-count-value"></strong><span class="dl-nd-count-label"></span></div>
      </div>
      <div class="dl-nd-progress" aria-hidden="true">${Array.from({length:5},()=>'<span class="dl-nd-progress-step"></span>').join('')}</div>
      ${multi?`<div class="dl-nd-multi"><small>Fiestas patrias de hoy</small><div class="dl-nd-flags">${events.map((e,i)=>`<button class="dl-nd-mini ${i===0?'active':''}" type="button" data-index="${i}" aria-label="${e.country}">${flag(e.code)}</button>`).join('')}</div><span class="dl-nd-count">${events.length}</span></div>`:''}
    </section>`;
    (document.body||document.documentElement).appendChild(root);
    paint(0,false);
    root.querySelector('.dl-nd-close').addEventListener('click',()=>{try{localStorage.setItem(STORAGE_PREFIX+stamp,'1')}catch(_){} remove()});
    root.querySelectorAll('.dl-nd-mini').forEach(btn=>btn.addEventListener('click',()=>{paint(Number(btn.dataset.index)||0);restartRotation()}));
    const card=root.querySelector('.dl-nd-card');
    card.addEventListener('click',e=>{if(e.target.closest('button'))return;if(card.classList.contains('is-compact')){card.classList.remove('is-compact');clearTimeout(compactTimer);compactTimer=setTimeout(()=>card.classList.add('is-compact'),14000)}});
    compactTimer=setTimeout(()=>card?.classList.add('is-compact'),events[0]?.daysUntil===0?18000:14000);
    restartRotation();
    return true;
  }

  function restartRotation() {
    clearInterval(rotateTimer);rotateTimer=0;
    if(currentEvents.length<2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    rotateTimer=setInterval(()=>paint(activeIndex+1),5000);
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
    const events=eventsFor(clean,date.getFullYear()).map(e=>withTiming(e,date,0));
    return render(events,`preview-${date.getFullYear()}-${clean}`,{force:true});
  }

  function preview(countryCode, daysUntil=0) {
    const code=String(countryCode||'').toUpperCase();
    const base=CALENDAR.find(e=>e.code===code);
    if(!base)return false;
    const days=Math.max(0,Math.min(LEAD_DAYS,Number(daysUntil)||0));
    const [m,d]=base.date.split('-').map(Number);
    const target=new Date(new Date().getFullYear(),m-1,d,12,0,0,0);
    const event=withTiming(base,target,days);
    return render([event],`preview-${code}-${days}`,{force:true});
  }

  function previewCountdown(countryCode, daysUntil=LEAD_DAYS){ return preview(countryCode,daysUntil); }

  window.DingloftNationalDays={
    version:VERSION,
    leadDays:LEAD_DAYS,
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
