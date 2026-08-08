const CATEGORY_LABELS = {
  naturales: "Productos naturales",
  panificados: "Panificados y dulces",
  fermentados: "Fermentados",
  pastas: "Pastas frescas",
  viandas: "Viandas"
};

let adminProducts = [];

/* ── TEMA (compartido con el sitio público) ── */
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = current ? current === "dark" : systemDark;
  const next = isDark ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

/* ── HELPERS ── */
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function formatAdminPrice(price) {
  if (price === null || price === undefined) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);
}

/* ── AUTENTICACIÓN ── */
function showLoggedOut() {
  document.getElementById("adminLogin").style.display = "flex";
  document.getElementById("adminDashboard").style.display = "none";
  document.getElementById("logoutBtn").style.display = "none";
}

function showLoggedIn() {
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminDashboard").style.display = "flex";
  document.getElementById("logoutBtn").style.display = "inline-flex";
}

/* ── NAVEGACIÓN ENTRE SECCIONES ── */
function showAdminSection(name, btn) {
  document.querySelectorAll(".admin-section").forEach(section => {
    section.style.display = section.dataset.section === name ? "block" : "none";
  });
  document.querySelectorAll(".admin-nav-item").forEach(item => item.classList.remove("active"));
  if (btn) btn.classList.add("active");
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";
  errorEl.className = "admin-row-status";

  const email = form.email.value.trim();
  const password = form.password.value;
  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = "Email o contraseña incorrectos.";
    errorEl.className = "admin-row-status error";
  }
}

async function handleLogout() {
  await sb.auth.signOut();
}

sb.auth.onAuthStateChange((event, session) => {
  if (session) {
    showLoggedIn();
    loadAdminProducts();
    loadMetrics();
  } else {
    showLoggedOut();
  }
});

/* ── MÉTRICAS ── */
async function loadMetrics() {
  const statsEl = document.getElementById("adminStats");
  const topEl = document.getElementById("adminTopProducts");
  statsEl.innerHTML = `<p class="admin-loading">Cargando métricas...</p>`;

  const { data, error } = await sb
    .from("events")
    .select("type, page, product_name, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    statsEl.innerHTML = `<p class="admin-row-status error">Todavía no hay datos de métricas (¿falta crear la tabla "events"?).</p>`;
    topEl.innerHTML = `<li class="admin-loading">Todavía no hay datos suficientes.</li>`;
    return;
  }

  const pageViews = data.filter(e => e.type === "page_view");
  const addToCart = data.filter(e => e.type === "add_to_cart");
  const whatsappOrders = data.filter(e => e.type === "whatsapp_order");
  const contactForms = data.filter(e => e.type === "contact_form");

  const viewsByPage = {};
  pageViews.forEach(e => {
    const page = e.page || "otra";
    viewsByPage[page] = (viewsByPage[page] || 0) + 1;
  });

  statsEl.innerHTML = `
    <div class="admin-stat-card">
      <span class="admin-stat-value">${pageViews.length}</span>
      <span class="admin-stat-label">Visitas totales</span>
      <span class="admin-stat-sub">Inicio ${viewsByPage.inicio || 0} · Catálogo ${viewsByPage.catalogo || 0} · Contacto ${viewsByPage.contacto || 0}</span>
    </div>
    <div class="admin-stat-card">
      <span class="admin-stat-value">${whatsappOrders.length}</span>
      <span class="admin-stat-label">Pedidos por WhatsApp</span>
    </div>
    <div class="admin-stat-card">
      <span class="admin-stat-value">${contactForms.length}</span>
      <span class="admin-stat-label">Contactos dejados</span>
    </div>
    <div class="admin-stat-card">
      <span class="admin-stat-value">${addToCart.length}</span>
      <span class="admin-stat-label">Productos agregados al carrito</span>
    </div>
  `;

  const counts = {};
  addToCart.forEach(e => {
    const name = e.product_name || "Producto eliminado";
    counts[name] = (counts[name] || 0) + 1;
  });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  topEl.innerHTML = ranked.length
    ? ranked.map(([name, count]) => `
        <li>
          <span class="admin-top-name">${escapeHtml(name)}</span>
          <span class="admin-top-count">${count}</span>
        </li>
      `).join("")
    : `<li class="admin-loading">Todavía no hay datos suficientes.</li>`;
}

