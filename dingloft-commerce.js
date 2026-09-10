/* Dingloft Commerce Bridge · v2.3.0 · Cart → Dedicated Checkout
   Product pages only manage the cart. Payment, extras and fulfillment live in checkout.html + Cloudflare Worker.
   This file intentionally never writes a paid purchase from the browser. */

import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAKxQdUM49cVbBaXWJ5DF3s7EaNKlJRGhA",
  authDomain: "login-dingloft.firebaseapp.com",
  projectId: "login-dingloft",
  storageBucket: "login-dingloft.firebasestorage.app",
  messagingSenderId: "549466738202",
  appId: "1:549466738202:web:8bf305fe2c753e9d76cba3",
  measurementId: "G-R9SGZCDN13"
};

const WORKER_BASE = String(
  window.DINGLOFT_WORKER_BASE ||
  document.querySelector('meta[name="dingloft-worker-base"]')?.content ||
  "https://autumn-breeze-dfa0.evolutiongt01.workers.dev"
).replace(/\/$/, "");

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
let activeCouponCode = "";
let lastQuote = null;
let paypalRenderGeneration = 0;
const CHECKOUT_COUPON_KEY = "dingloft_checkout_coupon";
const CHECKOUT_SOURCE_KEY = "dingloft_checkout_source";

window.__DINGLOFT_COMMERCE_V1__ = true;
window.__DINGLOFT_COMMERCE_V2__ = true;

