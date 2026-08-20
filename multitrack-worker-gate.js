(() => {
  'use strict';
  const WORKER_BASE = String(window.DINGLOFT_WORKER_BASE || document.querySelector('meta[name="dingloft-worker-base"]')?.content || 'https://autumn-breeze-dfa0.evolutiongt01.workers.dev').replace(/\/$/, '');
  const slugify = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100);
  let catalogReady = false;
  let catalogFailed = false;
  let productIndex = null;

  const toast = message => {
    const el = document.getElementById('mtToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2800);
  };

  // Delivery verification is independent from preview/audio state.
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('.mt-cart-action');
    if (!button) return;
    if (button.classList.contains('btn-add-cart') && button.dataset.workerReady === '1') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (catalogFailed) toast('No pude verificar la entrega con el servidor. Por seguridad la compra está bloqueada.');
    else if (!catalogReady) toast('Verificando archivo de entrega…');
    else toast(button.dataset.blockReason || 'Este multitrack todavía no tiene archivo de entrega configurado.');
  }, true);

  const setBlocked = (card, button, item, product) => {
    button.classList.remove('btn-add-cart');
    button.classList.add('btn-mt-pending','worker-blocked');
    button.dataset.workerReady = '0';
    button.dataset.blockReason = product ? 'El archivo de entrega todavía no está configurado.' : 'Este multitrack no está publicado en el catálogo del servidor.';
    button.setAttribute('aria-disabled','true');
    button.innerHTML = '<span>Archivo pendiente</span> <i class="bi bi-lock"></i>';
    const price = card?.querySelector('.mt-price strong');
    if (price && product && Number.isFinite(Number(product.priceUsd))) price.textContent = `$${Number(product.priceUsd).toFixed(2)}`;
    card?.classList.add('delivery-pending');
    card?.classList.remove('delivery-ready');
    const kicker = card?.querySelector('.mt-card-kicker');
    if (kicker) kicker.innerHTML = '<span class="mt-server-dot pending"></span> Entrega pendiente';
  };

  const setAvailable = (card, button, item, product) => {
    const price = Number(product.priceUsd || 0);
    button.classList.remove('btn-mt-pending','worker-blocked');
    button.classList.add('btn-add-cart');
    button.dataset.workerReady = '1';
    button.dataset.sku = product.sku || slugify(product.name);
    button.dataset.workerSku = button.dataset.sku;
    button.dataset.name = product.name || item.title;
    button.dataset.price = String(price);
    button.dataset.type = product.type || 'Multitrack digital';
    button.removeAttribute('aria-disabled');
    delete button.dataset.blockReason;
    button.innerHTML = '<span>Agregar</span> <i class="bi bi-bag-plus"></i>';
    card?.classList.remove('delivery-pending');
    card?.classList.add('delivery-ready');
    const priceEl = card?.querySelector('.mt-price strong');
    if (priceEl) { priceEl.classList.remove('pending'); priceEl.textContent = `$${price.toFixed(2)}`; }
    const kicker = card?.querySelector('.mt-card-kicker');
    if (kicker) kicker.innerHTML = '<span class="mt-server-dot ready"></span> Entrega lista';
  };

  const findProduct = item => {
    if (!productIndex) return null;
    return productIndex.get(slugify(item?.sku)) || productIndex.get(slugify(item?.title)) || productIndex.get(slugify(item?.id)) || null;
  };

  const applyCatalogToCurrentCards = () => {
    if (!catalogReady || !productIndex) return;
    const tracks = Array.isArray(window.DINGLOFT_MULTITRACKS) ? window.DINGLOFT_MULTITRACKS : [];
    for (const item of tracks) {
      const card = document.getElementById(`mt-${item.id}`);
      if (!card) continue;
      const button = card.querySelector('.mt-cart-action');
      if (!button) continue;
      const product = findProduct(item);
      if (product && product.active !== false && product.deliveryConfigured === true) setAvailable(card, button, item, product);
      else setBlocked(card, button, item, product);
    }
  };

  async function syncCatalog() {
    try {
      const response = await fetch(`${WORKER_BASE}/products/public`, {headers:{Accept:'application/json'}, cache:'no-store'});
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false || !Array.isArray(data?.products)) throw new Error(data?.error || 'CATALOG_UNAVAILABLE');
      const products = data.products.filter(p => String(p?.type || '').toLowerCase().includes('multitrack'));
      productIndex = new Map();
      for (const p of products) {
        if (p?.sku) productIndex.set(slugify(p.sku), p);
        if (p?.name) productIndex.set(slugify(p.name), p);
      }
      catalogReady = true;
      catalogFailed = false;
      document.documentElement.classList.add('mt-worker-ready');
      applyCatalogToCurrentCards();
    } catch (error) {
      catalogFailed = true;
      catalogReady = true;
      console.error('Dingloft multitrack catalog gate', error);
      document.querySelectorAll('.mt-card').forEach(card => {
        const button = card.querySelector('.mt-cart-action');
        if (button) setBlocked(card, button, {}, null);
      });
    }
  }

  // The public Multitrack catalog is loaded asynchronously and re-renders #mtGrid.
  // Reapply delivery verification to the new buttons without refetching or touching audio state.
  window.addEventListener('dingloft:multitracks-rendered', () => {
    if (catalogReady && productIndex) applyCatalogToCurrentCards();
  });

  // Preserve SKU when the cart handler builds the item object.
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('.btn-add-cart[data-worker-ready="1"]');
    if (!button) return;
    const sku = button.dataset.sku || '';
    if (sku) button.dataset.id = button.dataset.id || sku;
  }, true);

  syncCatalog();
})();
