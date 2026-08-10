const WA_NUMBER = "5491127481482";
const CART_STORAGE_KEY = "sion_cart";

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

let cart = loadCart(); // { [id]: qty }

/* ── ENVÍO ── */
const SHIPPING_STORAGE_KEY = "sion_shipping_zone";
let shippingZones = [];
let selectedShippingZoneId = localStorage.getItem(SHIPPING_STORAGE_KEY) || "";

async function loadShippingZones() {
  const { data, error } = await sb.from("shipping_zones").select("*").order("name", { ascending: true });
  if (error) {
    shippingZones = [];
    return;
  }
  shippingZones = data;
}

function getSelectedShippingZone() {
  return shippingZones.find(z => String(z.id) === String(selectedShippingZoneId)) || null;
}

function getSelectedShippingCost() {
  const zone = getSelectedShippingZone();
  return zone ? Number(zone.cost) : 0;
}

function renderShippingSelect() {
  const wrap = document.getElementById("cartShipping");
  const select = document.getElementById("shippingZoneSelect");
  if (!wrap || !select) return;

  if (shippingZones.length === 0) {
    wrap.style.display = "none";
    return;
  }

  select.innerHTML = `<option value="">Elegí tu barrio...</option>` + shippingZones.map(z =>
    `<option value="${z.id}" ${String(z.id) === String(selectedShippingZoneId) ? "selected" : ""}>${z.name} — ${formatPrice(z.cost)}</option>`
  ).join("");
}

function updateShippingSelection() {
  const select = document.getElementById("shippingZoneSelect");
  if (!select) return;
  selectedShippingZoneId = select.value || "";
  localStorage.setItem(SHIPPING_STORAGE_KEY, selectedShippingZoneId);
  renderCartDrawer();
}

/* ── MÉTRICAS ── */
function getPageName() {
  const path = location.pathname.split("/").pop();
  if (!path || path === "index.html") return "inicio";
  if (path === "catalogo.html") return "catalogo";
  if (path === "contacto.html") return "contacto";
  return path;
}

async function logEvent(type, extra = {}) {
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) return; // no contar la navegación de la propia admin logueada
    await sb.from("events").insert({ type, ...extra });
  } catch {
    // los eventos son best-effort: nunca deben romper la experiencia del sitio
  }
}

/* ── PRECIOS ── */
function formatPrice(price) {
  if (price === null || price === undefined) return null;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);
}

/* ── RENDER PRODUCTO ── */
function createProductCard(product) {
  const isConsult = product.orderable === false;
  const qty = cart[product.id] || 0;
  const priceLabel = formatPrice(product.price);

  return `
    <div class="product-card" data-category="${product.category}" data-id="${product.id}">
      <div class="product-card-top">
        <div class="product-emoji">${product.emoji}</div>
        <span class="product-category-badge">${CATEGORY_LABELS[product.category]}</span>
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        ${product.brand ? `<span class="product-brand">${product.brand}</span>` : ""}
        <p class="product-desc">${product.description}</p>
      </div>
      <div class="product-actions">
        ${priceLabel ? `<div class="product-price">${priceLabel}</div>` : ""}
        ${isConsult
          ? `<a href="https://wa.me/${WA_NUMBER}?text=Hola%2C%20quiero%20consultar%20disponibilidad%20de%3A%20${encodeURIComponent(product.name)}" target="_blank" class="btn btn-consult">Consultar disponibilidad</a>`
          : `<div class="qty-stepper">
              <button type="button" class="qty-btn" aria-label="Quitar uno" onclick="decrementQty(${product.id})">−</button>
              <span class="qty-value">${qty}</span>
              <button type="button" class="qty-btn" aria-label="Sumar uno" onclick="incrementQty(${product.id})">+</button>
            </div>`
        }
      </div>
    </div>
  `;
}

/* ── RENDER GRIDS ── */
function renderFeatured() {
  const el = document.getElementById("featuredProducts");
  if (!el) return;
  const featured = PRODUCTS.filter(p => p.featured).slice(0, 6);
  el.innerHTML = featured.map(createProductCard).join("");
}

function renderCatalog(filter = "all") {
  const el = document.getElementById("catalogProducts");
  if (!el) return;
  const filtered = filter === "all" ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);
  el.innerHTML = filtered.map(createProductCard).join("");
}

function renderAll() {
  renderFeatured();
  renderCatalog(getCurrentFilter());
}

