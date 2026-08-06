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

/* ── AUTENTICACIÓN ── */
function showLoggedOut() {
  document.getElementById("adminLogin").style.display = "flex";
  document.getElementById("adminDashboard").style.display = "none";
  document.getElementById("logoutBtn").style.display = "none";
}

function showLoggedIn() {
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminDashboard").style.display = "block";
  document.getElementById("logoutBtn").style.display = "inline-flex";
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
  } else {
    showLoggedOut();
  }
});

/* ── LISTADO DE PRODUCTOS ── */
async function loadAdminProducts() {
  const listEl = document.getElementById("adminProductList");
  listEl.innerHTML = `<p class="admin-loading">Cargando productos...</p>`;

  const { data, error } = await sb.from("products").select("*").order("id", { ascending: true });

  if (error) {
    listEl.innerHTML = `<p class="admin-row-status error">Error cargando productos: ${escapeHtml(error.message)}</p>`;
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
    listEl.innerHTML = `<p class="admin-loading">No hay productos todavía.</p>`;
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
    <div class="admin-row" data-id="${p.id}">
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
    </div>
  `;
}

async function saveProduct(id, btn) {
  const row = btn.closest(".admin-row");
  const statusEl = row.querySelector(".admin-row-status");
  const priceVal = row.querySelector(".admin-price").value;

  const payload = {
    emoji: row.querySelector(".admin-emoji").value.trim(),
    name: row.querySelector(".admin-name").value.trim(),
    brand: row.querySelector(".admin-brand").value.trim() || null,
    category: row.querySelector(".admin-category").value,
    price: priceVal === "" ? null : Number(priceVal),
    featured: row.querySelector(".admin-featured").checked,
    orderable: row.querySelector(".admin-orderable").checked,
    description: row.querySelector(".admin-description").value.trim()
  };

  btn.disabled = true;
  statusEl.textContent = "Guardando...";
  statusEl.className = "admin-row-status";

  const { error } = await sb.from("products").update(payload).eq("id", id);
  btn.disabled = false;

  if (error) {
    statusEl.textContent = "Error al guardar";
    statusEl.className = "admin-row-status error";
    return;
  }
  statusEl.textContent = "Guardado ✓";
  statusEl.className = "admin-row-status success";
  const idx = adminProducts.findIndex(p => p.id === id);
  if (idx !== -1) adminProducts[idx] = { ...adminProducts[idx], ...payload };
  setTimeout(() => { statusEl.textContent = ""; }, 2000);
}

async function deleteProduct(id) {
  if (!confirm("¿Seguro que querés eliminar este producto? No se puede deshacer.")) return;

  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) {
    alert("Error al eliminar: " + error.message);
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
  form.orderable.checked = true;
  await loadAdminProducts();
  setTimeout(() => { statusEl.textContent = ""; }, 2500);
}

/* ── BUSCADOR ── */
function initAdminSearch() {
  const input = document.getElementById("adminSearch");
  input.oninput = () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll(".admin-row").forEach(row => {
      const name = row.querySelector(".admin-name").value.toLowerCase();
      const brand = row.querySelector(".admin-brand").value.toLowerCase();
      row.style.display = (name.includes(q) || brand.includes(q)) ? "" : "none";
    });
  };
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    showLoggedIn();
    loadAdminProducts();
  } else {
    showLoggedOut();
  }
});
