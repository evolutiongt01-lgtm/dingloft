/* Dingloft Commerce Worker · v3.5.1 · Safe Checkout + Presence + Account Review + Multitrack Admin */

const DEFAULT_FIREBASE_PROJECT_ID = "login-dingloft";
const DEFAULT_FIREBASE_WEB_API_KEY = "AIzaSyAKxQdUM49cVbBaXWJ5DF3s7EaNKlJRGhA";
const ADMIN_EMAILS = new Set(["evolutiongt01@gmail.com", "tepaz2025@gmail.com", "matzarcesar01@hotmail.com"]);

const DEFAULT_ALLOWED_ORIGINS = [
  "https://dingloft.com",
  "https://www.dingloft.com",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

let googleTokenCache = { token: "", expiresAt: 0 };
let paypalTokenCache = { token: "", expiresAt: 0 };
let zohoTokenCache = { token: "", expiresAt: 0 };
let zohoAccountCache = { fromAddress: "", accountId: "", expiresAt: 0 };

function clean(value, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

function validEmail(value) {
  const email = clean(value, 240).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function safeUrl(value) {
  const raw = clean(value, 1400);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.href : "";
  } catch (_) {
    return "";
  }
}

function slugify(value) {
  const out = clean(value, 220)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  if (!out) throw new Error("PRODUCT_INVALID");
  return out;
}

function moneyNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

function moneyText(value) {
  return moneyNumber(value).toFixed(2);
}

function base64UrlBytes(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlText(value) {
  return base64UrlBytes(new TextEncoder().encode(String(value)));
}

function base64UrlDecodeText(value) {
  let raw = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  while (raw.length % 4) raw += "=";
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function allowedOrigins(env) {
  const extra = clean(env.ALLOWED_ORIGINS || "", 3000)
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
}

function corsHeaders(env, origin) {
  const allowed = allowedOrigins(env);
  if (origin && allowed.has(origin)) {
    return {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "authorization,content-type,range,x-file-name",
      "access-control-expose-headers": "content-length,content-range,accept-ranges,etag",
      "access-control-max-age": "86400",
      vary: "Origin"
    };
  }
  return { vary: "Origin" };
}

function json(env, data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(env, origin)
    }
  });
}

function bearerToken(request) {
  const raw = request.headers.get("authorization") || "";
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function firebaseProjectId(env) {
  return clean(env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID, 180) || DEFAULT_FIREBASE_PROJECT_ID;
}

function firebaseWebApiKey(env) {
  return clean(env.FIREBASE_WEB_API_KEY || DEFAULT_FIREBASE_WEB_API_KEY, 500) || DEFAULT_FIREBASE_WEB_API_KEY;
}

async function lookupFirebaseUser(request, env) {
  const idToken = bearerToken(request);
  if (!idToken) throw new Error("AUTH_MISSING");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseWebApiKey(env))}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );
  const body = await response.json().catch(() => ({}));
  const user = Array.isArray(body?.users) ? body.users[0] : null;
  if (!response.ok || !user?.localId) throw new Error("AUTH_INVALID");
  return {
    uid: clean(user.localId, 180),
    email: validEmail(user.email),
    displayName: clean(user.displayName || "", 160),
    emailVerified: user.emailVerified === true
  };
}

async function accountReviewState(env, user) {
  if (!user?.uid) return { blocked:false, reason:"", message:"", blockedAt:null };
  if (user.email && ADMIN_EMAILS.has(user.email)) return { blocked:false, reason:"", message:"", blockedAt:null };
  const snap = await adminGetDocument(env, ["users", user.uid], true).catch(() => ({ exists:false, data:{} }));
  const data = snap.exists ? (snap.data || {}) : {};
  return {
    blocked: data.accountBlocked === true || clean(data.accountReviewStatus || "", 40) === "under_review",
    reason: clean(data.accountReviewReason || "", 600),
    message: clean(data.accountReviewMessage || "", 1200),
    blockedAt: data.accountBlockedAt || data.accountReviewStartedAt || null
  };
}

async function requireFirebaseUser(request, env) {
  const user = await lookupFirebaseUser(request, env);
  const review = await accountReviewState(env, user);
  if (review.blocked) {
    const error = new Error("ACCOUNT_REVIEW");
    error.reviewMessage = review.message;
    throw error;
  }
  return user;
}

async function requireFirebaseAdmin(request, env) {
  const user = await lookupFirebaseUser(request, env);
  if (!user.email || !ADMIN_EMAILS.has(user.email)) throw new Error("ADMIN_ONLY");
  return user;
}

async function accountStatusRoute(request, env, origin) {
  try {
    const user = await lookupFirebaseUser(request, env);
    const review = await accountReviewState(env, user);
    return json(env, {
      ok:true,
      blocked:review.blocked,
      status:review.blocked ? "under_review" : "active",
      message:review.message || "",
      reason:review.reason || "",
      blockedAt:review.blockedAt || null
    }, 200, origin);
  } catch (error) { return commerceError(env, error, origin); }
}

function firebaseServiceAccountConfig(env) {
  let email = clean(env.FIREBASE_SERVICE_ACCOUNT_EMAIL, 300);
  let privateKey = String(env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || "");
  let projectId = firebaseProjectId(env);

  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let parsed;
    try {
      parsed = JSON.parse(String(env.FIREBASE_SERVICE_ACCOUNT_JSON));
    } catch (_) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON_INVALID");
    }
    email = clean(parsed.client_email || email, 300);
    privateKey = String(parsed.private_key || privateKey || "");
    const parsedProject = clean(parsed.project_id || "", 180);
    if (parsedProject) projectId = parsedProject;
  }

  privateKey = privateKey.replace(/\\n/g, "\n").trim();
  if (!email || !privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_INCOMPLETE");
  }
  if (projectId !== firebaseProjectId(env)) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_PROJECT_MISMATCH");
  }
  return { email, privateKey };
}

function pemToArrayBuffer(pem) {
  const raw = String(pem)
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function googleFirestoreAccessToken(env) {
  if (googleTokenCache.token && Date.now() < googleTokenCache.expiresAt) return googleTokenCache.token;
  const cfg = firebaseServiceAccountConfig(env);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(cfg.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlText(JSON.stringify({
    iss: cfg.email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  ));
  const assertion = `${unsigned}.${base64UrlBytes(signature)}`;
  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form.toString()
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) throw new Error("FIREBASE_ADMIN_OAUTH_FAILED");
  const ttl = Math.max(300, Number(body.expires_in || 3600));
  googleTokenCache = {
    token: String(body.access_token),
    expiresAt: Date.now() + Math.max(60, ttl - 300) * 1000
  };
  return googleTokenCache.token;
}

function firestoreAdminUrl(env, parts = []) {
  const path = parts.map(x => encodeURIComponent(String(x))).join("/");
  return `https://firestore.googleapis.com/v1/projects/${firebaseProjectId(env)}/databases/(default)/documents/${path}`;
}

function fromFirestoreValue(v) {
  if (!v || typeof v !== "object") return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in v) return fromFirestoreFields(v.mapValue.fields || {});
  return null;
}

function fromFirestoreFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) out[key] = fromFirestoreValue(value);
  return out;
}

function toFirestoreValueDeep(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValueDeep) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { nullValue: null };
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "object") {
    const fields = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      fields[key] = toFirestoreValueDeep(item);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFieldsDeep(data = {}) {
  const fields = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (value === undefined) continue;
    fields[key] = toFirestoreValueDeep(value);
  }
  return fields;
}

function docIdFromName(name) {
  const parts = String(name || "").split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
}

async function adminGetDocument(env, parts, allowMissing = false) {
  const token = await googleFirestoreAccessToken(env);
  const response = await fetch(firestoreAdminUrl(env, parts), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
  });
  if (response.status === 404 && allowMissing) return { exists: false, data: null, id: "" };
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("FIRESTORE_ADMIN_READ_FAILED");
  return { exists: true, data: fromFirestoreFields(body.fields || {}), id: docIdFromName(body.name) };
}

async function adminSetDocument(env, parts, data = {}) {
  const token = await googleFirestoreAccessToken(env);
  const response = await fetch(firestoreAdminUrl(env, parts), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ fields: toFirestoreFieldsDeep(data) })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Firestore set", response.status, body?.error?.message || "unknown");
    throw new Error("FIRESTORE_ADMIN_WRITE_FAILED");
  }
  return body;
}

