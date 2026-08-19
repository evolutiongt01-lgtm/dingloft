/* Dingloft Commerce Bridge · v2.1.0 · Worker Canonical Catalog
   Payment and digital fulfillment are finalized by Cloudflare Worker.
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

window.__DINGLOFT_COMMERCE_V1__ = true;
window.__DINGLOFT_COMMERCE_V2__ = true;

function currentItems() {
  const source = Array.isArray(window.cartItemsList) ? window.cartItemsList : [];
  return source
    .slice(0, 50)
    .map(item => ({
      sku: String(item?.sku || item?.productSku || item?.workerSku || item?.id || "").trim(),
      name: String(item?.name || "").trim(),
      type: String(item?.type || "").trim(),
      img: String(item?.img || "").trim()
    }))
    .filter(item => item.name);
}

function loginUrl() {
  const next = `${location.pathname.split('/').pop() || 'index.html'}${location.search || ''}${location.hash || ''}`;
  return `login.html?next=${encodeURIComponent(next)}`;
}

async function requireUser() {
  const user = auth.currentUser;
  if (!user) {
    location.href = loginUrl();
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
  const paypal = paypalWrapper();
  const free = freeButton();
  const badge = securityBadge();
  const isFree = Number(total) === 0;
  if (paypal) paypal.style.display = isFree ? "none" : "block";
  if (badge) badge.style.display = isFree ? "none" : "block";
  if (free) free.style.display = isFree ? "block" : "none";
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
  const suffix = orderNumber ? ` (${orderNumber})` : "";
  showMessage(`Compra confirmada${suffix}. Tus archivos ya están en Mi cuenta.`, "success");
  location.href = `account.html?purchase=success${orderNumber ? `&order=${encodeURIComponent(orderNumber)}` : ""}`;
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

/* Override the legacy browser-capture function. PayPal capture now happens only in Worker. */
window.renderPayPalStable = async function renderPayPalStableSecure() {
  const generation = ++paypalRenderGeneration;
  const container = document.getElementById("paypal-button-container");
  if (!container) return;
  container.innerHTML = "";
  if (!currentItems().length) return;

  try {
    const quote = await secureQuote();
    if (generation !== paypalRenderGeneration) return;
    if (Number(quote.totalUsd) === 0) return;
    if (typeof window.paypal === "undefined") {
      showMessage("PayPal todavía no terminó de cargar. Recarga la página si el botón no aparece.", "error");
      return;
    }

    window.paypal.Buttons({
      style: { layout: "vertical", color: "gold", shape: "pill", label: "pay" },
      createOrder: async () => {
        try {
          return await createOrderOnServer();
        } catch (error) {
          if (error.message === "AUTH_REDIRECT") return Promise.reject(error);
          showMessage(error.message || "No se pudo preparar el pago.", "error");
          throw error;
        }
      },
      onApprove: async (data) => {
        try {
          showMessage("Pago aprobado. Estamos habilitando tus archivos…", "info");
          const result = await captureOrderOnServer(data.orderID);
          successAndGo(result.orderNumber || "");
        } catch (error) {
          if (error.message === "AUTH_REDIRECT") return;
          /* If the browser/network fails here, PayPal webhook completes fulfillment server-side. */
          showMessage(`${error.message || "El pago fue aprobado."} Si PayPal confirmó el cobro, vuelve a Mi cuenta: el servidor recupera la entrega automáticamente.`, "error");
        }
      },
      onCancel: () => showMessage("Pago cancelado. No se realizó ningún cobro.", "info"),
      onError: (error) => {
        console.error("Dingloft secure PayPal", error);
        showMessage("No se pudo abrir PayPal. Inténtalo nuevamente.", "error");
      }
    }).render("#paypal-button-container");
  } catch (error) {
    if (error.message === "AUTH_REDIRECT") return;
    setCheckoutMode(1);
    const wrapper = paypalWrapper();
    if (wrapper) wrapper.style.display = "none";
    if (securityBadge()) securityBadge().style.display = "none";
    showMessage(error.message || "Este producto todavía no puede cobrarse de forma segura.", "error");
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
  const button = freeButton();
  if (button) {
    button.disabled = true;
    button.dataset.originalText = button.dataset.originalText || button.innerHTML;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true" style="margin-right:8px"></span> Procesando…';
  }
  try {
    const result = await api("/checkout/free", {
      method: "POST",
      authRequired: true,
      body: { items: currentItems(), couponCode: activeCouponCode }
    });
    successAndGo(result.orderNumber || "");
  } catch (error) {
    if (error.message !== "AUTH_REDIRECT") showMessage(error.message || "No se pudo procesar el pedido gratuito.", "error");
  } finally {
    if (button) {
      button.disabled = false;
      if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
    }
  }
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
