const WA_NUMBER = "5491127481482";
let cart = {}; // { [id]: qty }

/* ── RENDER PRODUCTO ── */
function createProductCard(product) {
  const isVianda = product.category === "viandas";
  const isPasta = product.category === "pastas";
  const isConsult = isVianda || (isPasta);
  const qty = cart[product.id] || 0;

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
  updateCartBar();
  renderAll();
  renderCartDrawer();
}

function decrementQty(id) {
  const next = (cart[id] || 0) - 1;
  if (next <= 0) delete cart[id]; else cart[id] = next;
  updateCartBar();
  renderAll();
  renderCartDrawer();
}

function removeFromCart(id) {
  delete cart[id];
  updateCartBar();
  renderAll();
  renderCartDrawer();
}

function clearCart() {
  cart = {};
  updateCartBar();
  renderAll();
  renderCartDrawer();
}

function updateCartBar() {
  const bar = document.getElementById("cartBar");
  const count = document.getElementById("cartCount");
  if (!bar) return;
  const total = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  if (total > 0) {
    bar.classList.add("visible");
    count.textContent = `${total} producto${total > 1 ? "s" : ""} seleccionado${total > 1 ? "s" : ""}`;
  } else {
    bar.classList.remove("visible");
  }
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
  if (!el) return;
  const ids = Object.keys(cart);
  if (ids.length === 0) {
    el.innerHTML = `<p class="cart-drawer-empty">Todavía no agregaste productos.</p>`;
    return;
  }
  el.innerHTML = ids.map(id => {
    const product = PRODUCTS.find(p => p.id === Number(id));
    return `
      <div class="cart-item">
        <div class="cart-item-emoji">${product.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-qty">Cantidad: ${cart[id]}</div>
        </div>
        <button type="button" class="cart-item-remove" onclick="removeFromCart(${id})">Quitar</button>
      </div>
    `;
  }).join("");
}

function sendToWhatsApp() {
  const ids = Object.keys(cart);
  if (ids.length === 0) return;
  const items = ids.map(id => {
    const product = PRODUCTS.find(p => p.id === Number(id));
    return `• ${product.name}${product.brand ? ` (${product.brand})` : ""} x${cart[id]}`;
  }).join("\n");
  const msg = `Hola! Me gustaría hacer un pedido:\n\n${items}\n\n¿Podrían confirmar disponibilidad y precio?`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
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

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  renderFeatured();
  renderCatalog();
  initFilters();

  // Scroll suave para nav
  document.querySelectorAll("a[href^='#']").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      document.querySelector(a.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" });
    });
  });
});