/* ── LISTADO DE PRODUCTOS ── */
async function loadAdminProducts() {
  const listEl = document.getElementById("adminProductList");
  listEl.innerHTML = `<tr><td colspan="7" class="admin-loading">Cargando productos...</td></tr>`;

  const { data, error } = await sb.from("products").select("*").order("id", { ascending: true });

  if (error) {
    listEl.innerHTML = `<tr><td colspan="7" class="admin-row-status error">Error cargando productos: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  adminProducts = data;
  renderAdminProducts();
}

function renderAdminProducts() {
  const listEl = document.getElementById("adminProductList");
  const countEl = document.getElementById("adminProductCount");
  countEl.textContent = adminProducts.length;

  if (adminProducts.length === 0) {
    listEl.innerHTML = `<tr><td colspan="7" class="admin-loading">No hay productos todavía.</td></tr>`;
    return;
  }
  listEl.innerHTML = adminProducts.map(adminRowTemplate).join("");
  initAdminSearch();
}

function adminRowTemplate(p) {
  const categoryOptions = Object.entries(CATEGORY_LABELS).map(([key, label]) =>
    `<option value="${key}" ${p.category === key ? "selected" : ""}>${label}</option>`
  ).join("");

  return `
    <tr class="admin-row-summary" data-id="${p.id}" data-name="${escapeHtml(p.name.toLowerCase())}" data-brand="${escapeHtml((p.brand || "").toLowerCase())}">
      <td class="admin-cell-emoji">${escapeHtml(p.emoji)}</td>
      <td class="admin-cell-name">${escapeHtml(p.name)}</td>
      <td>${CATEGORY_LABELS[p.category] || escapeHtml(p.category)}</td>
      <td>${formatAdminPrice(p.price)}</td>
      <td class="admin-cell-check">${p.featured ? "✓" : "—"}</td>
      <td class="admin-cell-check">${p.orderable ? "✓" : "—"}</td>
      <td><button type="button" class="admin-edit-toggle" onclick="toggleRowEdit(${p.id})">Editar</button></td>
    </tr>
    <tr class="admin-row-edit" id="admin-edit-${p.id}" style="display:none;">
      <td colspan="7">
        <div class="admin-row-fields">
          <input type="text" class="admin-emoji" value="${escapeHtml(p.emoji)}" maxlength="4" aria-label="Emoji">
          <input type="text" class="admin-name" value="${escapeHtml(p.name)}" placeholder="Nombre" aria-label="Nombre">
          <input type="text" class="admin-brand" value="${escapeHtml(p.brand || "")}" placeholder="Marca" aria-label="Marca">
          <select class="admin-category" aria-label="Categoría">${categoryOptions}</select>
          <input type="number" class="admin-price" value="${p.price ?? ""}" placeholder="Precio ($)" min="0" step="1" aria-label="Precio">
          <label class="admin-checkbox"><input type="checkbox" class="admin-featured" ${p.featured ? "checked" : ""}> Destacado</label>
          <label class="admin-checkbox"><input type="checkbox" class="admin-orderable" ${p.orderable ? "checked" : ""}> Disponible para pedir</label>
        </div>
        <textarea class="admin-description" placeholder="Descripción" rows="2" aria-label="Descripción">${escapeHtml(p.description)}</textarea>
        <div class="admin-row-actions">
          <button type="button" class="btn btn-primary admin-save-btn" onclick="saveProduct(${p.id}, this)">Guardar</button>
          <button type="button" class="admin-delete-btn" onclick="deleteProduct(${p.id})">Eliminar</button>
          <span class="admin-row-status"></span>
        </div>
      </td>
    </tr>
  `;
}

function toggleRowEdit(id) {
  const editRow = document.getElementById(`admin-edit-${id}`);
  if (!editRow) return;
  const isOpen = editRow.style.display !== "none";
  document.querySelectorAll(".admin-row-edit").forEach(r => { r.style.display = "none"; });
  editRow.style.display = isOpen ? "none" : "table-row";
}

async function saveProduct(id, btn) {
  const editRow = document.getElementById(`admin-edit-${id}`);
  const statusEl = editRow.querySelector(".admin-row-status");
  const priceVal = editRow.querySelector(".admin-price").value;

  const payload = {
    emoji: editRow.querySelector(".admin-emoji").value.trim(),
    name: editRow.querySelector(".admin-name").value.trim(),
    brand: editRow.querySelector(".admin-brand").value.trim() || null,
    category: editRow.querySelector(".admin-category").value,
    price: priceVal === "" ? null : Number(priceVal),
    featured: editRow.querySelector(".admin-featured").checked,
    orderable: editRow.querySelector(".admin-orderable").checked,
    description: editRow.querySelector(".admin-description").value.trim()
  };

  btn.disabled = true;
  statusEl.textContent = "Guardando...";
  statusEl.className = "admin-row-status";

  const { data, error } = await sb.from("products").update(payload).eq("id", id).select();
  btn.disabled = false;

  if (error) {
    statusEl.textContent = "Error al guardar";
    statusEl.className = "admin-row-status error";
    return;
  }
  if (!data || data.length === 0) {
    // RLS puede rechazar la escritura sin devolver un error explícito (0 filas afectadas)
    statusEl.textContent = "No se guardó: tu sesión puede haber expirado. Volvé a ingresar.";
    statusEl.className = "admin-row-status error";
    return;
  }

  statusEl.textContent = "Guardado ✓";
  statusEl.className = "admin-row-status success";

  const idx = adminProducts.findIndex(p => p.id === id);
  if (idx !== -1) adminProducts[idx] = { ...adminProducts[idx], ...payload };

  const summaryRow = document.querySelector(`.admin-row-summary[data-id="${id}"]`);
  if (summaryRow) {
    summaryRow.querySelector(".admin-cell-emoji").textContent = payload.emoji;
    summaryRow.querySelector(".admin-cell-name").textContent = payload.name;
    summaryRow.children[2].textContent = CATEGORY_LABELS[payload.category] || payload.category;
    summaryRow.children[3].textContent = formatAdminPrice(payload.price);
    summaryRow.querySelectorAll(".admin-cell-check")[0].textContent = payload.featured ? "✓" : "—";
    summaryRow.querySelectorAll(".admin-cell-check")[1].textContent = payload.orderable ? "✓" : "—";
    summaryRow.dataset.name = payload.name.toLowerCase();
    summaryRow.dataset.brand = (payload.brand || "").toLowerCase();
  }

  setTimeout(() => { statusEl.textContent = ""; }, 2000);
}

async function deleteProduct(id) {
  if (!confirm("¿Seguro que querés eliminar este producto? No se puede deshacer.")) return;

  const { data, error } = await sb.from("products").delete().eq("id", id).select();
  if (error) {
    alert("Error al eliminar: " + error.message);
    return;
  }
  if (!data || data.length === 0) {
    alert("No se eliminó: tu sesión puede haber expirado. Volvé a ingresar.");
    return;
  }
  adminProducts = adminProducts.filter(p => p.id !== id);
  renderAdminProducts();
}

/* ── AGREGAR PRODUCTO ── */
async function handleAddProduct(event) {
  event.preventDefault();
  const form = event.target;
  const statusEl = document.getElementById("addProductStatus");

  const payload = {
    emoji: form.emoji.value.trim(),
    name: form.name.value.trim(),
    brand: form.brand.value.trim() || null,
    category: form.category.value,
    price: form.price.value === "" ? null : Number(form.price.value),
    featured: form.featured.checked,
    orderable: form.orderable.checked,
    description: form.description.value.trim()
  };

  statusEl.textContent = "Creando...";
  statusEl.className = "admin-row-status";

  const { error } = await sb.from("products").insert(payload);

  if (error) {
    statusEl.textContent = "Error: " + error.message;
    statusEl.className = "admin-row-status error";
    return;
  }
  statusEl.textContent = "¡Producto creado!";
  statusEl.className = "admin-row-status success";
  form.reset();
  form.emoji.value = "🌿";
  form.orderable.checked = true;
  await loadAdminProducts();
  setTimeout(() => { statusEl.textContent = ""; }, 2500);
}

/* ── BUSCADOR ── */
function initAdminSearch() {
  const input = document.getElementById("adminSearch");
  input.oninput = () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll(".admin-row-summary").forEach(row => {
      const match = row.dataset.name.includes(q) || row.dataset.brand.includes(q);
      row.style.display = match ? "" : "none";
      const editRow = document.getElementById(`admin-edit-${row.dataset.id}`);
      if (editRow && !match) editRow.style.display = "none";
    });
  };
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    showLoggedIn();
    loadAdminProducts();
    loadMetrics();
  } else {
    showLoggedOut();
  }
});
