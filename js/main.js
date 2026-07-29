const WA_NUMBER = "5491127481482";
let cart = [];

/* ── RENDER PRODUCTO ── */
function createProductCard(product) {
  const inCart = cart.find(i => i.id === product.id);
  const isVianda = product.category === "viandas";
  const isPasta = product.category === "pastas";
  const isConsult = isVianda || (isPasta);

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
          : inCart
            ? `<button class="btn btn-added" onclick="removeFromCart(${product.id})">✓ Agregado — quitar</button>`
            : `<button class="btn btn-add" onclick="addToCart(${product.id})">Agregar al pedido</button>`
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

/* ── CARRITO ── */
function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product || cart.find(i => i.id === id)) return;
  cart.push(product);
  updateCartBar();
  renderCatalog(getCurrentFilter());
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  updateCartBar();
  renderCatalog(getCurrentFilter());
}

function clearCart() {
  cart = [];
  updateCartBar();
  renderCatalog(getCurrentFilter());
}

function updateCartBar() {
  const bar = document.getElementById("cartBar");
  const count = document.getElementById("cartCount");
  if (!bar) return;
  if (cart.length > 0) {
    bar.classList.add("visible");
    count.textContent = `${cart.length} producto${cart.length > 1 ? "s" : ""} seleccionado${cart.length > 1 ? "s" : ""}`;
  } else {
    bar.classList.remove("visible");
  }
}

function sendToWhatsApp() {
  if (cart.length === 0) return;
  const items = cart.map(p => `• ${p.name}${p.brand ? ` (${p.brand})` : ""}`).join("\n");
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
