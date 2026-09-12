(() => {
  'use strict';

  // Dingloft National Days · v10
  // 100% local: no Firebase, no backend, no geolocalización precisa, no APIs externas.
  // En la fecha oficial celebra globalmente; 4 días antes muestra una cuenta regresiva
  // del país local inferido únicamente desde zona horaria/idioma del dispositivo.
  if (window.DingloftNationalDays || window.__DINGLOFT_NATIONAL_DAYS_V10__) return;
  window.__DINGLOFT_NATIONAL_DAYS_V10__ = true;

  const VERSION = '10';
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
  const flagEmoji = code => {
    const clean=String(code||'').toUpperCase();
    if(!/^[A-Z]{2}$/.test(clean)) return '🏳️';
    return [...clean].map(c=>String.fromCodePoint(127397+c.charCodeAt(0))).join('');
  };
  const svgToDataUri = svg => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  const flagSVG = code => {
    const clean=String(code||'').toUpperCase();
    const map={
      GT:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="20" height="40" fill="#6ccff6"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#6ccff6"/><circle cx="30" cy="20" r="4.1" fill="#9bbd3f" opacity=".85"/></svg>`,
      HN:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="13.33" fill="#2f8cff"/><rect y="13.33" width="60" height="13.34" fill="#fff"/><rect y="26.67" width="60" height="13.33" fill="#2f8cff"/><g fill="#2f8cff"><circle cx="24" cy="20" r="1.15"/><circle cx="30" cy="17" r="1.15"/><circle cx="30" cy="23" r="1.15"/><circle cx="36" cy="20" r="1.15"/><circle cx="30" cy="20" r="1.15"/></g></svg>`,
      SV:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="13.33" fill="#1d6de0"/><rect y="13.33" width="60" height="13.34" fill="#fff"/><rect y="26.67" width="60" height="13.33" fill="#1d6de0"/><circle cx="30" cy="20" r="2.2" fill="#f0c24b" opacity=".95"/></svg>`,
      NI:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="13.33" fill="#2a76e8"/><rect y="13.33" width="60" height="13.34" fill="#fff"/><rect y="26.67" width="60" height="13.33" fill="#2a76e8"/><polygon points="30,16 33,22 27,22" fill="#f0c24b" opacity=".9"/></svg>`,
      CR:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="40" fill="#1d479c"/><rect y="6" width="60" height="6" fill="#fff"/><rect y="12" width="60" height="16" fill="#ce1126"/><rect y="28" width="60" height="6" fill="#fff"/><rect y="34" width="60" height="6" fill="#1d479c"/></svg>`,
      PA:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="30" height="20" fill="#fff"/><rect x="30" width="30" height="20" fill="#db202c"/><rect y="20" width="30" height="20" fill="#2458c6"/><rect x="30" y="20" width="30" height="20" fill="#fff"/><polygon points="15,6.5 16.7,11.5 22,11.5 17.7,14.6 19.3,19.6 15,16.5 10.7,19.6 12.3,14.6 8,11.5 13.3,11.5" fill="#2458c6"/><polygon points="45,26.5 46.7,31.5 52,31.5 47.7,34.6 49.3,39.6 45,36.5 40.7,39.6 42.3,34.6 38,31.5 43.3,31.5" fill="#db202c"/></svg>`,
      MX:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="20" height="40" fill="#006847"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ce1126"/><circle cx="30" cy="20" r="3.4" fill="#a67c52" opacity=".9"/></svg>`,
      US:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="40" fill="#fff"/><g fill="#b22234"><rect width="60" height="3.08" y="0"/><rect width="60" height="3.08" y="6.16"/><rect width="60" height="3.08" y="12.32"/><rect width="60" height="3.08" y="18.48"/><rect width="60" height="3.08" y="24.64"/><rect width="60" height="3.08" y="30.8"/><rect width="60" height="3.08" y="36.96"/></g><rect width="27" height="21.6" fill="#3c3b6e"/><g fill="#fff"><circle cx="5" cy="5" r="1"/><circle cx="10" cy="9" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="20" cy="9" r="1"/><circle cx="9" cy="14" r="1"/><circle cx="18" cy="14" r="1"/></g></svg>`,
      CA:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="15" height="40" fill="#d52b1e"/><rect x="15" width="30" height="40" fill="#fff"/><rect x="45" width="15" height="40" fill="#d52b1e"/><polygon points="30,10 32,16 38,15 34,20 38,24 32,24 30,30 28,24 22,24 26,20 22,15 28,16" fill="#d52b1e"/></svg>`,
      FR:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="20" height="40" fill="#0055a4"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ef4135"/></svg>`,
      ES:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="40" fill="#c60b1e"/><rect y="10" width="60" height="20" fill="#ffc400"/></svg>`,
      DE:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="13.33" fill="#000"/><rect y="13.33" width="60" height="13.34" fill="#dd0000"/><rect y="26.67" width="60" height="13.33" fill="#ffce00"/></svg>`,
      IT:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="20" height="40" fill="#009246"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ce2b37"/></svg>`,
      JP:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="40" fill="#fff"/><circle cx="30" cy="20" r="9" fill="#bc002d"/></svg>`,
      AR:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="13.33" fill="#75aadb"/><rect y="13.33" width="60" height="13.34" fill="#fff"/><rect y="26.67" width="60" height="13.33" fill="#75aadb"/><circle cx="30" cy="20" r="3" fill="#f4b400"/></svg>`,
      BR:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="40" fill="#009c3b"/><polygon points="30,6 48,20 30,34 12,20" fill="#ffdf00"/><circle cx="30" cy="20" r="7" fill="#002776"/></svg>`,
      CO:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="20" fill="#fcd116"/><rect y="20" width="60" height="10" fill="#003893"/><rect y="30" width="60" height="10" fill="#ce1126"/></svg>`,
      CL:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="20" fill="#fff"/><rect y="20" width="60" height="20" fill="#d52b1e"/><rect width="24" height="20" fill="#0039a6"/><polygon points="12,5 13.6,9.5 18.4,9.5 14.4,12.3 16,16.8 12,14 8,16.8 9.6,12.3 5.6,9.5 10.4,9.5" fill="#fff"/></svg>`,
      PE:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="20" height="40" fill="#d91023"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#d91023"/></svg>`,
      GB:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="40" fill="#012169"/><path d="M0 0l24 16M36 24 60 40M60 0 36 16M24 24 0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l24 16M36 24 60 40M60 0 36 16M24 24 0 40" stroke="#c8102e" stroke-width="4"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="12"/><path d="M30 0v40M0 20h60" stroke="#c8102e" stroke-width="7"/></svg>`
    };
    return map[clean] || '';
  };
  const flagImage = code => {
    const svg=flagSVG(code);
    if(svg) return svgToDataUri(svg);
    const clean=String(code||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,2) || 'DL';
    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><rect width="60" height="40" rx="6" fill="#0f1419"/><rect x="1" y="1" width="58" height="38" rx="5" fill="none" stroke="#26303a"/><text x="30" y="25" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="700" fill="#ecf2f8" text-anchor="middle">${clean}</text></svg>`);
  };
  const flagLabel = code => flagSVG(code) ? '' : flagEmoji(code);
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
      #${ROOT_ID}{position:fixed;top:calc(var(--dgn-total-h,68px) + 5px);left:10px;z-index:2147481200;width:min(308px,calc(100vw - 20px));font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f7f8fa;pointer-events:none;-webkit-font-smoothing:antialiased}
      #${ROOT_ID} *{box-sizing:border-box}
      .dl-nd-card{--nd-accent:#b7ff34;position:relative;overflow:hidden;pointer-events:auto;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:linear-gradient(180deg,#0c0f13 0%,#090b0e 100%);box-shadow:0 20px 44px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.035);transform-origin:top left;animation:dlNdIn .46s cubic-bezier(.2,.85,.2,1) both;isolation:isolate}
      .dl-nd-card::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 0% 0%,rgba(183,255,52,.12),transparent 22%),linear-gradient(135deg,rgba(255,255,255,.028),transparent 30%) }
      .dl-nd-rail{position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,var(--nd-accent),rgba(183,255,52,.18),transparent 78%)}
      .dl-nd-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px 0 14px}
      .dl-nd-kicker{display:inline-flex;align-items:center;gap:7px;min-width:0;color:#c6ff64;font-size:7px;font-weight:900;letter-spacing:.22em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-kicker::before{content:"";width:14px;height:2px;flex:0 0 14px;border-radius:999px;background:linear-gradient(90deg,var(--nd-accent),rgba(183,255,52,.22));box-shadow:0 0 10px rgba(183,255,52,.16)}
      .dl-nd-rotate{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:20px;padding:0 7px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#8e98a3;font-size:9px;font-weight:800;letter-spacing:.04em}
      .dl-nd-body{display:grid;grid-template-columns:66px minmax(0,1fr) 48px;gap:12px;align-items:center;padding:10px 12px 11px 14px}
      .dl-nd-flagbox{position:relative;width:66px;height:44px;border-radius:11px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:#0f1318;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
      .dl-nd-flag-image{display:block;width:100%;height:100%;object-fit:cover}
      .dl-nd-flag-fallback{position:absolute;right:6px;bottom:4px;font-size:10px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
      .dl-nd-copy{min-width:0}
      .dl-nd-country{margin:0;color:#fff;font-size:15px;line-height:1.04;font-weight:850;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-label{margin:4px 0 0;color:#cfd5dc;font-size:8px;line-height:1.26;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-thanks{margin:5px 0 0;color:#79838f;font-size:7.1px;line-height:1.24;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-countdown{width:48px;height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.018));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;position:relative;overflow:hidden}
      .dl-nd-countdown::before{content:"";position:absolute;left:9px;right:9px;top:7px;height:2px;border-radius:999px;background:rgba(183,255,52,.48)}
      .dl-nd-count-value{color:#f6fbef;font-size:13px;line-height:1;font-weight:900;letter-spacing:-.03em}
      .dl-nd-count-label{color:#7c8791;font-size:5px;line-height:1;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
      .dl-nd-card.is-today .dl-nd-countdown{border-color:rgba(183,255,52,.22);background:linear-gradient(180deg,rgba(183,255,52,.12),rgba(183,255,52,.03))}
      .dl-nd-card.is-today .dl-nd-count-value{color:var(--nd-accent);font-size:9px;letter-spacing:.12em}
      .dl-nd-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 12px 11px 14px}
      .dl-nd-date{display:inline-flex;align-items:center;gap:6px;min-width:0;color:#98a3ae;font-size:7px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dl-nd-date::before{content:"";width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.26)}
      .dl-nd-line{flex:1 1 auto;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.14),transparent)}
      .dl-nd-close{position:absolute;right:8px;top:8px;width:18px;height:18px;border:1px solid rgba(255,255,255,.06);border-radius:7px;background:rgba(255,255,255,.03);color:#727d87;display:grid;place-items:center;padding:0;cursor:pointer;opacity:0;transform:translateY(-2px);transition:opacity .2s,transform .2s,background .2s,color .2s,border-color .2s;z-index:3}
      .dl-nd-card:hover .dl-nd-close,.dl-nd-close:focus-visible{opacity:1;transform:none}.dl-nd-close:hover{background:#fff;color:#090b0e;border-color:#fff}.dl-nd-close svg{width:9px;height:9px}
      .dl-nd-spark{position:absolute;width:2px;height:2px;border-radius:50%;background:var(--nd-accent);opacity:0;pointer-events:none;animation:dlNdSpark 4.8s ease-in-out infinite}
      .dl-nd-s1{top:11px;left:86px;animation-delay:.4s}.dl-nd-s2{top:19px;right:66px;animation-delay:1.8s}.dl-nd-s3{bottom:13px;left:125px;animation-delay:2.9s}
      .dl-nd-card.is-switching .dl-nd-flagbox,.dl-nd-card.is-switching .dl-nd-copy,.dl-nd-card.is-switching .dl-nd-countdown{animation:dlNdSwap .32s ease both}
      @keyframes dlNdIn{from{opacity:0;transform:translateY(-10px) scale(.975)}to{opacity:1;transform:none}}
      @keyframes dlNdSpark{0%,74%,100%{opacity:0;transform:translateY(2px) scale(.5)}80%{opacity:.95;transform:translateY(-2px) scale(1.7)}87%{opacity:0;transform:translateY(-5px) scale(.75)}}
      @keyframes dlNdSwap{0%{opacity:1;transform:none}45%{opacity:0;transform:translateX(-5px)}100%{opacity:1;transform:none}}
      @media(max-width:620px){#${ROOT_ID}{top:calc(var(--dgn-total-h,64px) + 5px);left:8px;width:min(300px,calc(100vw - 16px))}.dl-nd-body{grid-template-columns:64px minmax(0,1fr) 46px;gap:10px;padding:10px 11px 10px 12px}.dl-nd-flagbox{width:64px;height:42px}.dl-nd-country{font-size:14.5px}.dl-nd-label{font-size:7.8px}.dl-nd-thanks{font-size:7px}}
      @media(hover:none){.dl-nd-close{opacity:.78;transform:none}}
      html.dgn-cart-open #${ROOT_ID},body.dl-support-open #${ROOT_ID}{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transition:opacity .16s ease,visibility .16s ease}
      @media(prefers-reduced-motion:reduce){.dl-nd-card,.dl-nd-spark,.dl-nd-card.is-switching .dl-nd-flagbox,.dl-nd-card.is-switching .dl-nd-copy,.dl-nd-card.is-switching .dl-nd-countdown{animation:none!important;transition:none!important}}
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
    const flagImageEl=root.querySelector('.dl-nd-flag-image');
    if(flagImageEl){
      flagImageEl.src=flagImage(event.code);
      flagImageEl.alt=`Bandera de ${event.country}`;
    }
    const fallbackEl=root.querySelector('.dl-nd-flag-fallback');
    if(fallbackEl) fallbackEl.textContent=flagLabel(event.code);
    root.querySelector('.dl-nd-kicker').textContent=kickerFor(event);
    root.querySelector('.dl-nd-country').textContent=event.country;
    root.querySelector('.dl-nd-label').textContent=`${event.label} · ${eventDateLabel(event)}`;
    root.querySelector('.dl-nd-thanks').textContent=thanksFor(event);
    root.querySelector('.dl-nd-count-value').textContent=countdownFor(event);
    root.querySelector('.dl-nd-count-label').textContent=event.daysUntil===0?'FIESTA':'DÍAS';
    root.querySelector('.dl-nd-date').textContent=eventDateLabel(event);
    root.querySelector('.dl-nd-rotate').textContent=currentEvents.length>1?`${activeIndex+1}/${currentEvents.length}`:'1/1';
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
      <span class="dl-nd-rail" aria-hidden="true"></span>
      <i class="dl-nd-spark dl-nd-s1"></i><i class="dl-nd-spark dl-nd-s2"></i><i class="dl-nd-spark dl-nd-s3"></i>
      <button class="dl-nd-close" type="button" aria-label="Ocultar celebración por hoy" title="Ocultar por hoy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="dl-nd-head"><div class="dl-nd-kicker"></div><span class="dl-nd-rotate" aria-hidden="true"></span></div>
      <div class="dl-nd-body">
        <div class="dl-nd-flagbox" aria-hidden="true"><img class="dl-nd-flag-image" alt="" /><span class="dl-nd-flag-fallback"></span></div>
        <div class="dl-nd-copy"><h3 class="dl-nd-country"></h3><p class="dl-nd-label"></p><p class="dl-nd-thanks"></p></div>
        <div class="dl-nd-countdown" aria-hidden="true"><strong class="dl-nd-count-value"></strong><span class="dl-nd-count-label"></span></div>
      </div>
      <div class="dl-nd-meta"><span class="dl-nd-date"></span><span class="dl-nd-line" aria-hidden="true"></span></div>
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