async function adminPatchDocument(env, parts, patch = {}) {
  const token = await googleFirestoreAccessToken(env);
  const params = new URLSearchParams();
  for (const key of Object.keys(patch)) params.append("updateMask.fieldPaths", key);
  const url = `${firestoreAdminUrl(env, parts)}?${params.toString()}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ fields: toFirestoreFieldsDeep(patch) })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("FIRESTORE_ADMIN_WRITE_FAILED");
  return body;
}

async function adminDeleteDocument(env, parts) {
  const token = await googleFirestoreAccessToken(env);
  const response = await fetch(firestoreAdminUrl(env, parts), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
  });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("FIRESTORE_ADMIN_DELETE_FAILED");
  return true;
}

async function adminRunQuery(env, structuredQuery) {
  const token = await googleFirestoreAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId(env)}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ structuredQuery })
  });
  const body = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(body)) throw new Error("FIRESTORE_ADMIN_QUERY_FAILED");
  return body
    .filter(row => row?.document)
    .map(row => ({
      id: docIdFromName(row.document.name),
      data: fromFirestoreFields(row.document.fields || {})
    }));
}

function asset(name, url, id = "") {
  return { id: id || slugify(name), name, url };
}

const DRIVE = {
  autocad: "https://drive.google.com/uc?export=download&id=1mWRwEisCuxeuSsMYM-ZhoYpT_PFwbase",
  office: "https://drive.google.com/uc?export=download&id=1gPUVFwuDrpK9aymOAsqaruu_4933dbn6",
  sketchup: "https://drive.google.com/uc?export=download&id=1l24gXzpm2xTxTdAI6OiAUtoccWpfLnUD",
  cosmos: "https://drive.google.com/uc?export=download&id=1Z3Xk2MiDMk90PP2jajvVwG3bWHUmSzeL",
  montageNord: "https://drive.google.com/uc?export=download&id=1OayW_WEpr6Y3Ea5e9wVBC7kLpDptRJA1",
  esword: "https://drive.google.com/uc?export=download&id=1Bfxi3KH5ik-uMAa0pPOiwvDJruY_niqo",
  nordEssential: "https://drive.google.com/uc?export=download&id=1dGiTz44DrV9nrEGGhATegXuk2wrFUpB1",
  yamahaLegacy: "https://drive.google.com/uc?export=download&id=1ozXolT51O3dn3Fw8UKnRySi0F_p0rWCe",
  bonusPad: "https://drive.google.com/uc?export=download&id=1BdXv3hk63f4ixYjqogaED1fwshXfpNTj",
  yamahaPremium: "https://drive.google.com/uc?export=download&id=1r7yW_100iqzQTY7K96Yv05jvFCgq2Abw",
  yamahaPremiumBonus: "https://drive.google.com/uc?export=download&id=1I73jq9Baj9uJi0-RHpUCvX-X5dwGOJcd",
  yamahaPremiumBonus2: "https://drive.google.com/uc?export=download&id=1_ubpxmpvlHTCKO6Wdbpjpys-YLVQkEs6",
  kontakt8Win: "https://drive.google.com/uc?export=download&id=1Wg895Pq8em6h-vGLIy0C-2vDFGZURFSl",
  kontakt7Mac: "https://drive.google.com/uc?export=download&id=13deJgVvPCi6haaLXET3qV2K7mQ_ojMA2",
  rhodesMac: "https://drive.google.com/uc?export=download&id=1B6dfQJjCh0vzOAuf6eTtuKQ91EAhfFKY",
  rhodesWin: "https://drive.google.com/uc?export=download&id=1C2Lj_8jMqRLdjdd1O4jSdOQYwrDayJx_"
};

function product({ sku, name, priceUsd, img, type, assets = [], aliases = [] }) {
  return { sku, name, priceUsd, img, type, assets, aliases, active: true };
}

const BUILTIN_PRODUCTS = [
  product({ sku: "autocad-2026", name: "AutoCAD 2026", priceUsd: 35, img: "autocad", type: "Licencia vitalicia", assets: [asset("AutoCAD 2026", DRIVE.autocad)] }),
  product({ sku: "office-home-business", name: "Office Home & Business", priceUsd: 40, img: "office", type: "Licencia vitalicia", assets: [asset("Office Home & Business", DRIVE.office)], aliases: ["Microsoft Office 2024"] }),
  product({ sku: "sketchup-pro-2026", name: "SketchUp Pro 2026", priceUsd: 27, img: "sketchup", type: "Licencia vitalicia", assets: [asset("SketchUp Pro 2026", DRIVE.sketchup)] }),
  product({ sku: "sketchup-2026-autocad-2026", name: "SketchUp 2026 & AutoCAD 2026", priceUsd: 50, img: "combo", type: "Licencia vitalicia", assets: [asset("SketchUp (Mac)", DRIVE.sketchup), asset("AutoCAD (Mac)", DRIVE.autocad)], aliases: ["SketchUp & AutoCAD Combo"] }),
  product({ sku: "cosmos-collection", name: "Cosmos Collection", priceUsd: 70, img: "cosmos", type: "Librería vitalicia", assets: [asset("Cosmos Collection", DRIVE.cosmos)], aliases: ["Cosmo Collection"] }),
  product({ sku: "montage-8-nord-stage-3", name: "Montage 8 & Nord Stage 3", priceUsd: 27, img: "mainstage", type: "Librería vitalicia", assets: [asset("Montage 8 & Nord Stage 3", DRIVE.montageNord)] }),
  product({ sku: "biblias-e-sword", name: "Biblias E-Sword", priceUsd: 0, img: "esword", type: "Descarga gratuita", assets: [asset("Biblias E-Sword", DRIVE.esword)], aliases: ["Biblias y Diccionarios para E-Sword"] }),
  product({ sku: "nord-stage-4-ultimate-library", name: "Nord Stage 4 Ultimate Library", priceUsd: 40, img: "nord", type: "Librería vitalicia", assets: [asset("Nord Essential SF2", DRIVE.nordEssential), asset("Bonus PAD", DRIVE.bonusPad)] }),
  product({ sku: "nord-essentials-sf2-collection", name: "Nord Essentials SF2 Collection", priceUsd: 33, img: "nordessentials", type: "Librería vitalicia", assets: [asset("Nord Essential SF2", DRIVE.nordEssential), asset("Bonus PAD", DRIVE.bonusPad)] }),
  product({ sku: "yamaha-legacy-collection-sf2", name: "Yamaha Legacy Collection SF2", priceUsd: 33, img: "yamahalegacy", type: "Librería vitalicia", assets: [asset("Yamaha Legacy Collection SF2", DRIVE.yamahaLegacy), asset("Bonus", DRIVE.bonusPad)] }),
  product({ sku: "pianos-legendarios-sf2-bundle", name: "Pianos Legendarios SF2 Bundle", priceUsd: 60, img: "dual", type: "Librería vitalicia", assets: [asset("Nord Essential SF2", DRIVE.nordEssential), asset("Yamaha Legacy Collection SF2", DRIVE.yamahaLegacy), asset("Bonus PAD", DRIVE.bonusPad)], aliases: ["Pianos Legendarios SF2 Bundle completo", "Dual Legend", "Dual Legends", "Dual Legend SF2", "Dual Legends SF2"] }),
  product({ sku: "yamaha-premium-keys", name: "Yamaha Premium Keys", priceUsd: 30, img: "yamahakeys", type: "Librería vitalicia", assets: [asset("Yamaha Premium Keys v2.0", DRIVE.yamahaPremium), asset("Yamaha Premium Keys (Bonus)", DRIVE.yamahaPremiumBonus), asset("Yamaha Premium Keys (Bonus 2)", DRIVE.yamahaPremiumBonus2), asset("Kontakt 8 (Win)", DRIVE.kontakt8Win), asset("Kontakt 7 (Mac)", DRIVE.kontakt7Mac)] }),
  product({ sku: "rhodes-affair-2", name: "Rhodes Affair 2", priceUsd: 30, img: "rhodes", type: "Librería vitalicia", assets: [asset("Rhodes Affair 2 (Mac)", DRIVE.rhodesMac), asset("Rhodes Affair 2 (Windows)", DRIVE.rhodesWin)] }),
  product({ sku: "logic-pro", name: "Logic Pro", priceUsd: 25, img: "logic", type: "Licencia vitalicia", assets: [] }),
  product({ sku: "cinema-4d", name: "Cinema 4D", priceUsd: 35, img: "cinema4d", type: "Licencia vitalicia", assets: [] })
];

const MULTITRACKS = [
  ["MT-001", "Todos Reunidos", 20],
  ["MT-002", "Lanza Gritos", 25],
  ["MT-003", "Melodía de Unción - La voz de mi Amado - Libertad", 15],
  ["MT-004", "Ante el Rey", 15],
  ["MT-005", "Deleitate en el Señor", 15],
  ["MT-006", "Tú Me Reivindicarás", 15],
  ["MT-007", "Guerrero Victorioso", 18],
  ["MT-008", "Llevando el Arca", 18],
  ["MT-009", "Libertad - Natsach & Jehova A Vencido", 18],
  ["MT-010", "Preparados Estamos", 18],
  ["MT-011", "Aleluya", 20],
  ["MT-012", "Derrama de tu vino Señor", 18],
  ["MT-013", "Medley Justicia", 15],
  ["MT-014", "Jesus eres mi paz", 16],
  ["MT-015", "Medley Renacer", 15]
].map(([id, name, priceUsd]) => product({
  sku: slugify(name),
  name,
  priceUsd,
  img: "dingloft",
  type: "Multitrack digital",
  assets: [],
  aliases: [id]
}));

const ALL_BUILTINS = [...BUILTIN_PRODUCTS, ...MULTITRACKS];
const BUILTIN_BY_KEY = new Map();
for (const item of ALL_BUILTINS) {
  BUILTIN_BY_KEY.set(slugify(item.sku), item);
  BUILTIN_BY_KEY.set(slugify(item.name), item);
  for (const alias of item.aliases || []) BUILTIN_BY_KEY.set(slugify(alias), item);
}


const LEGACY_MULTITRACK_DETAILS = [
  {id:"MT-001",title:"Todos Reunidos",artist:"Genesis Campos",priceUsd:20,bpm:"155",chord:"Am",stems:"11",tag:"new",featured:true,cover:"img/albums/todos-reunidos.jpg",preview:"/audio/Preview1.mp3?v=25"},
  {id:"MT-002",title:"Lanza Gritos",artist:"Ministerios Ebenezer",priceUsd:25,bpm:"150",chord:"Em",stems:"10",tag:"featured",featured:true,cover:"img/albums/Lanzagritos.jpg",preview:"/audio/Preview2.mp3?v=25"},
  {id:"MT-003",title:"Melodía de Unción - La voz de mi Amado - Libertad",artist:"CCINT",priceUsd:15,bpm:"155",chord:"Am & Cm",stems:"15",tag:"new",featured:false,cover:"img/albums/ccint1.jpeg",preview:"/audio/Preview3.mp3?v=25"},
  {id:"MT-004",title:"Ante el Rey",artist:"Genesis Campos",priceUsd:15,bpm:"155",chord:"Dm",stems:"16",tag:"all",featured:false,cover:"img/albums/anteelrey.jpg",preview:"/audio/Preview4.mp3?v=25"},
  {id:"MT-005",title:"Deleitate en el Señor",artist:"Genesis Campos",priceUsd:15,bpm:"150",chord:"Bb",stems:"16",tag:"featured",featured:true,cover:"img/albums/anteelrey.jpg",preview:"/audio/Preview5.mp3?v=25"},
  {id:"MT-006",title:"Tú Me Reivindicarás",artist:"Barro de Dios Ministerios Ebenezer",priceUsd:15,bpm:"155",chord:"Em",stems:"15",tag:"all",featured:false,cover:"img/albums/barrodedios.jpeg",preview:"/audio/Preview6.mp3?v=25"},
  {id:"MT-007",title:"Guerrero Victorioso",artist:"Ministerios Ebenezer",priceUsd:18,bpm:"150",chord:"Em",stems:"11",tag:"new",featured:true,cover:"img/albums/Libertad.jpeg",preview:"/audio/Preview7.mp3?v=25"},
  {id:"MT-008",title:"Llevando el Arca",artist:"Ministerios Ebenezer",priceUsd:18,bpm:"150",chord:"Gm",stems:"14",tag:"all",featured:false,cover:"img/albums/Libertad.jpeg",preview:"/audio/Preview8.mp3?v=25"},
  {id:"MT-009",title:"Libertad - Natsach & Jehova A Vencido",artist:"Ministerios Ebenezer",priceUsd:18,bpm:"150",chord:"Em",stems:"10",tag:"all",featured:false,cover:"img/albums/Libertad.jpeg",preview:"/audio/Preview9.mp3?v=25"},
  {id:"MT-010",title:"Preparados Estamos",artist:"Ministerios Ebenezer",priceUsd:18,bpm:"150",chord:"Am",stems:"10",tag:"all",featured:false,cover:"img/albums/Libertad.jpeg",preview:"/audio/Preview10.mp3?v=25"},
  {id:"MT-011",title:"Aleluya",artist:"Ministerios Ebenezer",priceUsd:20,bpm:"150",chord:"Em",stems:"15",tag:"all",featured:false,cover:"img/albums/Album2.jpg",preview:"/audio/Preview11.mp3?v=25"},
  {id:"MT-012",title:"Derrama de tu vino Señor",artist:"Leonardo Díaz",priceUsd:18,bpm:"155",chord:"Cm",stems:"12",tag:"all",featured:false,cover:"img/albums/derrama.jpeg",preview:"/audio/Preview12.mp3?v=25"},
  {id:"MT-013",title:"Medley Justicia",artist:"Ebenezer Honduras",priceUsd:15,bpm:"150",chord:"Em - Gm",stems:"12",tag:"all",featured:false,cover:"img/albums/Reino.jpg",preview:"/audio/Preview13.mp3?v=25"},
  {id:"MT-014",title:"Jesus eres mi paz",artist:"Genesis Campos",priceUsd:16,bpm:"150",chord:"Bb",stems:"11",tag:"all",featured:false,cover:"img/albums/anteelrey.jpg",preview:"/audio/Preview14.mp3?v=25"},
  {id:"MT-015",title:"Medley Renacer",artist:"Ebenezer San Francisco",priceUsd:15,bpm:"155",chord:"Bb",stems:"18",tag:"all",featured:false,cover:"img/albums/renacer.jpg",preview:"/audio/Preview15.mp3?v=25"}
];
function mediaRef(value) {
  const raw = clean(value, 1400);
  if (!raw) return "";
  if (/^(?:\/|img\/|audio\/)/i.test(raw)) return raw;
  return safeUrl(raw);
}
function normalizeMultitrackConfig(raw, fallbackId="") {
  if (!raw || typeof raw !== "object") return null;
  const id = clean(raw.id || fallbackId, 40).toUpperCase();
  const title = clean(raw.title || raw.name, 220);
  const artist = clean(raw.artist || "Artista", 180) || "Artista";
  const priceUsd = moneyNumber(raw.priceUsd ?? raw.price);
  if (!id || !/^MT-[A-Z0-9_-]+$/i.test(id) || !title || priceUsd < 0) return null;
  const tagRaw = clean(raw.tag || "all", 30).toLowerCase();
  const tag = ["all","new","featured"].includes(tagRaw) ? tagRaw : "all";
  return {
    id,
    sku: slugify(raw.sku || title),
    title,
    artist,
    priceUsd,
    bpm: clean(raw.bpm || "—", 30) || "—",
    chord: clean(raw.chord || raw.key || "—", 80) || "—",
    stems: clean(raw.stems || "—", 30) || "—",
    tag,
    featured: raw.featured === true,
    active: raw.active !== false,
    cover: mediaRef(raw.cover || raw.coverUrl || ""),
    preview: mediaRef(raw.preview || raw.previewUrl || ""),
    deliveryUrl: safeUrl(raw.deliveryUrl || ""),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    commerceSku: clean(raw.commerceSku || "", 120)
  };
}
function multitrackDeliveryFromProductData(data={}) {
  const assets=Array.isArray(data?.assets)?data.assets:[];
  for(const a of assets){
    const url=safeUrl(a?.url||"");
    if(url) return url;
  }
  return "";
}
function legacyMultitrackById(id=""){
  const key=clean(id,40).toUpperCase();
  return LEGACY_MULTITRACK_DETAILS.find(x=>String(x.id||"").toUpperCase()===key)||null;
}
function canonicalMultitrackCommerceSku(mt={}, existingData={}){
  // IMPORTANT: MT-001..MT-015 already existed as independent digitalProducts
  // before the Multitracks admin was created. Their canonical checkout SKU is
  // the slug of the original title. Never rename/share that delivery document.
  const legacy=legacyMultitrackById(mt.id||existingData.id||"");
  if(legacy) return slugify(legacy.title);
  const stored=clean(existingData.commerceSku||mt.commerceSku||"",120);
  if(stored) return slugify(stored);
  return slugify(mt.sku||mt.title||mt.name||"");
}
function multitrackProductAssets(data={}){
  return (Array.isArray(data?.assets)?data.assets:[]).map((a,i)=>sanitizeAsset(a,i)).filter(Boolean);
}
async function mergedMultitrackCatalog(env, {includeInactive=false}={}) {
  const [rows,productRows]=await Promise.all([
    adminRunQuery(env,{from:[{collectionId:"multitracks"}],limit:500}).catch(()=>[]),
    adminRunQuery(env,{from:[{collectionId:"digitalProducts"}],limit:700}).catch(()=>[])
  ]);

  // Exact SKU map only. No alias/name guessing: one Multitrack = one delivery doc.
  const productBySku=new Map();
  for(const row of productRows){
    const normalized=normalizeProductConfig(row.data||{},row.id);
    if(normalized) productBySku.set(normalized.sku,{raw:row.data||{},normalized,rowId:row.id});
  }

  const overrides=new Map();
  for(const row of rows){
    const mt=normalizeMultitrackConfig(row.data,row.id);
    if(mt) overrides.set(mt.id,{...mt,_stored:row.data||{}});
  }

  const hydrate=(mt,stored={})=>{
    if(!mt) return null;
    const commerceSku=canonicalMultitrackCommerceSku(mt,stored);
    const productEntry=productBySku.get(commerceSku)||null;
    const assets=productEntry?multitrackProductAssets(productEntry.raw):[];
    const deliveryUrl=multitrackDeliveryFromProductData({assets});
    return {...mt,commerceSku,deliveryUrl,deliveryConfigured:assets.length>0,deliveryAssetCount:assets.length};
  };

  const out=[]; const seen=new Set();
  for(const legacy of LEGACY_MULTITRACK_DETAILS){
    const base=normalizeMultitrackConfig(legacy,legacy.id);
    const ov=overrides.get(base.id);
    const mt=hydrate(ov?ov:base,ov?ov._stored:{});
    if(!mt)continue;
    delete mt._stored;
    seen.add(mt.id);
    if(includeInactive||mt.active!==false)out.push(mt);
  }
  for(const [id,ov] of overrides){
    if(seen.has(id))continue;
    const mt=hydrate(ov,ov._stored||{});
    if(!mt)continue;
    delete mt._stored;
    if(includeInactive||mt.active!==false)out.push(mt);
  }
  out.sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
  return out;
}
function publicMultitrackShape(mt) {
  return {id:mt.id,sku:mt.sku,title:mt.title,artist:mt.artist,price:moneyNumber(mt.priceUsd),priceUsd:moneyNumber(mt.priceUsd),bpm:mt.bpm,key:mt.chord,chord:mt.chord,stems:mt.stems,tag:mt.tag,featured:mt.featured===true,active:mt.active!==false,cover:mt.cover||"",preview:mt.preview||"",deliveryConfigured:mt.deliveryConfigured===true};
}
async function publicMultitrackCatalogRoute(request, env, origin) {
  try { return json(env,{ok:true,multitracks:(await mergedMultitrackCatalog(env)).map(publicMultitrackShape)},200,origin); }
  catch(error){ return commerceError(env,error,origin); }
}
async function adminMultitrackCatalogRoute(request, env, origin) {
  try {
    await requireFirebaseAdmin(request,env);
    const list=await mergedMultitrackCatalog(env,{includeInactive:true});
    return json(env,{ok:true,multitracks:list.map(mt=>({...publicMultitrackShape(mt),commerceSku:mt.commerceSku||"",deliveryUrl:mt.deliveryUrl||"",deliveryAssetCount:Number(mt.deliveryAssetCount||0)}))},200,origin);
  } catch(error){ return commerceError(env,error,origin); }
}
async function nextMultitrackId(env) {
  const list=await mergedMultitrackCatalog(env,{includeInactive:true}); let max=0;
  for(const mt of list){const m=String(mt.id||"").match(/^MT-(\d+)$/i);if(m)max=Math.max(max,Number(m[1]));}
  return `MT-${String(max+1).padStart(3,"0")}`;
}
async function adminUpsertMultitrackRoute(request, env, origin) {
  try {
    const admin=await requireFirebaseAdmin(request,env);
    const body=await request.json().catch(()=>({}));
    const id=clean(body.id||"",40).toUpperCase()||await nextMultitrackId(env);
    const normalized=normalizeMultitrackConfig({...body,id},id);
    if(!normalized) throw new Error("MULTITRACK_INVALID");

    const existingMt=await adminGetDocument(env,["multitracks",id],true).catch(()=>({exists:false,data:{}}));
    const storedMt=existingMt.exists?(existingMt.data||{}):{};
    const commerceSku=canonicalMultitrackCommerceSku(normalized,storedMt);
    if(!commerceSku) throw new Error("MULTITRACK_SKU_INVALID");

    // Read ONLY this Multitrack's own digital product. No global fallback.
    const existingProduct=await adminGetDocument(env,["digitalProducts",commerceSku],true).catch(()=>({exists:false,data:{}}));
    const existingProductData=existingProduct.exists?(existingProduct.data||{}):{};
    let assets=multitrackProductAssets(existingProductData);

    // Existing delivery remains byte-for-byte untouched unless Admin actually
    // edits the delivery field. An empty field never wipes a working link.
    const deliveryTouched=body.deliveryTouched===true;
    const requestedDelivery=safeUrl(body.deliveryUrl||"");
    if(deliveryTouched&&requestedDelivery){
      if(assets.length){
        const first=assets[0]||{};
        assets[0]={...first,id:first.id||"multitrack-entrega",name:first.name||`${normalized.title} · Entrega`,url:requestedDelivery,r2Key:""};
      }else{
        assets=[{id:"multitrack-entrega",name:`${normalized.title} · Entrega`,url:requestedDelivery,r2Key:""}];
      }
    }

    const now=new Date();
    // deliveryUrl in the multitracks document is intentionally blanked so a
    // stale v52/v53 value can never override the canonical digitalProducts asset.
    await adminSetDocument(env,["multitracks",id],{
      ...normalized,
      deliveryUrl:"",
      commerceSku,
      createdAt:existingMt.exists?(storedMt.createdAt||now):now,
      updatedAt:now,
      updatedBy:admin.email
    });

    const oldAliases=Array.isArray(existingProductData.aliases)?existingProductData.aliases:[];
    const aliases=[...new Set([...oldAliases,id,normalized.title].map(x=>clean(x,220)).filter(Boolean))];
    await adminSetDocument(env,["digitalProducts",commerceSku],{
      ...existingProductData,
      sku:commerceSku,
      slug:commerceSku,
      name:normalized.title,
      priceUsd:normalized.priceUsd,
      compareAtUsd:Number(existingProductData.compareAtUsd||0),
      img:existingProductData.img||"dingloft",
      imageUrl:normalized.cover||existingProductData.imageUrl||"",
      category:"Multitracks",
      type:"Multitrack digital",
      shortDescription:`${normalized.artist} · ${normalized.bpm} BPM · ${normalized.chord} · ${normalized.stems} stems`,
      description:existingProductData.description||"",
      badge:normalized.tag==="new"?"Nuevo":(existingProductData.badge||""),
      active:normalized.active!==false,
      featured:normalized.featured===true,
      assets,
      aliases,
      createdAt:existingProduct.exists?(existingProductData.createdAt||now):now,
      updatedAt:now,
      updatedBy:admin.email
    });

    const finalDelivery=multitrackDeliveryFromProductData({assets});
    const finalMt={...normalized,commerceSku,deliveryUrl:finalDelivery,deliveryConfigured:assets.length>0,deliveryAssetCount:assets.length};
    return json(env,{ok:true,multitrack:{...publicMultitrackShape(finalMt),commerceSku,deliveryUrl:finalDelivery,deliveryAssetCount:assets.length},id},200,origin);
  } catch(error){ return commerceError(env,error,origin); }
}
async function adminMultitrackUploadRoute(request, env, origin, url) {
  try {
    await requireFirebaseAdmin(request,env); if(!env.DIGITAL_FILES) throw new Error("DIGITAL_FILES_R2_MISSING");
    const kind=clean(url.searchParams.get("kind")||"",20).toLowerCase(); if(!["cover","preview"].includes(kind)) throw new Error("MULTITRACK_UPLOAD_KIND_INVALID");
    const type=clean(request.headers.get("content-type")||"application/octet-stream",120).toLowerCase();
    if(kind==="cover"&&!type.startsWith("image/")) throw new Error("MULTITRACK_COVER_TYPE_INVALID");
    if(kind==="preview"&&!type.startsWith("audio/")) throw new Error("MULTITRACK_AUDIO_TYPE_INVALID");
    const max=kind==="cover"?8*1024*1024:60*1024*1024; const len=Number(request.headers.get("content-length")||0); if(len>max) throw new Error(kind==="cover"?"MULTITRACK_COVER_TOO_LARGE":"MULTITRACK_AUDIO_TOO_LARGE");
    let rawName=clean(request.headers.get("x-file-name")||`${kind}-${Date.now()}`,220); try{rawName=decodeURIComponent(rawName)}catch(_){}
    const extMatch=rawName.match(/\.([a-z0-9]{2,6})$/i); const ext=clean(extMatch?.[1]||(kind==="cover"?"jpg":"mp3"),8).toLowerCase();
    const base=slugify(rawName.replace(/\.[^.]+$/,"")); const key=`multitracks/${kind}/${Date.now()}-${base}.${ext}`;
    if(!request.body) throw new Error("MULTITRACK_UPLOAD_EMPTY");
    await env.DIGITAL_FILES.put(key,request.body,{httpMetadata:{contentType:type,cacheControl:"public, max-age=31536000, immutable"}});
    const mediaUrl=`${url.origin}/media/${key.split("/").map(encodeURIComponent).join("/")}`;
    return json(env,{ok:true,url:mediaUrl,key,kind},200,origin);
  } catch(error){ return commerceError(env,error,origin); }
}
function parseByteRange(value,size){
  const m=String(value||"").match(/^bytes=(\d*)-(\d*)$/i); if(!m)return null; let start=m[1]?Number(m[1]):null,end=m[2]?Number(m[2]):null;
  if(start===null&&end!==null){const suffix=Math.min(size,end);start=Math.max(0,size-suffix);end=size-1;} else {if(start===null)start=0;if(end===null||end>=size)end=size-1;}
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<start||start>=size)return null; return{offset:start,length:end-start+1,end};
}
async function publicMultitrackMediaRoute(request,env,origin,url){
  try{
    if(!env.DIGITAL_FILES)return new Response("Media no disponible",{status:404});
    const encoded=url.pathname.slice("/media/".length); let key=""; try{key=decodeURIComponent(encoded)}catch(_){key=encoded} if(!key.startsWith("multitracks/"))return new Response("Not found",{status:404});
    const head=await env.DIGITAL_FILES.head(key); if(!head)return new Response("Not found",{status:404});
    const headers=new Headers({...corsHeaders(env,origin)}); head.writeHttpMetadata(headers); headers.set("accept-ranges","bytes"); headers.set("cache-control","public, max-age=31536000, immutable"); headers.set("etag",head.httpEtag||"");
    if(request.method==="HEAD"){headers.set("content-length",String(head.size));return new Response(null,{status:200,headers});}
    const range=parseByteRange(request.headers.get("range"),head.size);
    if(range){const object=await env.DIGITAL_FILES.get(key,{range:{offset:range.offset,length:range.length}});if(!object)return new Response("Not found",{status:404});headers.set("content-range",`bytes ${range.offset}-${range.end}/${head.size}`);headers.set("content-length",String(range.length));return new Response(object.body,{status:206,headers});}
    const object=await env.DIGITAL_FILES.get(key); if(!object)return new Response("Not found",{status:404}); headers.set("content-length",String(head.size)); return new Response(object.body,{status:200,headers});
  }catch(error){return commerceError(env,error,origin);}
}

function normalizeAssetUrl(value) {
  const url = safeUrl(value);
  if (!url) return "";
  try {
    const u = new URL(url);
    if (/^(?:www\.)?drive\.google\.com$/i.test(u.hostname)) {
      const fileMatch = u.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
      const id = fileMatch?.[1] || u.searchParams.get("id") || "";
      if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
    }
  } catch (_) {}
  return url;
}

function sanitizeAsset(raw, index = 0) {
  const name = clean(raw?.name || `Archivo ${index + 1}`, 180) || `Archivo ${index + 1}`;
  const id = slugify(raw?.id || `${name}-${index + 1}`);
  const url = normalizeAssetUrl(raw?.url || "");
  const r2Key = clean(raw?.r2Key || "", 900);
  if (!url && !r2Key) return null;
  return { id, name, url, r2Key };
}

function normalizeProductConfig(raw, fallbackSku = "") {
  if (!raw || typeof raw !== "object") return null;
  const name = clean(raw.name, 180);
  const sku = slugify(raw.sku || raw.slug || fallbackSku || name);
  const priceUsd = moneyNumber(raw.priceUsd);
  const compareAtUsd = Math.max(0, moneyNumber(raw.compareAtUsd));
  const assets = (Array.isArray(raw.assets) ? raw.assets : [])
    .slice(0, 30)
    .map(sanitizeAsset)
    .filter(Boolean);
  const aliases = (Array.isArray(raw.aliases) ? raw.aliases : [])
    .slice(0, 30)
    .map(x => clean(x, 180))
    .filter(Boolean);
  if (!name || !sku || priceUsd < 0) return null;
  return {
    sku,
    slug: sku,
    name,
    priceUsd,
    compareAtUsd,
    img: clean(raw.img || raw.image || "dingloft", 500) || "dingloft",
    imageUrl: clean(raw.imageUrl || "", 700),
    category: clean(raw.category || "Software", 120) || "Software",
    type: clean(raw.type || "Producto digital", 120) || "Producto digital",
    shortDescription: clean(raw.shortDescription || raw.subtitle || "", 500),
    description: clean(raw.description || "", 4000),
    badge: clean(raw.badge || "", 80),
    active: raw.active !== false,
    featured: raw.featured === true,
    assets,
    aliases
  };
}

function publicProductShape(p) {
  if (!p) return null;
  return {
    sku: p.sku,
    slug: p.sku,
    name: p.name,
    priceUsd: moneyNumber(p.priceUsd),
    compareAtUsd: Math.max(0, moneyNumber(p.compareAtUsd)),
    img: p.img || "dingloft",
    imageUrl: p.imageUrl || "",
    category: p.category || "Software",
    type: p.type || "Producto digital",
    shortDescription: p.shortDescription || "",
    description: p.description || "",
    badge: p.badge || "",
    active: p.active !== false,
    featured: p.featured === true,
    deliveryConfigured: Array.isArray(p.assets) && p.assets.length > 0,
    assetCount: Array.isArray(p.assets) ? p.assets.length : 0
  };
}

async function mergedProductCatalog(env, { includeInactive = false } = {}) {
  const rows = await adminRunQuery(env, {
    from: [{ collectionId: "digitalProducts" }],
    limit: 500
  }).catch(() => []);
  const overrides = new Map();
  for (const row of rows) {
    const normalized = normalizeProductConfig(row.data, row.id);
    if (normalized) overrides.set(normalized.sku, normalized);
  }
  const merged = [];
  const seen = new Set();
  for (const base of ALL_BUILTINS) {
    const product = overrides.get(base.sku) || normalizeProductConfig(base, base.sku);
    if (!product) continue;
    seen.add(product.sku);
    if (includeInactive || product.active !== false) merged.push(product);
  }
  for (const product of overrides.values()) {
    if (seen.has(product.sku)) continue;
    if (includeInactive || product.active !== false) merged.push(product);
  }
  merged.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return String(a.name || "").localeCompare(String(b.name || ""), "es", { sensitivity: "base" });
  });
  return merged;
}

async function publicCatalogRoute(request, env, origin) {
  try {
    const products = (await mergedProductCatalog(env)).map(publicProductShape);
    return json(env, { ok: true, products }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

async function publicProductRoute(request, env, origin, url) {
  try {
    const slug = slugify(url.searchParams.get("slug") || url.searchParams.get("sku") || "");
    if (!slug) throw new Error("PRODUCT_NOT_FOUND");
    const product = await resolveProduct(env, { sku: slug, name: slug }, { allowInactive: true });
    if (!product || product.active === false) throw new Error("PRODUCT_DISABLED");
    return json(env, { ok: true, product: publicProductShape(product) }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

async function loadProductOverride(env, sku) {
  const found = await adminGetDocument(env, ["digitalProducts", sku], true);
  if (!found.exists) return null;
  return normalizeProductConfig(found.data, sku);
}

async function resolveProduct(env, rawItem, { allowInactive = false } = {}) {
  const name = clean(rawItem?.name || rawItem, 220);
  const skuHint = clean(rawItem?.sku || "", 160);
  const keys = [];
  if (skuHint) keys.push(slugify(skuHint));
  if (name) keys.push(slugify(name));
  const unique = [...new Set(keys)];

  for (const key of unique) {
    const override = await loadProductOverride(env, key).catch(() => null);
    if (override) {
      if (!allowInactive && override.active === false) throw new Error("PRODUCT_DISABLED");
      return override;
    }
  }

  for (const key of unique) {
    const builtin = BUILTIN_BY_KEY.get(key);
    if (builtin) {
      const override = await loadProductOverride(env, builtin.sku).catch(() => null);
      const selected = override || builtin;
      if (!allowInactive && selected.active === false) throw new Error("PRODUCT_DISABLED");
      return selected;
    }
  }

  throw new Error("PRODUCT_NOT_FOUND");
}

function discountCodes(env) {
  const raw = clean(env.DISCOUNT_CODES_JSON || "", 12000);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    throw new Error("DISCOUNT_CONFIG_INVALID");
  }
}

function applyDiscount(env, subtotal, couponCode) {
  const code = clean(couponCode, 100).toUpperCase();
  if (!code) return { code: "", valid: false, discountUsd: 0, totalUsd: subtotal };
  const entries = discountCodes(env);
  const matchKey = Object.keys(entries).find(k => String(k).toUpperCase() === code);
  const cfg = matchKey ? entries[matchKey] : null;
  if (!cfg || cfg.active === false) return { code, valid: false, discountUsd: 0, totalUsd: subtotal };

  const type = clean(cfg.type || "percent", 30).toLowerCase();
  const value = Math.max(0, Number(cfg.value || 0));
  let discountUsd = 0;
  if (type === "percent") discountUsd = subtotal * Math.min(100, value) / 100;
  else if (type === "fixed") discountUsd = Math.min(subtotal, value);
  discountUsd = moneyNumber(discountUsd);
  return {
    code,
    valid: true,
    discountUsd,
    totalUsd: moneyNumber(Math.max(0, subtotal - discountUsd))
  };
}

async function buildQuote(env, rawItems, couponCode = "", { requireDelivery = true } = {}) {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) throw new Error("CART_INVALID");
  const items = [];
  for (const raw of rawItems) {
    const p = await resolveProduct(env, raw);
    if (requireDelivery && (!Array.isArray(p.assets) || p.assets.length === 0)) {
      const error = new Error("PRODUCT_DELIVERY_NOT_CONFIGURED");
      error.productName = p.name;
      throw error;
    }
    items.push({
      sku: p.sku,
      name: p.name,
      price: moneyNumber(p.priceUsd),
      img: p.img,
      type: p.type
    });
  }
  const subtotalUsd = moneyNumber(items.reduce((sum, item) => sum + Number(item.price || 0), 0));
  const discount = applyDiscount(env, subtotalUsd, couponCode);
  return {
    items,
    subtotalUsd,
    couponCode: discount.valid ? discount.code : "",
    couponValid: discount.valid,
    discountUsd: discount.discountUsd,
    totalUsd: discount.totalUsd,
    currency: "USD"
  };
}

async function userPurchases(env, uid) {
  return adminRunQuery(env, {
    from: [{ collectionId: "purchases" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "uid" },
        op: "EQUAL",
        value: { stringValue: uid }
      }
    },
    limit: 200
  });
}

async function userPurchasesByEmail(env, email) {
  const target = validEmail(email);
  if (!target) return [];
  return adminRunQuery(env, {
    from: [{ collectionId: "purchases" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "userEmail" },
        op: "EQUAL",
        value: { stringValue: target }
      }
    },
    limit: 200
  }).catch(() => []);
}

async function purchasesForAuthenticatedUser(env, user) {
  const direct = await userPurchases(env, user.uid);
  const email = validEmail(user.email);
  if (!email) return { purchases: direct, repaired: 0 };

  const byEmail = await userPurchasesByEmail(env, email);
  const merged = new Map(direct.map(row => [row.id, row]));
  let repaired = 0;

  for (const row of byEmail) {
    const purchase = row.data || {};
    const purchaseEmail = validEmail(purchase.userEmail);
    if (purchaseEmail !== email) continue;
    merged.set(row.id, row);

    // Repair legacy/admin purchases linked to an obsolete UID. Authenticated
    // ownership by the same verified Firebase email is enough to migrate it.
    if (clean(purchase.uid || "", 180) !== user.uid) {
      await adminPatchDocument(env, ["purchases", row.id], {
        uid: user.uid,
        uidRepairedFrom: clean(purchase.uid || "", 180),
        uidRepairedBy: "me-library-email-match",
        uidRepairedAt: new Date(),
        updatedAt: new Date()
      }).catch(() => {});
      row.data = { ...purchase, uid: user.uid };
      repaired++;
    }
  }
  return { purchases: [...merged.values()], repaired };
}

async function ensureNoDuplicateOwnership(env, uid, quote) {
  const purchases = await userPurchases(env, uid);
  const owned = new Set();
  for (const row of purchases) {
    const status = clean(row.data?.paymentStatus || "paid", 40).toLowerCase();
    if (["cancelled", "refunded", "failed"].includes(status)) continue;
    for (const item of Array.isArray(row.data?.items) ? row.data.items : []) {
      try {
        const p = await resolveProduct(env, item, { allowInactive: true });
        owned.add(p.sku);
      } catch (_) {}
    }
  }
  const duplicate = quote.items.find(item => owned.has(item.sku));
  if (duplicate) {
    const error = new Error("PRODUCT_ALREADY_OWNED");
    error.productName = duplicate.name;
    throw error;
  }
}

function paypalConfig(env) {
  const clientId = clean(env.PAYPAL_CLIENT_ID, 500);
  const clientSecret = clean(env.PAYPAL_CLIENT_SECRET, 1000);
  let apiBase = clean(env.PAYPAL_API_BASE || "https://api-m.paypal.com", 240).replace(/\/$/, "");
  if (!/^https:\/\/api-m\.(sandbox\.)?paypal\.com$/i.test(apiBase)) apiBase = "https://api-m.paypal.com";
  if (!clientId || !clientSecret) throw new Error("PAYPAL_CONFIG_INCOMPLETE");
  return { clientId, clientSecret, apiBase };
}

async function paypalAccessToken(env) {
  if (paypalTokenCache.token && Date.now() < paypalTokenCache.expiresAt) return paypalTokenCache.token;
  const cfg = paypalConfig(env);
  const response = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${cfg.clientId}:${cfg.clientSecret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: "grant_type=client_credentials"
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) throw new Error("PAYPAL_AUTH_FAILED");
  const ttl = Math.max(300, Number(body.expires_in || 3600));
  paypalTokenCache = { token: String(body.access_token), expiresAt: Date.now() + Math.max(60, ttl - 300) * 1000 };
  return paypalTokenCache.token;
}

async function paypalFetch(env, path, { method = "GET", body, requestId = "" } = {}) {
  const cfg = paypalConfig(env);
  const token = await paypalAccessToken(env);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "content-type": "application/json"
  };
  if (requestId) headers["PayPal-Request-Id"] = requestId;
  const response = await fetch(`${cfg.apiBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function captureFromPayPalOrder(order) {
  return order?.purchase_units?.[0]?.payments?.captures?.[0] || null;
}

function verifyMoney(value, currency, expectedValue, expectedCurrency = "USD") {
  if (String(currency || "").toUpperCase() !== String(expectedCurrency || "USD").toUpperCase()) {
    throw new Error("PAYPAL_CURRENCY_MISMATCH");
  }
  if (Math.abs(Number(value) - Number(expectedValue)) > 0.009) throw new Error("PAYPAL_AMOUNT_MISMATCH");
}

function safePayPalDocId(value) {
  const out = clean(value, 180).replace(/[^A-Za-z0-9_-]/g, "");
  if (!out) throw new Error("PAYPAL_ORDER_INVALID");
  return out;
}

function orderNumber(captureId) {
  return `#DING-${clean(captureId, 80).replace(/[^A-Za-z0-9]/g, "").slice(-10).toUpperCase()}`;
}

async function checkoutQuoteRoute(request, env, origin) {
  try {
    const body = await request.json().catch(() => ({}));
    const quote = await buildQuote(env, body.items, body.couponCode || "");
    return json(env, { ok: true, ...quote }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

async function createPayPalOrderRoute(request, env, origin) {
  try {
    const user = await requireFirebaseUser(request, env);
    const body = await request.json().catch(() => ({}));
    const quote = await buildQuote(env, body.items, body.couponCode || "");
    if (quote.totalUsd <= 0) throw new Error("USE_FREE_CHECKOUT");
    await ensureNoDuplicateOwnership(env, user.uid, quote);

    const requestId = crypto.randomUUID();
    const customId = `dingloft:${user.uid}:${requestId}`.slice(0, 127);
    const { response, data } = await paypalFetch(env, "/v2/checkout/orders", {
      method: "POST",
      requestId,
      body: {
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: "dingloft-digital-order",
          custom_id: customId,
          description: quote.items.length === 1 ? quote.items[0].name : `Dingloft · ${quote.items.length} productos digitales`,
          amount: { currency_code: "USD", value: moneyText(quote.totalUsd) }
        }]
      }
    });
    if (!response.ok || !data?.id) throw new Error("PAYPAL_CREATE_FAILED");

    const orderId = safePayPalDocId(data.id);
    const pending = {
      ownerUid: user.uid,
      ownerEmail: user.email,
      ownerDisplayName: user.displayName,
      orderId,
      requestId,
      customId,
      items: quote.items,
      subtotalUsd: quote.subtotalUsd,
      discountUsd: quote.discountUsd,
      couponCode: quote.couponCode,
      expectedAmount: moneyText(quote.totalUsd),
      expectedCurrency: "USD",
      status: "CREATED",
      fulfillmentStatus: "pending_payment",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await adminSetDocument(env, ["paypalOrders", orderId], pending);

    return json(env, {
      ok: true,
      orderId,
      amount: moneyText(quote.totalUsd),
      currency: "USD"
    }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

async function getPendingPayPalOrder(env, orderId) {
  const found = await adminGetDocument(env, ["paypalOrders", orderId], true);
  if (!found.exists) throw new Error("PAYPAL_ORDER_NOT_FOUND");
  return found.data;
}

async function sendZohoHtmlMail(env, { toAddress, subject, content }) {
  const email = validEmail(toAddress);
  if (!email) throw new Error("MAIL_RECIPIENT_INVALID");
  const cfg = zohoConfig(env);
  const token = await zohoAccessToken(env);
  const accountId = await zohoAccountId(env);
  const response = await fetch(`${cfg.mailBase}/api/accounts/${encodeURIComponent(accountId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "content-type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      fromAddress: cfg.fromAddress,
      toAddress: email,
      subject: clean(subject, 220),
      content,
      mailFormat: "html",
      encoding: "UTF-8",
      askReceipt: "no"
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Zoho mail", response.status, body?.status?.description || body?.data?.errorCode || "unknown");
    throw new Error("ZOHO_SEND_FAILED");
  }
  return { status: "sent", messageId: clean(body?.data?.messageId || body?.data?.mailId, 180) };
}

function buildDingloftDarkMail({
  badge = "Dingloft",
  micro = "Cuenta Dingloft",
  microText = "Tu cuenta está lista.",
  title1 = "Bienvenido a",
  title2 = "Dingloft.",
  greeting = "Hola Cliente,",
  message = "Tu cuenta Dingloft está disponible.",
  details = [],
  cta = "Abrir mi cuenta",
  ctaUrl = "https://www.dingloft.com/account.html",
  noticeTitle = "Acceso seguro",
  noticeText = "Tus compras y descargas se administran desde tu cuenta Dingloft."
} = {}) {
  const currentYear = new Date().getFullYear();
  const safeBadge = htmlEscape(badge);
  const safeMicro = htmlEscape(micro);
  const safeMicroText = htmlEscape(microText);
  const safeTitle1 = htmlEscape(title1);
  const safeTitle2 = htmlEscape(title2);
  const safeGreeting = greeting;
  const safeMessage = message;
  const safeCta = htmlEscape(cta);
  const safeCtaUrl = htmlEscape(safeUrl(ctaUrl) || "https://www.dingloft.com/account.html");
  const safeNoticeTitle = htmlEscape(noticeTitle);
  const safeNoticeText = htmlEscape(noticeText);
  const detailRows = (Array.isArray(details) ? details : []).map(([label, value], index) => `
    <tr><td style="padding:${index === 0 ? "16px 18px 10px" : "0 18px"};">${index === 0 ? "" : '<div style="height:1px;background-color:rgba(111,217,255,.10);background-image:linear-gradient(90deg,transparent,rgba(111,217,255,.26),transparent);"></div>'}</td></tr>
    <tr><td style="padding:${index === 0 ? "0 18px 16px" : "12px 18px 15px"};">
      <div style="color:#718090;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:5px;">${htmlEscape(label)}</div>
      <div class="gmail-screen"><div class="gmail-difference"><div style="color:#ffffff;font-size:13px;line-height:1.45;font-weight:650;">${htmlEscape(value || "—")}</div></div></div>
    </td></tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<style>
body,table,td,p,a,span,div{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}a{text-decoration:none}.bg{background-color:#020406!important;background-image:linear-gradient(180deg,#020406 0%,#020406 100%)!important}.panel{background-color:#0b1016!important;background-image:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.012) 55%,rgba(99,211,255,.035)),linear-gradient(180deg,#101720 0%,#070b10 100%)!important;border:1px solid rgba(112,220,255,.18)!important}.soft{background-color:#090d12!important;background-image:linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.008)),linear-gradient(180deg,#0d131a 0%,#06090d 100%)!important;border:1px solid rgba(112,220,255,.10)!important}.cta{background-color:#eefaff!important;background-image:linear-gradient(180deg,#ffffff 0%,#dff6ff 100%)!important}.gmail-screen{background:#000000;mix-blend-mode:screen}.gmail-difference{background:#000000;mix-blend-mode:difference}@media screen and (max-width:600px){.container{width:100%!important;padding:12px 7px!important}.card{width:100%!important;border-radius:18px!important}.header{padding:20px 18px!important}.bodypad{padding:22px 18px 24px!important}.hero{font-size:29px!important;line-height:1.06!important}.btn{width:100%!important;display:block!important;box-sizing:border-box!important;padding:16px 18px!important}.badge{font-size:8px!important;padding:7px 9px!important}}
</style></head>
<body class="bg" bgcolor="#020406" style="margin:0;padding:0;-webkit-font-smoothing:antialiased;background:#020406;color:#fff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#020406;">${safeMicroText}</div>
<table width="100%" border="0" cellpadding="0" cellspacing="0" class="bg" role="presentation"><tr><td align="center" valign="top" class="container bg" style="padding:36px 14px;">
<table width="600" class="card" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:600px;max-width:600px;border-radius:23px;overflow:hidden;border:1px solid rgba(112,220,255,.20);background-color:#05080c;background-image:linear-gradient(180deg,#080d12,#030507);box-shadow:0 24px 70px rgba(0,0,0,.46);">
<tr><td class="header" style="padding:25px 30px 23px;background-color:#111821;background-image:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.012) 52%,rgba(112,220,255,.045)),linear-gradient(180deg,#151e28,#0b1016);border-bottom:1px solid rgba(112,220,255,.18);">
<table width="100%" role="presentation"><tr><td valign="middle"><table role="presentation"><tr><td valign="middle" style="padding-right:12px;"><div style="width:42px;height:42px;line-height:42px;text-align:center;border-radius:13px;background:#05080c;border:1px solid rgba(112,220,255,.22);color:#9cecff;font-size:18px;font-weight:900;">D</div></td><td valign="middle"><div class="gmail-screen"><div class="gmail-difference"><div style="color:#fff;font-size:14px;font-weight:850;letter-spacing:3.3px;">DINGLOFT</div></div></div><div style="margin-top:5px;color:#66798a;font-size:7px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">EVOLUTION GROUP</div></td></tr></table></td><td align="right"><span class="badge" style="display:inline-block;padding:7px 11px;border-radius:999px;background-color:#0a2630;background-image:linear-gradient(180deg,rgba(112,220,255,.18),rgba(112,220,255,.035));border:1px solid rgba(112,220,255,.30);color:#b6efff;font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;">${safeBadge}</span></td></tr></table>
</td></tr>
<tr><td class="bodypad" style="padding:29px 32px 31px;background-color:#05080c;background-image:linear-gradient(180deg,#080d12,#040609);">
<table width="100%" class="soft" role="presentation" style="border-radius:14px;overflow:hidden;margin-bottom:21px;"><tr><td width="44" align="center" style="padding:12px 0 12px 14px;"><div style="width:28px;height:28px;line-height:28px;text-align:center;border-radius:9px;background:#09212a;border:1px solid rgba(112,220,255,.22);color:#8fe7ff;font-size:13px;font-weight:900;">✓</div></td><td style="padding:11px 12px 11px 9px;"><div style="color:#74defe;font-size:9px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;margin-bottom:3px;">${safeMicro}</div><div class="gmail-screen"><div class="gmail-difference"><div style="color:#fff;font-size:11px;line-height:1.4;font-weight:650;">${safeMicroText}</div></div></div></td><td width="46" align="center"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#70dcff;box-shadow:0 0 0 5px rgba(112,220,255,.07),0 0 16px rgba(112,220,255,.32);"></span></td></tr></table>
<div style="width:42px;height:2px;background:#72dcff;background-image:linear-gradient(90deg,#72dcff,#7487ff);border-radius:999px;margin-bottom:15px;"></div>
<div class="gmail-screen"><div class="gmail-difference"><div class="hero" style="color:#fff;font-size:34px;font-weight:760;letter-spacing:-1.1px;line-height:1.05;">${safeTitle1}</div></div></div><div class="hero" style="margin-top:2px;color:#79ddff;font-size:34px;font-weight:760;letter-spacing:-1.1px;line-height:1.05;">${safeTitle2}</div>
<div style="height:16px;line-height:16px;">&nbsp;</div>
<table width="100%" class="panel" role="presentation" style="border-radius:17px;overflow:hidden;margin-bottom:19px;"><tr><td style="padding:18px;border-left:2px solid #72dcff;"><div class="gmail-screen"><div class="gmail-difference"><div style="color:#fff;font-size:14px;line-height:1.55;margin-bottom:8px;">${safeGreeting}</div><div style="color:#fff;font-size:12px;line-height:1.72;opacity:.84;">${safeMessage}</div></div></div></td></tr></table>
${detailRows ? `<table width="100%" class="panel" role="presentation" style="border-radius:17px;overflow:hidden;margin-bottom:19px;"><tr><td style="padding:13px 18px 10px;border-bottom:1px solid rgba(112,220,255,.10);"><table width="100%" role="presentation"><tr><td><div style="color:#6f7d8c;font-size:8px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">Dingloft · Cuenta</div></td><td align="right"><span style="color:#7ae1ff;font-size:8px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;">● Activo</span></td></tr></table></td></tr>${detailRows}</table>` : ""}
<table width="100%" role="presentation" style="margin-bottom:19px;"><tr><td align="center" class="cta" style="border-radius:13px;border:1px solid #e7f8ff;box-shadow:0 9px 24px rgba(79,198,238,.13);"><a href="${safeCtaUrl}" class="btn" target="_blank" style="display:block;padding:16px 22px;color:#071017;font-size:13px;font-weight:900;letter-spacing:.35px;">${safeCta}&nbsp;&nbsp;→</a></td></tr></table>
<table width="100%" class="soft" role="presentation" style="border-radius:14px;overflow:hidden;"><tr><td width="42" align="center" valign="top" style="padding:14px 0 14px 13px;"><div style="width:25px;height:25px;line-height:25px;text-align:center;border-radius:8px;background:#091c24;border:1px solid rgba(112,220,255,.18);font-size:12px;color:#8fe7ff;">◆</div></td><td style="padding:13px 14px 13px 9px;"><div style="color:#74defe;font-size:9px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px;">${safeNoticeTitle}</div><div class="gmail-screen"><div class="gmail-difference"><div style="color:#fff;font-size:10px;line-height:1.62;opacity:.73;">${safeNoticeText}</div></div></div></td></tr></table>
<div style="padding:21px 0 0;text-align:center;"><div style="color:#6c8291;font-size:8px;font-weight:800;letter-spacing:1.7px;margin-bottom:7px;">DINGLOFT · EVOLUTION GROUP</div><div class="gmail-screen"><div class="gmail-difference"><div style="color:#fff;font-size:8px;line-height:1.55;opacity:.42;">© ${currentYear} Dingloft. Tus accesos, compras y descargas se administran desde dingloft.com.</div></div></div></div>
</td></tr></table></td></tr></table></body></html>`;
}

async function sendOrderEmailSafely(env, purchase) {
  const email = validEmail(purchase?.userEmail);
  if (!email) return { status: "skipped", messageId: "" };
  if (!(env.ZOHO_CLIENT_ID && env.ZOHO_CLIENT_SECRET && env.ZOHO_REFRESH_TOKEN && env.ZOHO_FROM_ADDRESS)) return { status: "skipped", messageId: "" };
  try {
    const accountUrl = safeUrl(env.ACCOUNT_URL || "https://www.dingloft.com/account.html") || "https://www.dingloft.com/account.html";
    const itemNames = (purchase.items || []).map(x => clean(x.name, 160)).filter(Boolean).join(", ");
    const name = htmlEscape(clean(purchase.payerName || "Cliente", 160));
    const content = buildDingloftDarkMail({
      badge: "Compra confirmada",
      micro: "Pago verificado",
      microText: "Tu pago fue confirmado y tu biblioteca fue actualizada.",
      title1: "Tu compra está",
      title2: "lista.",
      greeting: `Hola <strong>${name}</strong>,`,
      message: "Tu pago fue confirmado correctamente. Los archivos habilitados para esta compra ya están vinculados a tu cuenta Dingloft.",
      details: [
        ["Orden", purchase.orderNumber || "—"],
        ["Productos", itemNames || "Producto digital"],
        ["Total", `$${moneyText(purchase.amountPaidUsd || purchase.totalUsd || 0)} USD`]
      ],
      cta: "Abrir mis descargas",
      ctaUrl: accountUrl,
      noticeTitle: "Entrega protegida",
      noticeText: "Los archivos no se adjuntan al correo. Descárgalos únicamente desde tu cuenta Dingloft."
    });
    return await sendZohoHtmlMail(env, {
      toAddress: email,
      subject: `Compra confirmada ${purchase.orderNumber || ""} · Dingloft`,
      content
    });
  } catch (error) {
    console.error("order email", error?.message || error);
    return { status: "failed", messageId: "" };
  }
}

async function sendLoginWelcomeEmail(env, user) {
  const email = validEmail(user?.email);
  if (!email) throw new Error("MAIL_RECIPIENT_INVALID");
  const display = clean(user?.displayName || email.split("@")[0] || "Cliente", 160);
  const name = htmlEscape(display);
  const accountUrl = safeUrl(env.ACCOUNT_URL || "https://www.dingloft.com/account.html") || "https://www.dingloft.com/account.html";
  const content = buildDingloftDarkMail({
    badge: "Sesión iniciada",
    micro: "Bienvenido a Dingloft",
    microText: "Tu sesión fue iniciada correctamente.",
    title1: "Bienvenido a",
    title2: "Dingloft.",
    greeting: `Hola <strong>${name}</strong>,`,
    message: "Acabas de iniciar sesión en Dingloft. Desde tu cuenta puedes consultar tus compras, abrir tus descargas, explorar multitracks y gestionar soporte técnico.",
    details: [
      ["Cuenta", email],
      ["Estado", user?.emailVerified ? "Correo verificado" : "Cuenta activa"],
      ["Acceso", "Biblioteca · Compras · Multitracks · Soporte"]
    ],
    cta: "Abrir mi cuenta",
    ctaUrl: accountUrl,
    noticeTitle: "¿No fuiste tú?",
    noticeText: "Si no reconoces este inicio de sesión, cambia tu contraseña y revisa inmediatamente la seguridad de tu cuenta."
  });
  return sendZohoHtmlMail(env, { toAddress: email, subject: "Bienvenido a Dingloft · Sesión iniciada", content });
}

async function loginWelcomeRoute(request, env, origin) {
  try {
    const user = await requireFirebaseUser(request, env);
    if (!user.email) throw new Error("MAIL_RECIPIENT_INVALID");

    // Protect Zoho from accidental duplicate calls from the same completed login.
    const profile = await adminGetDocument(env, ["users", user.uid], true).catch(() => ({ exists:false, data:null }));
    const last = Date.parse(profile?.data?.lastWelcomeLoginEmailAt || "");
    if (Number.isFinite(last) && Date.now() - last < 60_000) {
      return json(env, { ok:true, sent:false, duplicateSuppressed:true }, 200, origin);
    }

    const mail = await sendLoginWelcomeEmail(env, user);
    await adminPatchDocument(env, ["users", user.uid], {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || profile?.data?.displayName || "",
      lastLoginAt: new Date(),
      lastWelcomeLoginEmailAt: new Date(),
      lastWelcomeLoginEmailStatus: mail.status || "sent",
      lastWelcomeLoginEmailMessageId: mail.messageId || "",
      updatedAt: new Date()
    }).catch(error => console.error("welcome mail metadata", error?.message || error));

    return json(env, { ok:true, sent:mail.status === "sent" }, 200, origin);
  } catch (error) {
    const code = String(error?.message || "");
    const status = ["AUTH_MISSING","AUTH_INVALID"].includes(code) ? 401 : 400;
    return json(env, { ok:false, code, error: code === "ZOHO_SEND_FAILED" ? "No se pudo enviar el correo de bienvenida." : "No se pudo procesar el correo de bienvenida." }, status, origin);
  }
}

function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function zohoConfig(env) {
  const clientId = clean(env.ZOHO_CLIENT_ID, 300);
  const clientSecret = clean(env.ZOHO_CLIENT_SECRET, 500);
  const refreshToken = clean(env.ZOHO_REFRESH_TOKEN, 1200);
  const fromAddress = validEmail(env.ZOHO_FROM_ADDRESS);
  const accountId = clean(env.ZOHO_ACCOUNT_ID, 160);
  const accountsBase = clean(env.ZOHO_ACCOUNTS_BASE || "https://accounts.zoho.com", 220).replace(/\/$/, "");
  const mailBase = clean(env.ZOHO_MAIL_BASE || "https://mail.zoho.com", 220).replace(/\/$/, "");
  if (!clientId || !clientSecret || !refreshToken || !fromAddress) throw new Error("ZOHO_CONFIG_INCOMPLETE");
  return { clientId, clientSecret, refreshToken, fromAddress, accountId, accountsBase, mailBase };
}

async function zohoAccessToken(env) {
  if (zohoTokenCache.token && Date.now() < zohoTokenCache.expiresAt) return zohoTokenCache.token;
  const cfg = zohoConfig(env);
  const form = new URLSearchParams({ refresh_token: cfg.refreshToken, client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: "refresh_token" });
  const response = await fetch(`${cfg.accountsBase}/oauth/v2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form.toString()
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) throw new Error("ZOHO_OAUTH_FAILED");
  const ttl = Math.max(300, Number(body.expires_in || 3600));
  zohoTokenCache = { token: String(body.access_token), expiresAt: Date.now() + Math.max(60, ttl - 300) * 1000 };
  return zohoTokenCache.token;
}

async function zohoAccountId(env) {
  const cfg = zohoConfig(env);
  if (cfg.accountId) return cfg.accountId;
  if (zohoAccountCache.accountId && zohoAccountCache.fromAddress === cfg.fromAddress && Date.now() < zohoAccountCache.expiresAt) return zohoAccountCache.accountId;
  const token = await zohoAccessToken(env);
  const response = await fetch(`${cfg.mailBase}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${token}`, Accept: "application/json" } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(body.data)) throw new Error("ZOHO_ACCOUNT_LOOKUP_FAILED");
  const wanted = cfg.fromAddress.toLowerCase();
  const match = body.data.find(account => [account?.primaryEmailAddress, account?.mailboxAddress, account?.incomingUserName].filter(Boolean).map(x => String(x).toLowerCase()).includes(wanted));
  const accountId = clean(match?.accountId, 160);
  if (!accountId) throw new Error("ZOHO_SENDER_NOT_FOUND");
  zohoAccountCache = { fromAddress: cfg.fromAddress, accountId, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
  return accountId;
}

async function finalizeCompletedPayPalOrder(env, pending, order) {
  const expectedAmount = Number(pending.expectedAmount || 0);
  const expectedCurrency = clean(pending.expectedCurrency || "USD", 10).toUpperCase();
  const purchaseUnit = order?.purchase_units?.[0] || {};
  if (clean(purchaseUnit.custom_id, 127) !== clean(pending.customId, 127)) throw new Error("PAYPAL_ORDER_CONTEXT_MISMATCH");
  verifyMoney(purchaseUnit?.amount?.value, purchaseUnit?.amount?.currency_code, expectedAmount, expectedCurrency);
  if (order?.status !== "COMPLETED") throw new Error("PAYPAL_CAPTURE_NOT_COMPLETED");
  const capture = captureFromPayPalOrder(order);
  if (!capture?.id || capture?.status !== "COMPLETED") throw new Error("PAYPAL_CAPTURE_NOT_COMPLETED");
  verifyMoney(capture?.amount?.value, capture?.amount?.currency_code, expectedAmount, expectedCurrency);

  const transactionId = clean(capture.id, 180);
  const purchaseId = `pp_${safePayPalDocId(transactionId)}`;
  const ledger = await adminGetDocument(env, ["paypalTransactions", transactionId], true);
  if (ledger.exists && (ledger.data?.orderId !== pending.orderId || ledger.data?.ownerUid !== pending.ownerUid)) {
    throw new Error("PAYPAL_TRANSACTION_ALREADY_USED");
  }

  const existingPurchase = await adminGetDocument(env, ["purchases", purchaseId], true);
  const payer = order?.payer || order?.payment_source?.paypal || {};
  const payerName = clean(`${clean(payer?.name?.given_name, 80)} ${clean(payer?.name?.surname, 80)}`.trim() || pending.ownerDisplayName || "Cliente", 160);
  const payerEmail = validEmail(payer?.email_address) || validEmail(pending.ownerEmail);
  const payerCountryCode = clean(
    payer?.address?.country_code || order?.purchase_units?.[0]?.shipping?.address?.country_code || "", 4
  ).toUpperCase();
  const payerCountry = countryNameFromCode(payerCountryCode);
  const now = new Date();

  const purchase = existingPurchase.exists ? existingPurchase.data : {
    uid: pending.ownerUid,
    userEmail: payerEmail || pending.ownerEmail || "",
    payerName,
    payerCountry,
    payerCountryCode,
    items: Array.isArray(pending.items) ? pending.items : [],
    paypalOrderId: pending.orderId,
    paypalCaptureId: transactionId,
    transactionId,
    orderNumber: orderNumber(transactionId),
    subtotalUsd: moneyNumber(pending.subtotalUsd),
    discountUsd: moneyNumber(pending.discountUsd),
    amountPaidUsd: moneyNumber(expectedAmount),
    currency: expectedCurrency,
    couponCode: clean(pending.couponCode, 100),
    paymentStatus: "paid",
    paymentProvider: "paypal-worker",
    paymentVerifiedByServer: true,
    fulfillmentStatus: "ready",
    deliveryStatus: "ready",
    createdAt: now,
    updatedAt: now
  };

  await adminSetDocument(env, ["purchases", purchaseId], purchase);
  await adminSetDocument(env, ["paypalTransactions", transactionId], {
    transactionId,
    orderId: pending.orderId,
    purchaseId,
    ownerUid: pending.ownerUid,
    amount: moneyText(expectedAmount),
    currency: expectedCurrency,
    status: "COMPLETED",
    processedAt: now
  });
  await adminPatchDocument(env, ["paypalOrders", pending.orderId], {
    status: "COMPLETED",
    fulfillmentStatus: "ready",
    transactionId,
    purchaseId,
    completedAt: now,
    updatedAt: now
  });
  await adminPatchDocument(env, ["users", pending.ownerUid], {
    uid: pending.ownerUid,
    email: pending.ownerEmail || payerEmail || "",
    displayName: pending.ownerDisplayName || payerName || "",
    lastPurchaseAt: now,
    lastPurchaseId: purchaseId,
    lastTransactionId: transactionId,
    lastPayPalOrderId: pending.orderId,
    payerCountry: payerCountry || undefined,
    payerCountryCode: payerCountryCode || undefined,
    updatedAt: now
  }).catch(() => {});

  if (!existingPurchase.exists || !existingPurchase.data?.clientNotificationStatus) {
    const mail = await sendOrderEmailSafely(env, purchase);
    await adminPatchDocument(env, ["purchases", purchaseId], {
      clientNotificationStatus: mail.status,
      clientNotificationMessageId: mail.messageId,
      updatedAt: new Date()
    }).catch(() => {});
    purchase.clientNotificationStatus = mail.status;
  }

  return { purchaseId, transactionId, purchase };
}

async function capturePayPalOrderRoute(request, env, origin) {
  try {
    const user = await requireFirebaseUser(request, env);
    const body = await request.json().catch(() => ({}));
    const orderId = safePayPalDocId(body.orderId);
    const pending = await getPendingPayPalOrder(env, orderId);
    if (pending.ownerUid !== user.uid) throw new Error("PAYPAL_ORDER_OWNER_MISMATCH");

    if (pending.status === "COMPLETED" && pending.purchaseId) {
      return json(env, {
        ok: true,
        alreadyProcessed: true,
        purchaseId: pending.purchaseId,
        transactionId: pending.transactionId || "",
        orderNumber: pending.transactionId ? orderNumber(pending.transactionId) : ""
      }, 200, origin);
    }

    const expectedAmount = Number(pending.expectedAmount || 0);
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) throw new Error("PAYPAL_AMOUNT_INVALID");

    let lookup = await paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
    if (!lookup.response.ok) throw new Error("PAYPAL_ORDER_NOT_FOUND");
    let order = lookup.data;
    const purchaseUnit = order?.purchase_units?.[0] || {};
    verifyMoney(purchaseUnit?.amount?.value, purchaseUnit?.amount?.currency_code, expectedAmount, pending.expectedCurrency || "USD");
    if (clean(purchaseUnit.custom_id, 127) !== clean(pending.customId, 127)) throw new Error("PAYPAL_ORDER_CONTEXT_MISMATCH");

    if (order.status !== "COMPLETED") {
      const captured = await paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: "POST",
        requestId: `capture-${orderId}`.slice(0, 108),
        body: {}
      });
      if (captured.response.ok) order = captured.data;
      else {
        const retry = await paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
        if (!retry.response.ok || retry.data?.status !== "COMPLETED") throw new Error("PAYPAL_CAPTURE_NOT_COMPLETED");
        order = retry.data;
      }
    }

    const result = await finalizeCompletedPayPalOrder(env, pending, order);
    return json(env, {
      ok: true,
      purchaseId: result.purchaseId,
      transactionId: result.transactionId,
      orderNumber: result.purchase.orderNumber,
      fulfillmentStatus: "ready"
    }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

async function freeCheckoutRoute(request, env, origin) {
  try {
    const user = await requireFirebaseUser(request, env);
    const body = await request.json().catch(() => ({}));
    const quote = await buildQuote(env, body.items, body.couponCode || "");
    if (quote.totalUsd !== 0) throw new Error("FREE_CHECKOUT_NOT_ALLOWED");
    await ensureNoDuplicateOwnership(env, user.uid, quote);
    const id = `free_${crypto.randomUUID().replace(/-/g, "")}`;
    const now = new Date();
    const purchase = {
      uid: user.uid,
      userEmail: user.email,
      payerName: user.displayName || user.email || "Cliente",
      items: quote.items,
      paypalOrderId: `FREE-${id}`,
      orderNumber: `#DING-FREE-${id.slice(-8).toUpperCase()}`,
      subtotalUsd: quote.subtotalUsd,
      discountUsd: quote.discountUsd,
      amountPaidUsd: 0,
      currency: "USD",
      couponCode: quote.couponCode,
      paymentStatus: "paid",
      paymentProvider: "free-worker",
      paymentVerifiedByServer: true,
      fulfillmentStatus: "ready",
      deliveryStatus: "ready",
      createdAt: now,
      updatedAt: now
    };
    await adminSetDocument(env, ["purchases", id], purchase);
    await adminPatchDocument(env, ["users", user.uid], {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      lastPurchaseAt: now,
      lastPurchaseId: id,
      updatedAt: now
    }).catch(() => {});
    const mail = await sendOrderEmailSafely(env, purchase);
    await adminPatchDocument(env, ["purchases", id], {
      clientNotificationStatus: mail.status,
      clientNotificationMessageId: mail.messageId,
      updatedAt: new Date()
    }).catch(() => {});
    return json(env, { ok: true, purchaseId: id, orderNumber: purchase.orderNumber, fulfillmentStatus: "ready" }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

function downloadSigningSecret(env) {
  const secret = String(env.DOWNLOAD_SIGNING_SECRET || "");
  if (secret.length < 32) throw new Error("DOWNLOAD_SIGNING_SECRET_INCOMPLETE");
  return secret;
}

async function signDownloadToken(env, payload) {
  const secret = downloadSigningSecret(env);
  const body = base64UrlText(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return `${body}.${base64UrlBytes(sig)}`;
}

async function verifyDownloadToken(env, token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) throw new Error("DOWNLOAD_TOKEN_INVALID");
  const secret = downloadSigningSecret(env);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  let rawSig = sig.replace(/-/g, "+").replace(/_/g, "/");
  while (rawSig.length % 4) rawSig += "=";
  const binary = atob(rawSig);
  const sigBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) sigBytes[i] = binary.charCodeAt(i);
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(body));
  if (!ok) throw new Error("DOWNLOAD_TOKEN_INVALID");
  const payload = JSON.parse(base64UrlDecodeText(body));
  if (!payload?.uid || !payload?.purchaseId || !payload?.sku || !Number.isInteger(payload?.asset)) throw new Error("DOWNLOAD_TOKEN_INVALID");
  if (Number(payload.exp || 0) < Math.floor(Date.now() / 1000)) throw new Error("DOWNLOAD_TOKEN_EXPIRED");
  return payload;
}

async function reconcileUserPendingPayPalOrders(env, user) {
  const rows = await adminRunQuery(env, {
    from: [{ collectionId: "paypalOrders" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "ownerUid" },
        op: "EQUAL",
        value: { stringValue: user.uid }
      }
    },
    limit: 30
  }).catch(() => []);

  let recovered = 0;
  for (const row of rows) {
    const pending = row.data || {};
    if (pending.status === "COMPLETED" || !pending.orderId) continue;
    try {
      const lookup = await paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(pending.orderId)}`);
      if (lookup.response.ok && lookup.data?.status === "COMPLETED") {
        await finalizeCompletedPayPalOrder(env, pending, lookup.data);
        recovered++;
      }
    } catch (error) {
      console.error("account reconciliation", pending.orderId, error?.message || error);
    }
  }
  return recovered;
}

async function libraryRoute(request, env, origin) {
  try {
    const user = await requireFirebaseUser(request, env);
    downloadSigningSecret(env);
    // Self-heal: if the browser died after PayPal captured, opening Mi cuenta
    // reconciles any still-pending order directly against PayPal.
    await reconcileUserPendingPayPalOrders(env, user);
    const owned = await purchasesForAuthenticatedUser(env, user);
    const purchases = owned.purchases;
    purchases.sort((a, b) => new Date(b.data?.createdAt || 0).getTime() - new Date(a.data?.createdAt || 0).getTime());
    const base = new URL(request.url).origin;
    const orders = [];

    for (const row of purchases) {
      const purchase = row.data || {};
      const payState = clean(purchase.paymentStatus || "paid", 40).toLowerCase();
      const fulfillState = clean(purchase.fulfillmentStatus || purchase.deliveryStatus || "ready", 40).toLowerCase();
      if (payState !== "paid" || ["revoked","hold","pending_payment"].includes(fulfillState)) continue;
      const items = [];
      for (const rawItem of Array.isArray(purchase.items) ? purchase.items : []) {
        let p;
        try { p = await resolveProduct(env, rawItem, { allowInactive: true }); }
        catch (_) {
          items.push({
            sku: slugify(rawItem?.name || "producto"),
            name: clean(rawItem?.name || "Producto", 180),
            img: clean(rawItem?.img || "dingloft", 80),
            type: clean(rawItem?.type || "Producto digital", 120),
            deliveryStatus: "missing_product_configuration",
            assets: []
          });
          continue;
        }

        const assets = [];
        for (let i = 0; i < (p.assets || []).length; i++) {
          const a = p.assets[i];
          const token = await signDownloadToken(env, {
            uid: user.uid,
            purchaseId: row.id,
            sku: p.sku,
            asset: i,
            exp: Math.floor(Date.now() / 1000) + 10 * 60
          });
          assets.push({ id: a.id, name: a.name, downloadUrl: `${base}/download?t=${encodeURIComponent(token)}` });
        }
        items.push({
          sku: p.sku,
          name: p.name,
          img: p.img,
          type: p.type,
          deliveryStatus: assets.length ? "ready" : "missing_files",
          quantity: Math.max(1, Math.floor(Number(rawItem?.quantity || 1))),
          assets
        });
      }
      orders.push({
        purchaseId: row.id,
        orderNumber: clean(purchase.orderNumber || purchase.paypalOrderId || row.id, 180),
        paymentStatus: clean(purchase.paymentStatus || "paid", 60),
        fulfillmentStatus: clean(purchase.fulfillmentStatus || "ready", 60),
        createdAt: purchase.createdAt || null,
        items
      });
    }

    return json(env, { ok: true, orders, repairedPurchases: owned.repaired || 0 }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

async function purchaseOwnsSku(env, purchase, sku) {
  for (const item of Array.isArray(purchase?.items) ? purchase.items : []) {
    try {
      const p = await resolveProduct(env, item, { allowInactive: true });
      if (p.sku === sku) return true;
    } catch (_) {}
  }
  return false;
}

async function downloadRoute(request, env) {
  try {
    const url = new URL(request.url);
    const payload = await verifyDownloadToken(env, url.searchParams.get("t"));
    const ownerSnap = await adminGetDocument(env, ["users", payload.uid], true).catch(() => ({exists:false,data:{}}));
    if (ownerSnap.exists && (ownerSnap.data?.accountBlocked === true || clean(ownerSnap.data?.accountReviewStatus || "", 40) === "under_review")) throw new Error("ACCOUNT_REVIEW");
    const found = await adminGetDocument(env, ["purchases", payload.purchaseId], true);
    if (!found.exists || found.data?.uid !== payload.uid) throw new Error("DOWNLOAD_NOT_AUTHORIZED");
    if (!await purchaseOwnsSku(env, found.data, payload.sku)) throw new Error("DOWNLOAD_NOT_AUTHORIZED");
    const p = await resolveProduct(env, { sku: payload.sku, name: payload.sku }, { allowInactive: true });
    const a = p.assets?.[payload.asset];
    if (!a) throw new Error("DOWNLOAD_FILE_NOT_FOUND");

    if (a.r2Key) {
      if (!env.DIGITAL_FILES) throw new Error("DIGITAL_FILES_R2_MISSING");
      const object = await env.DIGITAL_FILES.get(a.r2Key);
      if (!object) throw new Error("DOWNLOAD_FILE_NOT_FOUND");
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("cache-control", "private, no-store");
      headers.set("content-disposition", `attachment; filename="${clean(a.name, 160).replace(/[\r\n"]/g, "_")}"`);
      return new Response(object.body, { status: 200, headers });
    }

    if (!a.url) throw new Error("DOWNLOAD_FILE_NOT_FOUND");
    return Response.redirect(a.url, 302);
  } catch (error) {
    const code = String(error?.message || "");
    const status = code === "DOWNLOAD_TOKEN_EXPIRED" ? 410 : 403;
    return new Response(code === "DOWNLOAD_TOKEN_EXPIRED" ? "Este enlace expiró. Vuelve a Mi cuenta para generar uno nuevo." : "Descarga no autorizada.", {
      status,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }
}

async function verifyPayPalWebhook(env, request, event) {
  const webhookId = clean(env.PAYPAL_WEBHOOK_ID, 300);
  if (!webhookId) throw new Error("PAYPAL_WEBHOOK_NOT_CONFIGURED");
  const payload = {
    auth_algo: clean(request.headers.get("paypal-auth-algo"), 200),
    cert_url: clean(request.headers.get("paypal-cert-url"), 1000),
    transmission_id: clean(request.headers.get("paypal-transmission-id"), 300),
    transmission_sig: clean(request.headers.get("paypal-transmission-sig"), 1200),
    transmission_time: clean(request.headers.get("paypal-transmission-time"), 200),
    webhook_id: webhookId,
    webhook_event: event
  };
  const { response, data } = await paypalFetch(env, "/v1/notifications/verify-webhook-signature", { method: "POST", body: payload });
  if (!response.ok || data?.verification_status !== "SUCCESS") throw new Error("PAYPAL_WEBHOOK_INVALID");
}

async function paypalWebhookRoute(request, env) {
  try {
    const event = await request.json().catch(() => null);
    if (!event?.id || !event?.event_type) throw new Error("PAYPAL_WEBHOOK_INVALID");
    await verifyPayPalWebhook(env, request, event);

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = safePayPalDocId(event?.resource?.supplementary_data?.related_ids?.order_id || "");
      if (orderId) {
        const found = await adminGetDocument(env, ["paypalOrders", orderId], true);
        if (found.exists && found.data?.status !== "COMPLETED") {
          const lookup = await paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
          if (lookup.response.ok && lookup.data?.status === "COMPLETED") {
            await finalizeCompletedPayPalOrder(env, found.data, lookup.data);
          }
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("paypal webhook", error?.message || error);
    return new Response("INVALID", { status: 400 });
  }
}


function countryNameFromCode(code) {
  const c = clean(code || "", 4).toUpperCase();
  if (!c) return "";
  try {
    const names = new Intl.DisplayNames(["es"], { type: "region" });
    return clean(names.of(c) || c, 120);
  } catch (_) { return c; }
}

function countryFromPurchaseOrUser(p = {}, u = {}) {
  const lastGeo = u?.lastGeo && typeof u.lastGeo === "object" ? u.lastGeo : {};
  const code = clean(
    u.nationalityCode || u.countryCode || u.payerCountryCode || lastGeo.countryCode ||
    p.payerCountryCode || p.countryCode || "", 4
  ).toUpperCase();
  const name = clean(
    u.nationality || u.country || u.payerCountry || lastGeo.country ||
    p.payerCountry || p.country || countryNameFromCode(code) || "", 120
  );
  return { code, name };
}

async function adminCustomersRoute(request, env, origin) {
  try {
    await requireFirebaseAdmin(request, env);
    const [userRows, purchaseRows] = await Promise.all([
      adminRunQuery(env, { from: [{ collectionId: "users" }], limit: 500 }).catch(() => []),
      adminRunQuery(env, { from: [{ collectionId: "purchases" }], limit: 700 }).catch(() => [])
    ]);

    const map = new Map();
    const ensure = (uid, email = "") => {
      const key = uid || String(email || "").toLowerCase();
      if (!map.has(key)) map.set(key, {
        uid: uid || "", email: validEmail(email) || "", displayName: "", photoURL: "",
        nationality: "", nationalityCode: "", adminNote: "", lastLogin: null,
        lastPresenceDevice:"", lastPresenceBrowser:"", lastPresenceOS:"", lastPresencePath:"", lastGeo:null,
        accountBlocked:false, accountReviewStatus:"active", accountReviewReason:"", accountReviewMessage:"", accountBlockedAt:null,
        ordersCount: 0, itemsCount: 0, totalSpentUsd: 0, lastPurchaseAt: null
      });
      return map.get(key);
    };

    for (const row of userRows) {
      const u = row.data || {};
      const uid = clean(row.id, 180);
      const email = validEmail(u.email) || "";
      const c = ensure(uid, email);
      c.displayName = clean(u.displayName || u.name || "", 160);
      c.photoURL = clean(u.photoURL || "", 900);
      c.adminNote = clean(u.adminNote || "", 1200);
      c.lastLogin = u.lastLogin || u.lastSeenAt || null;
      c.lastPresenceDevice = clean(u.lastPresenceDevice || "", 80);
      c.lastPresenceBrowser = clean(u.lastPresenceBrowser || "", 80);
      c.lastPresenceOS = clean(u.lastPresenceOS || "", 50);
      c.lastPresencePath = clean(u.lastPresencePath || "", 500);
      c.lastGeo = u.lastGeo && typeof u.lastGeo === "object" ? u.lastGeo : null;
      c.accountBlocked = u.accountBlocked === true || clean(u.accountReviewStatus || "", 40) === "under_review";
      c.accountReviewStatus = c.accountBlocked ? "under_review" : "active";
      c.accountReviewReason = clean(u.accountReviewReason || "", 600);
      c.accountReviewMessage = clean(u.accountReviewMessage || "", 1200);
      c.accountBlockedAt = u.accountBlockedAt || u.accountReviewStartedAt || null;
      const country = countryFromPurchaseOrUser({}, u);
      c.nationality = country.name;
      c.nationalityCode = country.code;
    }

    for (const row of purchaseRows) {
      const p = row.data || {};
      const uid = clean(p.uid || "", 180);
      const email = validEmail(p.userEmail) || "";
      const c = ensure(uid, email);
      if (!c.email) c.email = email;
      if (!c.displayName) c.displayName = clean(p.payerName || p.userName || "", 160);
      const paid = clean(p.paymentStatus || "paid", 40).toLowerCase() === "paid";
      if (paid) {
        c.ordersCount += 1;
        c.itemsCount += (Array.isArray(p.items) ? p.items : []).reduce((s, i) => s + Math.max(1, Number(i?.quantity || 1)), 0);
        c.totalSpentUsd = moneyNumber(c.totalSpentUsd + Number(p.amountPaidUsd ?? p.amount ?? 0));
      }
      const when = p.createdAt || null;
      const old = c.lastPurchaseAt ? new Date(c.lastPurchaseAt).getTime() : 0;
      const neu = when ? new Date(when).getTime() : 0;
      if (neu >= old) {
        c.lastPurchaseAt = when;
        const country = countryFromPurchaseOrUser(p, {});
        if (!c.nationality && country.name) c.nationality = country.name;
        if (!c.nationalityCode && country.code) c.nationalityCode = country.code;
      }
    }

    const customers = [...map.values()]
      .filter(c => c.uid || c.email)
      .sort((a,b) => Number(b.totalSpentUsd || 0) - Number(a.totalSpentUsd || 0) || String(a.email).localeCompare(String(b.email)));
    return json(env, { ok: true, customers }, 200, origin);
  } catch (error) { return commerceError(env, error, origin); }
}

async function adminCustomerUpdateRoute(request, env, origin) {
  try {
    const admin = await requireFirebaseAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    let uid = clean(body.uid || "", 180);
    if (!uid && body.email) {
      const found = await findUserByEmail(env, body.email);
      uid = found?.uid || "";
    }
    if (!uid) throw new Error("CUSTOMER_ACCOUNT_NOT_FOUND");
    const nationalityCode = clean(body.nationalityCode || "", 4).toUpperCase();
    const nationality = clean(body.nationality || countryNameFromCode(nationalityCode) || "", 120);
    const adminNote = clean(body.adminNote || "", 1200);
    await adminPatchDocument(env, ["users", uid], {
      nationality,
      nationalityCode,
      adminNote,
      adminProfileUpdatedAt: new Date(),
      adminProfileUpdatedBy: admin.email
    });
    return json(env, { ok: true, uid, nationality, nationalityCode, adminNote }, 200, origin);
  } catch (error) { return commerceError(env, error, origin); }
}

async function adminCustomerBlockRoute(request, env, origin) {
  try {
    const admin = await requireFirebaseAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    let uid = clean(body.uid || "", 180);
    let targetEmail = validEmail(body.email || "");
    if (!uid && targetEmail) {
      const found = await findUserByEmail(env, targetEmail);
      uid = found?.uid || "";
      targetEmail = validEmail(found?.email || targetEmail);
    }
    if (!uid) throw new Error("CUSTOMER_ACCOUNT_NOT_FOUND");
    const userSnap = await adminGetDocument(env, ["users", uid], true);
    if (!userSnap.exists) throw new Error("CUSTOMER_ACCOUNT_NOT_FOUND");
    const userData = userSnap.data || {};
    targetEmail = validEmail(userData.email || targetEmail);
    if (targetEmail && ADMIN_EMAILS.has(targetEmail)) throw new Error("ADMIN_BLOCK_FORBIDDEN");

    const blocked = body.blocked === true;
    const now = new Date();
    const defaultMessage = "Tu cuenta está temporalmente en revisión. Hemos recibido un reporte relacionado con una transacción o posible actividad irregular y nuestro equipo está verificando la información. Durante esta revisión, el acceso a la cuenta y a sus funciones permanece suspendido. Si consideras que se trata de un error, comunícate con Soporte Dingloft.";
    const patch = blocked ? {
      accountBlocked:true,
      accountReviewStatus:"under_review",
      accountReviewReason:clean(body.reason || "Revisión administrativa", 600),
      accountReviewMessage:clean(body.message || defaultMessage, 1200),
      accountBlockedAt:now,
      accountReviewStartedAt:now,
      accountBlockedByAdminEmail:admin.email,
      updatedAt:now
    } : {
      accountBlocked:false,
      accountReviewStatus:"active",
      accountReviewReason:"",
      accountReviewMessage:"",
      accountUnblockedAt:now,
      accountUnblockedByAdminEmail:admin.email,
      updatedAt:now
    };
    await adminPatchDocument(env, ["users", uid], patch);
    return json(env, { ok:true, uid, email:targetEmail, blocked, status:blocked?"under_review":"active" }, 200, origin);
  } catch (error) { return commerceError(env, error, origin); }
}

async function adminManualOrderRoute(request, env, origin) {
  try {
    const admin = await requireFirebaseAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    const customer = await resolveAdminCustomer(env, body);

    const rawItems = Array.isArray(body.items) ? body.items.slice(0, 25) : [];
    if (!rawItems.length) throw new Error("CART_INVALID");
    const items = [];
    for (const raw of rawItems) {
      const product = await resolveProduct(env, { sku: raw?.sku || raw?.name }, { allowInactive: true });
      if (!product?.assets?.length) {
        const err = new Error("PRODUCT_DELIVERY_NOT_CONFIGURED"); err.productName = product?.name || "Producto"; throw err;
      }
      const quantity = Math.max(1, Math.min(99, Math.floor(Number(raw?.quantity || 1))));
      let unitPriceUsd = Number(raw?.unitPriceUsd);
      if (!Number.isFinite(unitPriceUsd)) unitPriceUsd = Number(product.priceUsd || 0);
      unitPriceUsd = moneyNumber(Math.max(0, Math.min(100000, unitPriceUsd)));
      items.push({ sku: product.sku, name: product.name, price: unitPriceUsd, priceUsd: unitPriceUsd, quantity, img: product.img, type: product.type });
    }
    const subtotalUsd = moneyNumber(items.reduce((s,i)=>s + Number(i.unitPriceUsd ?? i.priceUsd ?? i.price ?? 0) * Number(i.quantity || 1), 0));
    const discountType = clean(body.discountType || "none", 20).toLowerCase();
    const discountValue = Math.max(0, Number(body.discountValue || 0));
    let discountUsd = 0;
    if (discountType === "percent") discountUsd = subtotalUsd * Math.min(100, discountValue) / 100;
    if (discountType === "fixed") discountUsd = Math.min(subtotalUsd, discountValue);
    discountUsd = moneyNumber(discountUsd);
    const totalUsd = moneyNumber(Math.max(0, subtotalUsd - discountUsd));
    const paymentStatus = clean(body.paymentStatus || "paid", 30).toLowerCase() === "pending" ? "pending" : "paid";
    const paymentProvider = clean(body.paymentProvider || "admin-manual", 80) || "admin-manual";
    const now = new Date();
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    const purchaseId = `manual_${suffix.toLowerCase()}`;
    const orderNum = `#DING-MAN-${suffix.slice(-8)}`;
    const userSnap = await adminGetDocument(env, ["users", customer.uid], true).catch(()=>({exists:false,data:{}}));
    const country = countryFromPurchaseOrUser({}, userSnap.data || customer);
    const purchase = {
      uid: customer.uid,
      userEmail: validEmail(customer.email || body.customerEmail) || "",
      payerName: clean(customer.displayName || body.customerName || customer.email || "Cliente", 160),
      payerCountry: country.name,
      payerCountryCode: country.code,
      items,
      paypalOrderId: "",
      transactionId: `MANUAL-${suffix}`,
      orderNumber: orderNum,
      subtotalUsd,
      discountUsd,
      amountPaidUsd: paymentStatus === "paid" ? totalUsd : 0,
      orderTotalUsd: totalUsd,
      currency: "USD",
      paymentStatus,
      paymentProvider,
      paymentVerifiedByServer: paymentStatus === "paid",
      fulfillmentStatus: paymentStatus === "paid" ? "ready" : "pending_payment",
      deliveryStatus: paymentStatus === "paid" ? "ready" : "pending_payment",
      adminNote: clean(body.adminNote || "", 1200),
      source: "admin-manual-order",
      createdByAdminEmail: admin.email,
      createdAt: now,
      updatedAt: now
    };
    await adminSetDocument(env, ["purchases", purchaseId], purchase);
    await adminPatchDocument(env, ["users", customer.uid], {
      lastPurchaseAt: now, lastPurchaseId: purchaseId, updatedAt: now
    }).catch(()=>{});
    let mail = { status: "skipped", messageId: "" };
    if (paymentStatus === "paid" && body.sendEmail !== false) {
      mail = await sendOrderEmailSafely(env, purchase);
      await adminPatchDocument(env, ["purchases", purchaseId], {
        clientNotificationStatus: mail.status,
        clientNotificationMessageId: mail.messageId,
        updatedAt: new Date()
      }).catch(()=>{});
    }
    return json(env, { ok: true, purchaseId, orderNumber: orderNum, totalUsd, mailStatus: mail.status }, 200, origin);
  } catch (error) { return commerceError(env, error, origin); }
}

async function adminOrderUpdateRoute(request, env, origin) {
  try {
    const admin = await requireFirebaseAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    const purchaseId = clean(body.purchaseId || "", 220);
    if (!purchaseId) throw new Error("ORDER_NOT_FOUND");
    const found = await adminGetDocument(env, ["purchases", purchaseId], true);
    if (!found.exists) throw new Error("ORDER_NOT_FOUND");
    const current = found.data || {};
    const next = {};
    const fulfillment = clean(body.fulfillmentStatus || current.fulfillmentStatus || "ready", 40).toLowerCase();
    if (!["ready","hold","revoked","pending_payment"].includes(fulfillment)) throw new Error("ORDER_STATUS_INVALID");
    next.fulfillmentStatus = fulfillment;
    next.deliveryStatus = fulfillment;
    next.adminNote = clean(body.adminNote ?? current.adminNote ?? "", 1200);
    if (body.paymentStatus) {
      const requested = clean(body.paymentStatus, 30).toLowerCase();
      const provider = clean(current.paymentProvider || "", 80).toLowerCase();
      if (!["paid","pending"].includes(requested)) throw new Error("ORDER_STATUS_INVALID");
      if (!provider.includes("manual") && !provider.includes("bank") && requested !== current.paymentStatus) throw new Error("ORDER_PAYMENT_LOCKED");
      next.paymentStatus = requested;
      if (requested === "paid") {
        for (const raw of Array.isArray(current.items) ? current.items : []) {
          const p = await resolveProduct(env, raw, { allowInactive: true });
          if (!p?.assets?.length) { const err = new Error("PRODUCT_DELIVERY_NOT_CONFIGURED"); err.productName=p?.name||"Producto"; throw err; }
        }
        next.fulfillmentStatus = "ready";
        next.deliveryStatus = "ready";
        next.amountPaidUsd = moneyNumber(current.orderTotalUsd ?? current.amountPaidUsd ?? 0);
        next.paidAt = new Date();
      }
    }
    next.updatedAt = new Date();
    next.updatedByAdminEmail = admin.email;
    await adminPatchDocument(env, ["purchases", purchaseId], next);
    let mailStatus = "skipped";
    if (body.sendEmail === true && (next.paymentStatus || current.paymentStatus) === "paid") {
      const merged = { ...current, ...next };
      const mail = await sendOrderEmailSafely(env, merged);
      mailStatus = mail.status;
      await adminPatchDocument(env, ["purchases", purchaseId], { clientNotificationStatus: mail.status, clientNotificationMessageId: mail.messageId, updatedAt:new Date() }).catch(()=>{});
    }
    return json(env, { ok:true, purchaseId, mailStatus }, 200, origin);
  } catch (error) { return commerceError(env, error, origin); }
}

async function adminCatalogRoute(request, env, origin) {
  try {
    await requireFirebaseAdmin(request, env);
    const products = (await mergedProductCatalog(env, { includeInactive: true })).filter(p => clean(p.type || "", 120).toLowerCase() !== "multitrack digital").map(p => ({
      ...publicProductShape(p),
      aliases: Array.isArray(p.aliases) ? p.aliases : [],
      assets: Array.isArray(p.assets) ? p.assets.map(a => ({ id: a.id, name: a.name, url: a.url || "", r2Key: a.r2Key || "" })) : []
    }));
    return json(env, { ok: true, products }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

async function adminUpsertProductRoute(request, env, origin) {
  try {
    const admin = await requireFirebaseAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    const normalized = normalizeProductConfig(body, body.sku || body.name);
    if (!normalized) throw new Error("PRODUCT_INVALID");
    const existing = await adminGetDocument(env, ["digitalProducts", normalized.sku], true).catch(() => ({ exists: false }));
    const now = new Date();
    await adminSetDocument(env, ["digitalProducts", normalized.sku], {
      ...normalized,
      createdAt: existing.exists ? (existing.data?.createdAt || now) : now,
      updatedAt: now,
      updatedBy: admin.email
    });
    return json(env, { ok: true, product: normalized }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}


const REVIEW_COLLECTIONS = [
  { collection: "sketchup_comments_final", product: "SketchUp Pro 2026" },
  { collection: "autocad_comments_final", product: "AutoCAD 2026" },
  { collection: "cinema4d_comments_final", product: "Cinema 4D" },
  { collection: "logic_comments_final", product: "Logic Pro" },
  { collection: "mainstage_comments_final", product: "MainStage" },
  { collection: "nord_comments_final", product: "Nord Stage" },
  { collection: "office_comments_final", product: "Office" },
  { collection: "rhodes_comments_final", product: "Rhodes" },
  { collection: "yamahakeys_comments_final", product: "Yamaha Premium Keys" },
  { collection: "esword_comments_v1", product: "Biblias E-Sword" },
  { collection: "product_comments_pianos_v5", product: "Pianos / Librerías" }
];
const REVIEW_COLLECTION_SET = new Set(REVIEW_COLLECTIONS.map(x => x.collection));

async function adminReviewsRoute(request, env, origin, url) {
  try {
    await requireFirebaseAdmin(request, env);
    const perCollection = Math.max(10, Math.min(300, Number(url.searchParams.get("limit") || 150)));
    const reviews = [];
    for (const source of REVIEW_COLLECTIONS) {
      const rows = await adminRunQuery(env, {
        from: [{ collectionId: source.collection }],
        limit: perCollection
      }).catch(() => []);
      for (const row of rows) {
        const r = row.data || {};
        reviews.push({
          id: row.id,
          collection: source.collection,
          product: source.product,
          name: clean(r.name || r.userName || r.displayName || "Usuario", 160),
          text: clean(r.text || r.comment || r.review || "", 3000),
          rating: Math.max(1, Math.min(5, Number(r.rating || 5))),
          likes: Math.max(0, Number(r.likes || 0)),
          createdAt: r.createdAt || null
        });
      }
    }
    reviews.sort((a,b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return json(env, { ok: true, reviews }, 200, origin);
  } catch (error) { return commerceError(env, error, origin); }
}

async function adminDeleteReviewRoute(request, env, origin) {
  try {
    const admin = await requireFirebaseAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    const collection = clean(body.collection || "", 120);
    const id = clean(body.id || "", 180);
    if (!REVIEW_COLLECTION_SET.has(collection)) throw new Error("REVIEW_COLLECTION_INVALID");
    if (!/^[A-Za-z0-9_-]{6,180}$/.test(id)) throw new Error("REVIEW_ID_INVALID");

    const snap = await adminGetDocument(env, [collection, id], true);
    if (!snap.exists) throw new Error("REVIEW_NOT_FOUND");

    const trashId = `${Date.now()}-${crypto.randomUUID()}`;
    await adminSetDocument(env, ["reviewTrash", trashId], {
      originalCollection: collection,
      originalId: id,
      review: snap.data || {},
      deletedBy: admin.email,
      deletedAt: new Date()
    });
    await adminDeleteDocument(env, [collection, id]);
    return json(env, { ok: true, deleted: true, collection, id, trashId }, 200, origin);
  } catch (error) { return commerceError(env, error, origin); }
}


async function adminPurgeReviewsByUserRoute(request, env, origin) {
  try {
    const admin = await requireFirebaseAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    const username = clean(body.username || "", 160).trim().toLowerCase();
    if (!username || username.length < 3) throw new Error("REVIEW_USER_INVALID");
    let deleted = 0;
    const removed = [];
    for (const source of REVIEW_COLLECTIONS) {
      const rows = await adminRunQuery(env, {
        from: [{ collectionId: source.collection }],
        limit: 500
      }).catch(() => []);
      for (const row of rows) {
        const data = row.data || {};
        const name = clean(data.name || data.userName || data.displayName || "", 160).trim().toLowerCase();
        if (name !== username) continue;
        const trashId = `${Date.now()}-${crypto.randomUUID()}`;
        await adminSetDocument(env, ["reviewTrash", trashId], {
          originalCollection: source.collection,
          originalId: row.id,
          review: data,
          deletedBy: admin.email,
          deleteReason: `resolved-customer-issue:${username}`,
          deletedAt: new Date()
        });
        await adminDeleteDocument(env, [source.collection, row.id]);
        deleted++;
        removed.push({ collection: source.collection, id: row.id, product: source.product });
      }
    }
    return json(env, { ok: true, username, deleted, removed }, 200, origin);
  } catch (error) { return commerceError(env, error, origin); }
}

async function adminOrdersRoute(request, env, origin, url) {
  try {
    await requireFirebaseAdmin(request, env);
    const limit = Math.max(1, Math.min(300, Number(url.searchParams.get("limit") || 200)));
    const rows = await adminRunQuery(env, {
      from: [{ collectionId: "purchases" }],
      orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      limit
    }).catch(async () => adminRunQuery(env, { from: [{ collectionId: "purchases" }], limit }));
    const orders = [];
    for (const row of rows) {
      const p = row.data || {};
      const items = [];
      for (const raw of Array.isArray(p.items) ? p.items : []) {
        let resolved = null;
        try { resolved = await resolveProduct(env, raw, { allowInactive: true }); } catch (_) {}
        items.push({
          sku: resolved?.sku || slugify(raw?.sku || raw?.name || "producto"),
          name: resolved?.name || clean(raw?.name || "Producto", 180),
          priceUsd: moneyNumber(raw?.priceUsd ?? raw?.price ?? resolved?.priceUsd ?? 0),
          quantity: Math.max(1, Math.floor(Number(raw?.quantity || 1))),
          deliveryConfigured: Boolean(resolved?.assets?.length)
        });
      }
      orders.push({
        purchaseId: row.id,
        orderNumber: clean(p.orderNumber || p.paypalOrderId || row.id, 180),
        userEmail: validEmail(p.userEmail) || "",
        uid: clean(p.uid || "", 180),
        payerName: clean(p.payerName || p.userName || "Cliente", 180),
        payerCountry: clean(p.payerCountry || p.country || "", 120),
        payerCountryCode: clean(p.payerCountryCode || p.countryCode || "", 4).toUpperCase(),
        items,
        subtotalUsd: moneyNumber(p.subtotalUsd),
        discountUsd: moneyNumber(p.discountUsd),
        amountPaidUsd: moneyNumber(p.amountPaidUsd ?? p.amount ?? 0),
        currency: clean(p.currency || "USD", 10),
        paymentStatus: clean(p.paymentStatus || "paid", 60),
        paymentProvider: clean(p.paymentProvider || "", 80),
        fulfillmentStatus: clean(p.fulfillmentStatus || p.deliveryStatus || "ready", 60),
        paypalOrderId: clean(p.paypalOrderId || "", 180),
        transactionId: clean(p.transactionId || p.paypalCaptureId || "", 180),
        clientNotificationStatus: clean(p.clientNotificationStatus || "", 60),
        adminNote: clean(p.adminNote || "", 1200),
        createdByAdminEmail: clean(p.createdByAdminEmail || "", 320),
        orderTotalUsd: moneyNumber(p.orderTotalUsd ?? p.amountPaidUsd ?? p.amount ?? 0),
        createdAt: p.createdAt || null,
        updatedAt: p.updatedAt || null
      });
    }
    return json(env, { ok: true, orders }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

async function adminResendOrderEmailRoute(request, env, origin) {
  try {
    await requireFirebaseAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    const purchaseId = clean(body.purchaseId, 220);
    if (!purchaseId) throw new Error("ORDER_NOT_FOUND");
    const found = await adminGetDocument(env, ["purchases", purchaseId], true);
    if (!found.exists) throw new Error("ORDER_NOT_FOUND");
    const mail = await sendOrderEmailSafely(env, found.data || {});
    await adminPatchDocument(env, ["purchases", purchaseId], {
      clientNotificationStatus: mail.status,
      clientNotificationMessageId: mail.messageId,
      clientNotificationRetriedAt: new Date(),
      updatedAt: new Date()
    }).catch(() => {});
    if (mail.status !== "sent") throw new Error("ZOHO_SEND_FAILED");
    return json(env, { ok: true, status: mail.status, messageId: mail.messageId }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

async function findUserByEmail(env, email) {
  const target = validEmail(email);
  if (!target) return null;
  const rows = await adminRunQuery(env, {
    from: [{ collectionId: "users" }],
    where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: target } } },
    limit: 5
  });
  const row = rows[0];
  if (!row) return null;
  // Firestore document ID is the canonical Firebase Auth UID. Never trust a
  // legacy/stale `uid` field inside the profile document for ownership.
  const uid = clean(row.id, 180);
  if (!uid) return null;
  return { uid, email: target, displayName: clean(row.data?.displayName || "", 160) };
}

async function resolveAdminCustomer(env, body = {}) {
  // Prefer email lookup because it resolves to the canonical users/{uid} doc ID.
  const requestedEmail = validEmail(body.customerEmail);
  if (requestedEmail) {
    const byEmail = await findUserByEmail(env, requestedEmail);
    if (byEmail?.uid) return byEmail;
  }

  const requestedUid = clean(body.customerUid || "", 180);
  if (requestedUid) {
    const snap = await adminGetDocument(env, ["users", requestedUid], true);
    if (snap.exists) {
      const data = snap.data || {};
      return {
        uid: requestedUid,
        email: validEmail(data.email) || requestedEmail || "",
        displayName: clean(data.displayName || body.customerName || "", 160)
      };
    }
  }
  throw new Error("CUSTOMER_ACCOUNT_NOT_FOUND");
}

async function resolveLegacyPayPalReference(env, rawReference) {
  const reference = safePayPalDocId(rawReference);

  // First try it as an Orders v2 order ID.
  const orderLookup = await paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(reference)}`);
  if (orderLookup.response.ok && orderLookup.data?.id) {
    return { orderId: safePayPalDocId(orderLookup.data.id), order: orderLookup.data, inputType: "order" };
  }

  // Legacy customers often send the PayPal Transaction ID, which is the capture ID.
  // Resolve it back to its parent order and then fetch the canonical Orders v2 object.
  const captureLookup = await paypalFetch(env, `/v2/payments/captures/${encodeURIComponent(reference)}`);
  if (!captureLookup.response.ok || !captureLookup.data?.id) throw new Error("PAYPAL_REFERENCE_NOT_FOUND");
  if (String(captureLookup.data.status || "").toUpperCase() !== "COMPLETED") throw new Error("PAYPAL_CAPTURE_NOT_COMPLETED");

  const relatedOrderId = safePayPalDocId(
    captureLookup.data?.supplementary_data?.related_ids?.order_id || ""
  );
  const resolvedOrder = await paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(relatedOrderId)}`);
  if (!resolvedOrder.response.ok || !resolvedOrder.data?.id) throw new Error("PAYPAL_ORDER_NOT_FOUND");
  return { orderId: relatedOrderId, order: resolvedOrder.data, inputType: "capture" };
}

async function adminRecoverLegacyPayPalRoute(request, env, origin) {
  try {
    const admin = await requireFirebaseAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    const rawReference = body.paypalReference || body.paypalOrderId || body.transactionId || body.orderId;
    if (!clean(rawReference, 180)) throw new Error("PAYPAL_REFERENCE_REQUIRED");

    const customer = await resolveAdminCustomer(env, body);

    // Resolve products securely from the server catalog. We intentionally do NOT
    // require today's catalog total to equal a historical payment: prices/coupons
    // may have changed since the legacy purchase. The actual PayPal capture amount
    // is the source of truth for what the buyer paid.
    const quote = await buildQuote(env, body.items, body.couponCode || "");
    const resolved = await resolveLegacyPayPalReference(env, rawReference);
    const orderId = resolved.orderId;
    const order = resolved.order;
    if (String(order?.status || "").toUpperCase() !== "COMPLETED") throw new Error("PAYPAL_CAPTURE_NOT_COMPLETED");

    const capture = captureFromPayPalOrder(order);
    if (!capture?.id || String(capture.status || "").toUpperCase() !== "COMPLETED") {
      throw new Error("PAYPAL_CAPTURE_NOT_COMPLETED");
    }
    const currency = clean(capture?.amount?.currency_code || "", 10).toUpperCase();
    if (currency !== "USD") throw new Error("PAYPAL_CURRENCY_MISMATCH");
    const actualPaidUsd = moneyNumber(Number(capture?.amount?.value || 0));
    if (!(actualPaidUsd > 0)) throw new Error("PAYPAL_AMOUNT_INVALID");

    const transactionId = clean(capture.id, 180);
    const purchaseId = `pp_${safePayPalDocId(transactionId)}`;

    // Idempotency / anti-reuse protection.
    const ledger = await adminGetDocument(env, ["paypalTransactions", transactionId], true);
    if (ledger.exists) {
      const samePurchase = clean(ledger.data?.purchaseId, 220) === purchaseId;
      const sameOwner = !ledger.data?.ownerUid || clean(ledger.data?.ownerUid, 180) === customer.uid;
      if (!samePurchase || !sameOwner) throw new Error("PAYPAL_TRANSACTION_ALREADY_USED");
      const existing = await adminGetDocument(env, ["purchases", purchaseId], true);
      if (existing.exists) {
        return json(env, {
          ok: true,
          alreadyRecovered: true,
          purchaseId,
          orderNumber: existing.data?.orderNumber || orderNumber(transactionId),
          transactionId,
          paypalOrderId: orderId,
          amountPaidUsd: Number(existing.data?.amountPaidUsd || actualPaidUsd)
        }, 200, origin);
      }
    }

    const payer = order?.payer || order?.payment_source?.paypal || {};
    const shippingAddress = order?.purchase_units?.[0]?.shipping?.address || {};
    const billingAddress = order?.payment_source?.card?.billing_address || {};
    const payerCountryCode = clean(
      billingAddress?.country_code || payer?.address?.country_code || shippingAddress?.country_code || "", 4
    ).toUpperCase();
    const payerCountry = countryNameFromCode(payerCountryCode);
    const payerRegion = clean(
      billingAddress?.admin_area_1 || billingAddress?.admin_area_2 ||
      shippingAddress?.admin_area_1 || shippingAddress?.admin_area_2 || "", 120
    );
    const payerName = clean(
      `${clean(payer?.name?.given_name, 80)} ${clean(payer?.name?.surname, 80)}`.trim() ||
      customer.displayName || "Cliente", 160
    );
    const payerEmail = customer.email || validEmail(payer?.email_address) || "";
    const now = new Date();
    const catalogTotalUsd = moneyNumber(quote.totalUsd);
    const amountDifferenceUsd = moneyNumber(actualPaidUsd - catalogTotalUsd);

    const purchase = {
      uid: customer.uid,
      userEmail: payerEmail,
      payerName,
      payerCountry,
      payerCountryCode,
      payerRegion,
      items: quote.items,
      paypalOrderId: orderId,
      paypalCaptureId: transactionId,
      transactionId,
      orderNumber: orderNumber(transactionId),
      subtotalUsd: moneyNumber(quote.subtotalUsd),
      discountUsd: moneyNumber(quote.discountUsd),
      catalogTotalAtRecoveryUsd: catalogTotalUsd,
      amountPaidUsd: actualPaidUsd,
      amountDifferenceAtRecoveryUsd: amountDifferenceUsd,
      historicalPriceMatched: Math.abs(amountDifferenceUsd) <= 0.009,
      currency: "USD",
      couponCode: clean(body.couponCode, 100),
      paymentStatus: "paid",
      paymentProvider: "paypal-legacy-recovery",
      paymentVerifiedByServer: true,
      fulfillmentStatus: "ready",
      deliveryStatus: "ready",
      recoveredLegacyOrder: true,
      recoveryReferenceType: resolved.inputType,
      recoveredByAdminEmail: admin.email || "",
      recoveredAt: now,
      createdAt: now,
      updatedAt: now
    };

    await adminSetDocument(env, ["purchases", purchaseId], purchase);
    await adminSetDocument(env, ["paypalTransactions", transactionId], {
      transactionId,
      orderId,
      purchaseId,
      ownerUid: customer.uid,
      amount: moneyText(actualPaidUsd),
      currency: "USD",
      status: "COMPLETED",
      recoveredLegacyOrder: true,
      recoveryReferenceType: resolved.inputType,
      processedAt: now
    });

    await adminPatchDocument(env, ["users", customer.uid], {
      uid: customer.uid,
      email: payerEmail,
      displayName: customer.displayName || payerName || "",
      payerCountry: payerCountry || undefined,
      payerCountryCode: payerCountryCode || undefined,
      payerRegion: payerRegion || undefined,
      lastPurchaseAt: now,
      lastPurchaseId: purchaseId,
      lastTransactionId: transactionId,
      lastPayPalOrderId: orderId,
      updatedAt: now
    }).catch(() => {});

    const mail = await sendOrderEmailSafely(env, purchase);
    await adminPatchDocument(env, ["purchases", purchaseId], {
      clientNotificationStatus: mail.status,
      clientNotificationMessageId: mail.messageId,
      updatedAt: new Date()
    }).catch(() => {});

    return json(env, {
      ok: true,
      purchaseId,
      orderNumber: purchase.orderNumber,
      transactionId,
      paypalOrderId: orderId,
      referenceType: resolved.inputType,
      amountPaidUsd: actualPaidUsd,
      catalogTotalUsd,
      historicalPriceMatched: purchase.historicalPriceMatched,
      payerCountry,
      payerCountryCode,
      payerRegion,
      mailStatus: mail.status
    }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

function publicError(error) {
  const code = String(error?.message || "");
  const productName = clean(error?.productName || "", 180);
  const messages = {
    AUTH_MISSING: "Debes iniciar sesión antes de pagar.",
    AUTH_INVALID: "Tu sesión no es válida. Inicia sesión nuevamente.",
    ADMIN_ONLY: "Solo Administración puede realizar esta acción.",
    ACCOUNT_REVIEW: "Tu cuenta se encuentra temporalmente en revisión.",
    ADMIN_BLOCK_FORBIDDEN: "No puedes bloquear una cuenta administrativa.",
    CART_INVALID: "El carrito está vacío o no es válido.",
    PRODUCT_INVALID: "El producto no es válido.",
    PRODUCT_NOT_FOUND: "Uno de los productos ya no existe en el catálogo seguro.",
    PRODUCT_DISABLED: "Uno de los productos no está disponible en este momento.",
    PRODUCT_DELIVERY_NOT_CONFIGURED: productName ? `No se cobrará nada: todavía falta configurar el archivo de entrega de ${productName}.` : "No se cobrará nada: falta configurar un archivo de entrega.",
    PRODUCT_ALREADY_OWNED: productName ? `Ya tienes ${productName} en tu cuenta.` : "Ya tienes uno de estos productos.",
    DISCOUNT_CONFIG_INVALID: "La configuración de descuentos del servidor no es válida.",
    USE_FREE_CHECKOUT: "Esta orden no requiere PayPal.",
    FREE_CHECKOUT_NOT_ALLOWED: "Este pedido todavía tiene un saldo pendiente.",
    PAYPAL_CONFIG_INCOMPLETE: "PayPal todavía no está configurado en el Worker.",
    PAYPAL_CREATE_FAILED: "PayPal no pudo crear la orden.",
    PAYPAL_ORDER_INVALID: "La referencia de PayPal no es válida.",
    PAYPAL_REFERENCE_REQUIRED: "Escribe el PayPal Order ID o el Transaction ID.",
    PAYPAL_REFERENCE_NOT_FOUND: "No encontramos esa referencia en PayPal. Pega el Order ID o el Transaction ID exacto.",
    PAYPAL_ORDER_NOT_FOUND: "No encontramos esta orden de PayPal.",
    PAYPAL_ORDER_OWNER_MISMATCH: "Esta orden pertenece a otra cuenta.",
    PAYPAL_ORDER_CONTEXT_MISMATCH: "La orden no coincide con la compra iniciada.",
    PAYPAL_AMOUNT_INVALID: "El monto de la orden no es válido.",
    PAYPAL_AMOUNT_MISMATCH: "PayPal devolvió un monto diferente al autorizado.",
    PAYPAL_CURRENCY_MISMATCH: "PayPal devolvió una moneda diferente a la autorizada.",
    PAYPAL_CAPTURE_NOT_COMPLETED: "PayPal todavía no confirmó el pago.",
    PAYPAL_TRANSACTION_ALREADY_USED: "Esta transacción de PayPal ya fue utilizada.",
    FIREBASE_SERVICE_ACCOUNT_INCOMPLETE: "Falta configurar la cuenta de servicio de Firebase en el Worker.",
    FIREBASE_SERVICE_ACCOUNT_JSON_INVALID: "La cuenta de servicio de Firebase no tiene un JSON válido.",
    FIREBASE_SERVICE_ACCOUNT_PROJECT_MISMATCH: "La cuenta de servicio pertenece a otro proyecto Firebase.",
    DOWNLOAD_SIGNING_SECRET_INCOMPLETE: "Falta configurar la firma segura de descargas.",
    CUSTOMER_ACCOUNT_NOT_FOUND: "No encontramos una cuenta Dingloft para ese cliente. Pídele iniciar sesión o registrarse primero.",
    REVIEW_COLLECTION_INVALID: "La colección de reseñas no es válida.",
    REVIEW_ID_INVALID: "La reseña seleccionada no es válida.",
    REVIEW_NOT_FOUND: "La reseña ya no existe o ya fue eliminada.",
    ORDER_NOT_FOUND: "No encontramos ese pedido.",
    ORDER_STATUS_INVALID: "El estado seleccionado no es válido.",
    ORDER_PAYMENT_LOCKED: "El estado de pago de una transacción verificada por PayPal no puede alterarse manualmente.",
    ZOHO_SEND_FAILED: "No se pudo enviar el correo desde Zoho Mail."
  };
  return messages[code] || "No se pudo completar la operación.";
}

function commerceError(env, error, origin) {
  const code = String(error?.message || "UNKNOWN");
  console.error("Dingloft commerce", code, error?.productName || "");
  let status = 400;
  if (["AUTH_MISSING", "AUTH_INVALID"].includes(code)) status = 401;
  if (code === "ADMIN_ONLY") status = 403;
  if (code === "ACCOUNT_REVIEW") status = 423;
  if (code === "ADMIN_BLOCK_FORBIDDEN") status = 403;
  if (code === "PRODUCT_ALREADY_OWNED") status = 409;
  if (code === "REVIEW_NOT_FOUND") status = 404;
  if (["FIREBASE_SERVICE_ACCOUNT_INCOMPLETE", "FIREBASE_SERVICE_ACCOUNT_JSON_INVALID", "FIREBASE_SERVICE_ACCOUNT_PROJECT_MISMATCH", "PAYPAL_CONFIG_INCOMPLETE", "DOWNLOAD_SIGNING_SECRET_INCOMPLETE"].includes(code)) status = 503;
  return json(env, { ok: false, code, error: publicError(error), productName: clean(error?.productName || "", 180) }, status, origin);
}


// ============================================================================
// LIVE PRESENCE + GHOST ANALYTICS · v45
// Approximate IP geolocation from Cloudflare request.cf. Raw IP is NEVER stored.
// Anonymous visitors receive random browser/session IDs from the frontend.
// Active time is approximate and only counts recent visible heartbeat intervals.
// ============================================================================
function presenceGeo(request) {
  const cf = request?.cf || {};
  const countryCode = clean(cf.country || request.headers.get("cf-ipcountry") || "", 4).toUpperCase();
  const country = countryNameFromCode(countryCode);
  const lat = Number(cf.latitude);
  const lng = Number(cf.longitude);
  return {
    countryCode,
    country,
    city: clean(cf.city || "", 120),
    region: clean(cf.region || "", 120),
    regionCode: clean(cf.regionCode || "", 20),
    timezone: clean(cf.timezone || "", 80),
    latitude: Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null,
    longitude: Number.isFinite(lng) && lng >= -180 && lng <= 180 ? lng : null
  };
}

async function presenceIpHash(request, env) {
  const ip = clean(request.headers.get("cf-connecting-ip") || "", 120);
  if (!ip) return "";
  const salt = String(env.DOWNLOAD_SIGNING_SECRET || env.PRESENCE_HASH_SECRET || "dingloft-presence");
  const bytes = new TextEncoder().encode(`${salt}|${ip}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

function presenceVisitorId(value) {
  const id = clean(value, 100).replace(/[^A-Za-z0-9_-]/g, "");
  if (id.length < 12) throw new Error("PRESENCE_VISITOR_INVALID");
  return id;
}
function presenceSessionId(value) {
  const id = clean(value, 100).replace(/[^A-Za-z0-9_-]/g, "");
  if (id.length < 12) throw new Error("PRESENCE_SESSION_INVALID");
  return id;
}
function presenceDateMs(value) {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}
function presenceJourney(source) {
  return (Array.isArray(source) ? source : []).slice(-40).map(item => ({
    path: clean(item?.path || "", 500),
    title: clean(item?.title || "Dingloft", 180),
    enteredAt: item?.enteredAt || item?.firstSeenAt || null,
    lastSeenAt: item?.lastSeenAt || null,
    activeMs: Math.max(0, Math.min(24 * 60 * 60 * 1000, Number(item?.activeMs || 0))),
    visits: Math.max(1, Math.min(999, Number(item?.visits || 1)))
  })).filter(item => item.path);
}
function presenceGeoUseful(geo = {}) {
  return Boolean(geo.countryCode || geo.country || geo.city || Number.isFinite(Number(geo.latitude)));
}

async function presenceHeartbeatRoute(request, env, origin) {
  try {
    const body = await request.json().catch(() => ({}));
    const visitorId = presenceVisitorId(body.visitorId || "");
    const sessionId = presenceSessionId(body.sessionId || body.visitorId || "");
    let user = null;
    if (bearerToken(request)) user = await lookupFirebaseUser(request, env).catch(() => null);

    const now = new Date();
    const nowMs = now.getTime();
    const path = clean(body.path || "", 500);
    const title = clean(body.title || "Dingloft", 180);
    const reason = clean(body.reason || "heartbeat", 40);
    const docId = `session_${sessionId}`.slice(0, 180);
    const existingSnap = await adminGetDocument(env, ["presence", docId], true).catch(() => ({ exists:false, data:{} }));
    const prev = existingSnap.exists ? (existingSnap.data || {}) : {};
    const prevLastMs = presenceDateMs(prev.lastSeenAt || prev.updatedAt);
    const elapsed = prevLastMs && nowMs >= prevLastMs ? nowMs - prevLastMs : 0;
    // Count only short heartbeat gaps; long gaps mean the tab/browser was not actively reporting.
    const deltaMs = elapsed > 0 && elapsed <= 90_000 ? Math.min(elapsed, 45_000) : 0;

    const geoNow = presenceGeo(request);
    const geo = presenceGeoUseful(geoNow) ? geoNow : (prev.geo && typeof prev.geo === "object" ? prev.geo : geoNow);
    const isAdminNow = Boolean(user?.email && ADMIN_EMAILS.has(user.email));
    const authenticated = Boolean(user?.uid) || prev.authenticated === true;
    const isAdmin = isAdminNow || prev.isAdmin === true;
    const uid = user?.uid || clean(prev.uid || "", 180);
    const email = user?.email || validEmail(prev.email) || "";
    const displayName = user?.displayName || clean(prev.displayName || "", 160);

    const journey = presenceJourney(prev.journey);
    if (journey.length && deltaMs) {
      const last = journey[journey.length - 1];
      last.activeMs = Math.max(0, Number(last.activeMs || 0)) + deltaMs;
      last.lastSeenAt = now;
    }
    if (path) {
      const last = journey[journey.length - 1];
      if (!last || last.path !== path) {
        journey.push({ path, title, enteredAt: now, lastSeenAt: now, activeMs: 0, visits: 1 });
      } else {
        last.title = title || last.title;
        last.lastSeenAt = now;
      }
    }
    while (journey.length > 40) journey.shift();

    const startedAt = prev.startedAt || prev.createdAt || now;
    const totalActiveMs = Math.max(0, Number(prev.totalActiveMs || 0)) + deltaMs;
    const uniquePages = [...new Set(journey.map(item => item.path).filter(Boolean))].length;
    const presence = {
      visitorId,
      sessionId,
      uid,
      email,
      displayName,
      authenticated,
      wasAnonymous: prev.wasAnonymous === true || !user?.uid,
      isAdmin,
      path,
      title,
      referrer: clean(prev.referrer || body.referrer || "", 500),
      lastReferrer: clean(body.referrer || prev.lastReferrer || "", 500),
      device: clean(body.device || prev.device || "Web", 50),
      browser: clean(body.browser || prev.browser || "", 80),
      os: clean(body.os || prev.os || "", 50),
      standalone: body.standalone === true || prev.standalone === true,
      language: clean(body.language || prev.language || "", 30),
      reason,
      visible: body.visible !== false,
      geo,
      ipHash: await presenceIpHash(request, env) || clean(prev.ipHash || "", 80),
      startedAt,
      lastSeenAt: now,
      totalActiveMs,
      pageViews: journey.length,
      uniquePages,
      journey,
      createdAt: prev.createdAt || now,
      updatedAt: now
    };
    await adminSetDocument(env, ["presence", docId], presence);

    // Once an anonymous session becomes authenticated, keep the same session history
    // and progressively enrich the real user account with last known approximate geo.
    if (user?.uid) {
      await adminPatchDocument(env, ["users", user.uid], {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        lastGeo: geo,
        lastSeenAt: now,
        lastPresencePath: path,
        lastPresenceDevice: presence.device,
        lastPresenceBrowser: presence.browser,
        lastPresenceOS: presence.os,
        lastPresenceSessionId: sessionId,
        updatedAt: now
      }).catch(() => {});
    }
    return json(env, {
      ok: true,
      tracked: true,
      sessionId,
      authenticated,
      ghost: !authenticated,
      totalActiveMs,
      pageViews: journey.length
    }, 200, origin);
  } catch (error) {
    const code = String(error?.message || "");
    const bad = code === "PRESENCE_VISITOR_INVALID" || code === "PRESENCE_SESSION_INVALID";
    return json(env, { ok: false, code, error: "Presence unavailable" }, bad ? 400 : 500, origin);
  }
}

async function adminPresenceRoute(request, env, origin) {
  try {
    await requireFirebaseAdmin(request, env);
    const rows = await adminRunQuery(env, { from: [{ collectionId: "presence" }], limit: 700 }).catch(() => []);
    const now = Date.now();
    const sessions = rows.map(row => {
      const p = row.data || {};
      const last = presenceDateMs(p.lastSeenAt || p.updatedAt);
      const started = presenceDateMs(p.startedAt || p.createdAt);
      const journey = presenceJourney(p.journey);
      const authenticated = p.authenticated === true || Boolean(clean(p.uid || "", 180));
      return {
        id: row.id,
        visitorId: clean(p.visitorId || "", 100),
        sessionId: clean(p.sessionId || row.id.replace(/^session_/, ""), 100),
        uid: clean(p.uid || "", 180),
        email: validEmail(p.email) || "",
        displayName: clean(p.displayName || "", 160),
        authenticated,
        ghost: !authenticated,
        wasAnonymous: p.wasAnonymous === true,
        isAdmin: p.isAdmin === true,
        path: clean(p.path || journey[journey.length-1]?.path || "", 500),
        title: clean(p.title || journey[journey.length-1]?.title || "", 180),
        device: clean(p.device || "", 50),
        browser: clean(p.browser || "", 80),
        os: clean(p.os || "", 50),
        standalone: p.standalone === true,
        language: clean(p.language || "", 30),
        geo: p.geo && typeof p.geo === "object" ? p.geo : {},
        startedAt: p.startedAt || p.createdAt || null,
        lastSeenAt: p.lastSeenAt || p.updatedAt || null,
        durationMs: Math.max(0, Number(p.totalActiveMs || 0)),
        pageViews: Math.max(journey.length, Number(p.pageViews || 0)),
        uniquePages: Math.max(0, Number(p.uniquePages || 0)),
        journey,
        online: last > 0 && now - last <= 75_000,
        ageMs: last ? now - last : null,
        sessionAgeMs: started ? now - started : null
      };
    }).filter(p => {
      const last = presenceDateMs(p.lastSeenAt);
      return last && now - last <= 7 * 24 * 60 * 60 * 1000;
    }).sort((a,b) => presenceDateMs(b.lastSeenAt) - presenceDateMs(a.lastSeenAt)).slice(0, 300);

    const publicSessions = sessions.filter(x => !x.isAdmin);
    return json(env, {
      ok: true,
      sessions: publicSessions,
      onlineCount: publicSessions.filter(x => x.online).length,
      authenticatedOnlineCount: publicSessions.filter(x => x.online && x.authenticated).length,
      ghostOnlineCount: publicSessions.filter(x => x.online && x.ghost).length,
      ghostSessionCount: publicSessions.filter(x => x.ghost).length
    }, 200, origin);
  } catch (error) {
    return commerceError(env, error, origin);
  }
}

async function healthRoute(env, origin) {
  const builtinMissingDelivery = ALL_BUILTINS.filter(p => !p.assets?.length).map(p => p.name);
  let runtimeMissingDelivery = [...builtinMissingDelivery];
  const firebaseAdminConfigured = Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON || (env.FIREBASE_SERVICE_ACCOUNT_EMAIL && env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY));
  if (firebaseAdminConfigured) {
    try {
      const rows = await adminRunQuery(env, { from: [{ collectionId: "digitalProducts" }], limit: 300 });
      const overrides = new Map();
      for (const row of rows) {
        const normalized = normalizeProductConfig(row.data, row.id);
        if (normalized) overrides.set(normalized.sku, normalized);
      }
      runtimeMissingDelivery = (await mergedProductCatalog(env, { includeInactive: true }))
        .filter(p => p.active !== false && !p.assets?.length)
        .map(p => p.name);
    } catch (error) {
      console.error("health catalog", error?.message || error);
    }
  }
  return json(env, {
    ok: true,
    service: "Dingloft Commerce Worker",
    version: "3.4.2",
    firebaseProjectId: firebaseProjectId(env),
    firebaseAdminConfigured,
    paypalConfigured: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
    paypalWebhookConfigured: Boolean(env.PAYPAL_WEBHOOK_ID),
    downloadSigningConfigured: String(env.DOWNLOAD_SIGNING_SECRET || "").length >= 32,
    mailConfigured: Boolean(env.ZOHO_CLIENT_ID && env.ZOHO_CLIENT_SECRET && env.ZOHO_REFRESH_TOKEN && env.ZOHO_FROM_ADDRESS),
    secureCheckout: true,
    webhookRecovery: true,
    signedDownloads: true,
    paymentBlockedWhenDeliveryMissing: true,
    builtinProducts: ALL_BUILTINS.length,
    builtinProductsMissingDelivery: builtinMissingDelivery,
    runtimeProductsMissingDelivery: runtimeMissingDelivery
  }, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";

    if (request.method === "OPTIONS") {
      if (origin && !allowedOrigins(env).has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) });
    }

    if (url.pathname === "/health" && request.method === "GET") return healthRoute(env, origin);
    if (url.pathname === "/paypal/config" && request.method === "GET") {
      try {
        const cfg = paypalConfig(env);
        return json(env, { ok: true, clientId: cfg.clientId, currency: "USD" }, 200, origin);
      } catch (error) { return commerceError(env, error, origin); }
    }
    if (url.pathname === "/auth/login-welcome" && request.method === "POST") return loginWelcomeRoute(request, env, origin);
    if (url.pathname === "/me/account-status" && request.method === "GET") return accountStatusRoute(request, env, origin);
    if (url.pathname === "/presence/heartbeat" && request.method === "POST") return presenceHeartbeatRoute(request, env, origin);
    if (url.pathname === "/products/public" && request.method === "GET") return publicCatalogRoute(request, env, origin);
    if (url.pathname === "/multitracks/catalog" && request.method === "GET") return publicMultitrackCatalogRoute(request, env, origin);
    if (url.pathname.startsWith("/media/multitracks/") && (request.method === "GET" || request.method === "HEAD")) return publicMultitrackMediaRoute(request, env, origin, url);
    if (url.pathname === "/products/product" && request.method === "GET") return publicProductRoute(request, env, origin, url);
    if (url.pathname === "/checkout/quote" && request.method === "POST") return checkoutQuoteRoute(request, env, origin);
    if (url.pathname === "/checkout/paypal/create" && request.method === "POST") return createPayPalOrderRoute(request, env, origin);
    if (url.pathname === "/checkout/paypal/capture" && request.method === "POST") return capturePayPalOrderRoute(request, env, origin);
    if (url.pathname === "/checkout/free" && request.method === "POST") return freeCheckoutRoute(request, env, origin);
    if (url.pathname === "/me/library" && request.method === "GET") return libraryRoute(request, env, origin);
    if (url.pathname === "/download" && request.method === "GET") return downloadRoute(request, env);
    if (url.pathname === "/webhooks/paypal" && request.method === "POST") return paypalWebhookRoute(request, env);
    if (url.pathname === "/admin/reviews" && request.method === "GET") return adminReviewsRoute(request, env, origin, url);
    if (url.pathname === "/admin/reviews/delete" && request.method === "POST") return adminDeleteReviewRoute(request, env, origin);
    if (url.pathname === "/admin/reviews/purge-user" && request.method === "POST") return adminPurgeReviewsByUserRoute(request, env, origin);
    if (url.pathname === "/admin/orders" && request.method === "GET") return adminOrdersRoute(request, env, origin, url);
    if (url.pathname === "/admin/orders/manual-create" && request.method === "POST") return adminManualOrderRoute(request, env, origin);
    if (url.pathname === "/admin/orders/update" && request.method === "POST") return adminOrderUpdateRoute(request, env, origin);
    if (url.pathname === "/admin/orders/resend-email" && request.method === "POST") return adminResendOrderEmailRoute(request, env, origin);
    if (url.pathname === "/admin/customers" && request.method === "GET") return adminCustomersRoute(request, env, origin);
    if (url.pathname === "/admin/presence" && request.method === "GET") return adminPresenceRoute(request, env, origin);
    if (url.pathname === "/admin/customers/update" && request.method === "POST") return adminCustomerUpdateRoute(request, env, origin);
    if (url.pathname === "/admin/customers/block" && request.method === "POST") return adminCustomerBlockRoute(request, env, origin);
    if (url.pathname === "/admin/multitracks/catalog" && request.method === "GET") return adminMultitrackCatalogRoute(request, env, origin);
    if (url.pathname === "/admin/multitracks/upsert" && request.method === "POST") return adminUpsertMultitrackRoute(request, env, origin);
    if (url.pathname === "/admin/multitracks/upload" && request.method === "POST") return adminMultitrackUploadRoute(request, env, origin, url);
    if (url.pathname === "/admin/products/catalog" && request.method === "GET") return adminCatalogRoute(request, env, origin);
    if (url.pathname === "/admin/products/upsert" && request.method === "POST") return adminUpsertProductRoute(request, env, origin);
    if (url.pathname === "/admin/recover-legacy-paypal" && request.method === "POST") return adminRecoverLegacyPayPalRoute(request, env, origin);

    return json(env, { ok: false, error: "Not found" }, 404, origin);
  }
};