function currentItems() {
  const source = Array.isArray(window.cartItemsList) ? window.cartItemsList : [];
  const seen = new Set();
  const out = [];
  for (const raw of source.slice(0, 50)) {
    if (raw?.uiOnly === true || raw?.bonusUiOnly === true) continue;
    const item = {
      sku: String(raw?.sku || raw?.productSku || raw?.workerSku || raw?.id || "").trim(),
      name: String(raw?.name || "").trim(),
      type: String(raw?.type || "").trim(),
      img: String(raw?.img || "").trim()
    };
    if (!item.name) continue;
    // Todos los productos de Dingloft son digitales: una unidad por SKU.
    const key = (item.sku || item.name).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function normalizeDigitalCartStorage() {
  try {
    const raw = JSON.parse(localStorage.getItem("dingloft_cart") || "[]");
    if (!Array.isArray(raw)) return;
    const seen = new Set();
    const clean = [];
    for (const item of raw) {
      const key = String(item?.sku || item?.id || item?.name || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      clean.push({ ...item, qty:1 });
    }
    localStorage.setItem("dingloft_cart", JSON.stringify(clean));
  } catch (_) {}
}

normalizeDigitalCartStorage();

// La tienda vende productos digitales, por eso no existe selector de cantidad.
const oneCopyStyle = document.createElement("style");
oneCopyStyle.textContent = `.qty-controls .qty-btn{display:none!important}.qty-controls .qty-value{min-width:22px;text-align:center}`;
document.head.appendChild(oneCopyStyle);

function currentContentUrl() {
  try {
    const frame = window.DingloftPersistentShellV93?.activeFrame;
    const href = frame?.contentWindow?.location?.href;
    if (href) {
      const u = new URL(href, location.origin);
      if (u.origin === location.origin) {
        u.searchParams.delete("embed");
        const file = u.pathname.split("/").filter(Boolean).pop() || "account.html";
        return `${file}${u.search}${u.hash}`;
      }
    }
  } catch (_) {}
  return `${location.pathname.split('/').pop() || 'account.html'}${location.search || ''}${location.hash || ''}`;
}

function loginUrl() {
  return `login.html?next=${encodeURIComponent(currentContentUrl())}`;
}

function navigateInternal(href) {
  try {
    if (window.DingloftPersistentShellV93?.navigateHref) {
      window.DingloftPersistentShellV93.navigateHref(href);
      return;
    }
  } catch (_) {}
  location.href = href;
}

async function requireUser() {
  const user = auth.currentUser;
  if (!user) {
    navigateInternal(loginUrl());
    throw new Error("AUTH_REDIRECT");
  }
  return user;
}

async function tokenFor(user) {
  return user.getIdToken(false);
}

async function api(path, { method = "GET", body, authRequired = false } = {}) {
  const headers = { Accept: "application/json" };
  let user = null;
  if (authRequired) {
    user = await requireUser();
    headers.Authorization = `Bearer ${await tokenFor(user)}`;
  }
  if (body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${WORKER_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    const error = new Error(data?.error || `No se pudo completar la operación (${response.status}).`);
    error.code = data?.code || "COMMERCE_ERROR";
    error.payload = data;
    throw error;
  }
  return data;
}

function paypalWrapper() {
  return document.getElementById("paypal-container-wrapper") || document.getElementById("paypal-button-container")?.parentElement;
}

function freeButton() {
  return document.getElementById("free-checkout-btn");
}

function securityBadge() {
  return document.getElementById("security-badge-box");
}

function couponMessage() {
  return document.getElementById("coupon-msg");
}

function showMessage(message, kind = "info") {
  const el = couponMessage();
  if (el) {
    el.style.display = "block";
    el.style.color = kind === "error" ? "#ff6b6b" : kind === "success" ? "#00ff88" : "#73d7ff";
    const icon = kind === "error" ? "x-circle-fill" : kind === "success" ? "check-circle-fill" : "info-circle-fill";
    el.innerHTML = `<i class="bi bi-${icon}"></i> ${escapeHtml(message)}`;
  } else if (kind === "error") {
    alert(message);
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function setCheckoutMode(total) {
  // Desde v2.3.0 el carrito no cobra. Siempre entrega el pedido al checkout dedicado,
  // incluso si el producto es gratuito porque allí el cliente todavía puede añadir
  // asistencia remota o un aporte solidario.
  const wrapper = paypalWrapper();
  const free = freeButton();
  const badge = securityBadge();
  if (wrapper) wrapper.style.display = "block";
  if (badge) badge.style.display = "block";
  if (free) free.style.display = "none";
}

function checkoutHref() {
  return "checkout.html?from=cart";
}

async function syncCartBeforeCheckout() {
  const items = currentItems().map(item => ({
    sku:item.sku,
    name:item.name,
    quantity:1,
    priceUsd:0
  }));
  if (!items.length) throw new Error("El carrito está vacío.");
  return api("/push/customer/cart", {
    method:"POST",
    authRequired:true,
    body:{items, path:currentContentUrl()}
  });
}

async function continueToDedicatedCheckout() {
  if (!currentItems().length) {
    showMessage("El carrito está vacío.", "error");
    return;
  }
  try {
    sessionStorage.setItem(CHECKOUT_COUPON_KEY, activeCouponCode || "");
    sessionStorage.setItem(CHECKOUT_SOURCE_KEY, "cart");
  } catch (_) {}

  if (typeof auth.authStateReady === "function") {
    try { await auth.authStateReady(); } catch (_) {}
  }
  if (!auth.currentUser) {
    navigateInternal(`login.html?next=${encodeURIComponent(checkoutHref())}`);
    return;
  }

  try { await syncCartBeforeCheckout(); } catch (error) {
    // No bloqueamos el salto: checkout.html conserva el carrito local y vuelve a
    // validarlo contra el catálogo seguro antes de crear cualquier cobro.
    console.warn("Dingloft cart sync before checkout", error);
  }
  navigateInternal(checkoutHref());
}

function paintQuote(quote) {
  lastQuote = quote;
  const subtotal = document.getElementById("cart-subtotal");
  const total = document.getElementById("cart-total");
  if (subtotal && Number.isFinite(Number(quote?.subtotalUsd))) subtotal.textContent = `$${Number(quote.subtotalUsd).toFixed(2)}`;
  if (total && Number.isFinite(Number(quote?.totalUsd))) total.textContent = `$${Number(quote.totalUsd).toFixed(2)}`;
  window.cartFinalTotal = Number(quote?.totalUsd || 0);
  setCheckoutMode(quote?.totalUsd);
}

async function secureQuote() {
  const items = currentItems();
  if (!items.length) throw new Error("El carrito está vacío.");
  const quote = await api("/checkout/quote", {
    method: "POST",
    body: { items, couponCode: activeCouponCode }
  });
  paintQuote(quote);
  return quote;
}

function successAndGo(orderNumber = "") {
  if (typeof window.clearCart === "function") window.clearCart();
  try { localStorage.removeItem("dingloft_cart"); } catch (_) {}
  try { window.dispatchEvent(new CustomEvent('dingloft:cart-sync',{detail:{cart:[],source:'checkout-success'}})); } catch (_) {}
  const suffix = orderNumber ? ` (${orderNumber})` : "";
  showMessage(`Compra confirmada${suffix}. Tus archivos ya están en Mi cuenta.`, "success");
  navigateInternal(`account.html?purchase=success${orderNumber ? `&order=${encodeURIComponent(orderNumber)}` : ""}`);
}

async function createOrderOnServer() {
  const items = currentItems();
  const result = await api("/checkout/paypal/create", {
    method: "POST",
    authRequired: true,
    body: { items, couponCode: activeCouponCode }
  });
  return result.orderId;
}

async function captureOrderOnServer(orderId) {
  return api("/checkout/paypal/capture", {
    method: "POST",
    authRequired: true,
    body: { orderId }
  });
}

/* Dedicated checkout handoff. Legacy cart PayPal is intentionally replaced by one CTA. */
window.renderPayPalStable = async function renderCheckoutHandoff() {
  const generation = ++paypalRenderGeneration;
  const container = document.getElementById("paypal-button-container");
  if (!container) return;
  container.innerHTML = "";
  if (!currentItems().length) return;

  try {
    const quote = await secureQuote();
    if (generation !== paypalRenderGeneration) return;
    setCheckoutMode(quote?.totalUsd);

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-dingloft-checkout-handoff", "1");
    button.style.cssText = [
      "width:100%","min-height:50px","border:0","border-radius:14px",
      "background:#f4f7fb","color:#071018","font:800 .86rem/1 Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
      "display:flex","align-items:center","justify-content:center","gap:9px","cursor:pointer",
      "box-shadow:0 12px 30px rgba(0,0,0,.22)"
    ].join(";");
    button.innerHTML = `<i class="bi bi-arrow-right-circle"></i><span>Continuar al checkout · $${Number(quote?.totalUsd || 0).toFixed(2)}</span>`;
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      button.disabled = true;
      const label = button.querySelector("span");
      if (label) label.textContent = "Abriendo checkout…";
      try {
        await continueToDedicatedCheckout();
      } finally {
        button.disabled = false;
        if (label) label.textContent = `Continuar al checkout · $${Number(lastQuote?.totalUsd || 0).toFixed(2)}`;
      }
    });
    container.appendChild(button);
    showMessage("Pedido validado. Continúa al checkout para pagar y elegir servicios opcionales.", "success");
  } catch (error) {
    if (error.message === "AUTH_REDIRECT") return;
    setCheckoutMode(1);
    showMessage(error.message || "No se pudo validar el carrito.", "error");
  }
};

async function applyCouponSecure(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const input = document.getElementById("coupon-input");
  const button = document.getElementById("apply-coupon-btn");
  const code = String(input?.value || "").trim().toUpperCase();
  if (button) button.disabled = true;
  try {
    activeCouponCode = code;
    const quote = await secureQuote();
    if (code && !quote.couponValid) {
      activeCouponCode = "";
      const cleanQuote = await secureQuote();
      paintQuote(cleanQuote);
      showMessage("Código de cupón inválido.", "error");
    } else if (quote.couponValid) {
      showMessage(`Cupón aplicado. Descuento: $${Number(quote.discountUsd || 0).toFixed(2)}.`, "success");
    } else {
      showMessage("No hay cupón aplicado.", "info");
    }
    if (Number(lastQuote?.totalUsd) > 0 && typeof window.renderPayPalStable === "function") {
      window.renderPayPalStable();
    }
  } catch (error) {
    activeCouponCode = "";
    showMessage(error.message || "No se pudo validar el cupón.", "error");
  } finally {
    if (button) button.disabled = false;
  }
}

async function freeCheckoutSecure(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  await continueToDedicatedCheckout();
}

/* Capture phase prevents the legacy public ADMIN_EVOLUTION handler and browser Firestore free-order writer. */
document.addEventListener("click", (event) => {
  const target = event.target?.closest?.("#apply-coupon-btn");
  if (target) applyCouponSecure(event);
}, true);

document.addEventListener("click", (event) => {
  const target = event.target?.closest?.("#free-checkout-btn");
  if (target) freeCheckoutSecure(event);
}, true);

/* When a cart is changed by legacy UI, its own call to renderPayPalStable uses this secure override. */
// Evita que las UIs antiguas incrementen cantidad de productos digitales.
document.addEventListener("click", (event) => {
  const qtyButton = event.target?.closest?.(".qty-btn");
  if (qtyButton) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }

  const add = event.target?.closest?.(".btn-add-cart");
  if (!add) return;
  try {
    const cart = JSON.parse(localStorage.getItem("dingloft_cart") || "[]");
    if (!Array.isArray(cart)) return;
    const id = String(add.dataset.sku || add.dataset.id || add.dataset.name || "").trim().toLowerCase();
    if (!id) return;
    const exists = cart.some(item => String(item?.sku || item?.id || item?.name || "").trim().toLowerCase() === id);
    if (exists) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showMessage("Este producto digital ya está en tu carrito. Solo puedes comprar una unidad.", "info");
    }
  } catch (_) {}
}, true);