/* ── CARRITO ── */
let cartOpen = false;

function incrementQty(id) {
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  updateCartBadge();
  renderAll();
  renderCartDrawer();
  const product = PRODUCTS.find(p => p.id === id);
  logEvent("add_to_cart", { product_id: id, product_name: product ? product.name : null });
}

function decrementQty(id) {
  const next = (cart[id] || 0) - 1;
  if (next <= 0) delete cart[id]; else cart[id] = next;
  saveCart();
  updateCartBadge();
  renderAll();
  renderCartDrawer();
}

function removeFromCart(id) {
  delete cart[id];
  saveCart();
  updateCartBadge();
  renderAll();
  renderCartDrawer();
}

function clearCart() {
  cart = {};
  saveCart();
  updateCartBadge();
  renderAll();
  renderCartDrawer();
}

function updateCartBadge() {
  const btn = document.getElementById("navCartBtn");
  const count = document.getElementById("navCartCount");
  if (!btn || !count) return;
  const total = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  count.textContent = total;
  btn.classList.toggle("has-items", total > 0);
}

function toggleCart() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (!drawer || !overlay) return;
  cartOpen = !cartOpen;
  drawer.classList.toggle("open", cartOpen);
  overlay.classList.toggle("open", cartOpen);
  if (cartOpen) renderCartDrawer();
}

function renderCartDrawer() {
  const el = document.getElementById("cartDrawerItems");
  const totalEl = document.getElementById("cartDrawerTotal");
  const shippingWrap = document.getElementById("cartShipping");
  if (!el) return;
  const ids = Object.keys(cart);

  if (ids.length === 0) {
    el.innerHTML = `<p class="cart-drawer-empty">Todavía no agregaste productos.</p>`;
    if (totalEl) totalEl.innerHTML = "";
    if (shippingWrap) shippingWrap.style.display = "none";
    return;
  }

  if (shippingWrap) shippingWrap.style.display = shippingZones.length > 0 ? "flex" : "none";

  let total = 0;
  let missingPrice = false;

  el.innerHTML = ids.map(id => {
    const product = PRODUCTS.find(p => p.id === Number(id));
    const qty = cart[id];
    const lineTotal = product.price != null ? product.price * qty : null;
    if (lineTotal != null) total += lineTotal; else missingPrice = true;
    return `
      <div class="cart-item">
        <div class="cart-item-emoji">${product.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-qty">Cantidad: ${qty}${lineTotal != null ? ` · ${formatPrice(lineTotal)}` : ""}</div>
        </div>
        <button type="button" class="cart-item-remove" onclick="removeFromCart(${id})">Quitar</button>
      </div>
    `;
  }).join("");

  const shippingZone = getSelectedShippingZone();
  const shippingCost = getSelectedShippingCost();
  const grandTotal = total + shippingCost;

  if (totalEl) {
    totalEl.innerHTML = `
      ${shippingZone ? `
        <div class="cart-drawer-total-row">
          <span>Envío a ${shippingZone.name}</span>
          <span>${formatPrice(shippingCost)}</span>
        </div>
      ` : ""}
      <div class="cart-drawer-total-row">
        <span>Total estimado</span>
        <strong>${formatPrice(grandTotal)}</strong>
      </div>
      ${missingPrice ? `<p class="cart-drawer-total-note">* Hay productos sin precio cargado, se confirma por WhatsApp.</p>` : ""}
    `;
  }
}

function sendToWhatsApp() {
  const ids = Object.keys(cart);
  if (ids.length === 0) return;

  let total = 0;
  let missingPrice = false;
  const items = ids.map(id => {
    const product = PRODUCTS.find(p => p.id === Number(id));
    const qty = cart[id];
    const lineTotal = product.price != null ? product.price * qty : null;
    if (lineTotal != null) total += lineTotal; else missingPrice = true;
    return `• ${product.name}${product.brand ? ` (${product.brand})` : ""} x${qty}${lineTotal != null ? ` — ${formatPrice(lineTotal)}` : ""}`;
  }).join("\n");

  const shippingZone = getSelectedShippingZone();
  const shippingCost = getSelectedShippingCost();
  const grandTotal = total + shippingCost;
  const shippingLine = shippingZone ? `Envío a ${shippingZone.name}: ${formatPrice(shippingCost)}\n` : "";

  const totalLine = missingPrice
    ? `${shippingLine}Total estimado: ${formatPrice(grandTotal)} (hay productos sin precio confirmado)`
    : `${shippingLine}Total: ${formatPrice(grandTotal)}`;

  const msg = `Hola! Me gustaría hacer un pedido:\n\n${items}\n\n${totalLine}\n\n¿Podrían confirmar disponibilidad?`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  logEvent("whatsapp_order", {});
}

/* ── CONTACTO ALTERNATIVO (sin WhatsApp) ── */
// TODO: reemplazar por el endpoint real una vez creada la cuenta gratuita en https://formspree.io
const CONTACT_FORM_ENDPOINT = "https://formspree.io/f/TU_FORM_ID";

function toggleContactForm() {
  const form = document.getElementById("cartContactForm");
  if (!form) return;
  form.classList.toggle("open");
}

function buildOrderSummary() {
  const ids = Object.keys(cart);
  if (ids.length === 0) return "(No agregó productos, solo pidió que lo contactemos.)";

  let total = 0;
  let missingPrice = false;
  const lines = ids.map(id => {
    const product = PRODUCTS.find(p => p.id === Number(id));
    const qty = cart[id];
    const lineTotal = product.price != null ? product.price * qty : null;
    if (lineTotal != null) total += lineTotal; else missingPrice = true;
    return `- ${product.name}${product.brand ? ` (${product.brand})` : ""} x${qty}${lineTotal != null ? ` — ${formatPrice(lineTotal)}` : ""}`;
  }).join("\n");

  const shippingZone = getSelectedShippingZone();
  const shippingCost = getSelectedShippingCost();
  const grandTotal = total + shippingCost;
  const shippingLine = shippingZone ? `Envío a ${shippingZone.name}: ${formatPrice(shippingCost)}\n` : "";

  const totalLine = missingPrice
    ? `${shippingLine}Total estimado: ${formatPrice(grandTotal)} (hay productos sin precio confirmado)`
    : `${shippingLine}Total: ${formatPrice(grandTotal)}`;

  return `${lines}\n\n${totalLine}`;
}

async function submitContactForm(event) {
  event.preventDefault();
  const form = event.target;
  const status = document.getElementById("cartContactStatus");
  const submitBtn = form.querySelector(".cart-contact-submit");

  if (CONTACT_FORM_ENDPOINT.includes("TU_FORM_ID")) {
    status.textContent = "Este formulario todavía no está configurado. Escribinos por WhatsApp mientras tanto.";
    status.className = "cart-contact-status error";
    return;
  }

  submitBtn.disabled = true;
  status.textContent = "Enviando...";
  status.className = "cart-contact-status";

  try {
    const res = await fetch(CONTACT_FORM_ENDPOINT, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.name.value.trim(),
        telefono: form.phone.value.trim(),
        email: form.email.value.trim(),
        pedido: buildOrderSummary()
      })
    });
    if (!res.ok) throw new Error("request failed");
    status.textContent = "¡Listo! Te vamos a contactar a la brevedad.";
    status.className = "cart-contact-status success";
    form.reset();
    logEvent("contact_form", {});
  } catch {
    status.textContent = "No pudimos enviar tus datos. Probá de nuevo o escribinos por WhatsApp.";
    status.className = "cart-contact-status error";
  } finally {
    submitBtn.disabled = false;
  }
}

function getCurrentFilter() {
  const active = document.querySelector(".filter-btn.active");
  return active ? active.dataset.filter : "all";
}

/* ── FILTROS ── */
function initFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderCatalog(btn.dataset.filter);
    });
  });
}

/* ── NAV MOBILE ── */
function toggleMenu() {
  const menu = document.getElementById("navMobile");
  menu.classList.toggle("open");
}

/* ── TEMA ── */
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = current ? current === "dark" : systemDark;
  const next = isDark ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", async () => {
  const featuredEl = document.getElementById("featuredProducts");
  const catalogEl = document.getElementById("catalogProducts");
  if (featuredEl) featuredEl.innerHTML = `<p class="products-loading">Cargando productos...</p>`;
  if (catalogEl) catalogEl.innerHTML = `<p class="products-loading">Cargando productos...</p>`;

  await loadProducts();

  renderFeatured();
  renderCatalog();
  initFilters();
  updateCartBadge();
  logEvent("page_view", { page: getPageName() });

  loadShippingZones().then(renderShippingSelect);

  // Scroll suave para nav
  document.querySelectorAll("a[href^='#']").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      document.querySelector(a.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" });
    });
  });
});
