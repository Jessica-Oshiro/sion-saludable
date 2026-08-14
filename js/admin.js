const CATEGORY_LABELS = {
  naturales: "Productos naturales",
  panificados: "Panificados y dulces",
  fermentados: "Fermentados",
  pastas: "Pastas frescas",
  viandas: "Viandas"
};

let adminProducts = [];
let shippingZones = [];

// Respaldo local (usado solo si la tabla price_settings todavía no existe en Supabase):
// mismos valores recomendados que la seed del SQL, para que el cálculo funcione igual.
const DEFAULT_PRICE_SETTINGS = {
  default_markup_pct: 40,
  category_markup: { naturales: 40, panificados: 120, fermentados: 120, pastas: 120, viandas: 120 },
  round_to: 100
};
let priceSettings = { ...DEFAULT_PRICE_SETTINGS };

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

// mismo criterio que normalizeText() en js/main.js, para agrupar términos de búsqueda
function normalizeText(str) {
  return (str || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
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
    loadPriceSettings().then(() => renderCategoryMarkupInputs());
    loadAdminProducts();
    loadMetrics();
    loadShippingZones();
  } else {
    showLoggedOut();
  }
});

/* ── PRECIOS: CÁLCULO ── */
async function loadPriceSettings() {
  const { data, error } = await sb.from("price_settings").select("*").eq("id", 1).single();
  priceSettings = (error || !data) ? { ...DEFAULT_PRICE_SETTINGS } : data;
  const form = document.getElementById("pricingSettingsForm");
  if (form) {
    form.default_markup_pct.value = priceSettings.default_markup_pct;
    form.round_to.value = priceSettings.round_to;
  }
}

function getMarkupForCategory(category) {
  const override = priceSettings.category_markup?.[category];
  return override != null ? Number(override) : Number(priceSettings.default_markup_pct);
}

function calculateSuggestedPrice(cost, category) {
  if (cost === null || cost === undefined || cost === "") return null;
  const costNum = Number(cost);
  if (Number.isNaN(costNum)) return null;
  const markupPct = getMarkupForCategory(category);
  const raw = costNum * (1 + markupPct / 100);
  const step = Number(priceSettings.round_to) || 1;
  return Math.round(raw / step) * step;
}

function recalcAddFormPrice() {
  const form = document.getElementById("addProductForm");
  const suggested = calculateSuggestedPrice(form.cost.value, form.category.value);
  if (suggested !== null) form.price.value = suggested;
}

function handleCostInput(id) {
  const editRow = document.getElementById(`admin-edit-${id}`);
  if (!editRow) return;
  const cost = editRow.querySelector(".admin-cost").value;
  const category = editRow.querySelector(".admin-category").value;
  const suggested = calculateSuggestedPrice(cost, category);
  if (suggested !== null) editRow.querySelector(".admin-price").value = suggested;
}

function renderCategoryMarkupInputs() {
  const el = document.getElementById("categoryMarkupInputs");
  if (!el) return;
  el.innerHTML = Object.entries(CATEGORY_LABELS).map(([key, label]) => `
    <label>${label} (%)
      <input type="number" class="category-markup-input" data-category="${key}" min="0" step="1" value="${priceSettings.category_markup?.[key] ?? ""}" placeholder="Usa ${priceSettings.default_markup_pct}% por defecto">
    </label>
  `).join("");
}

async function savePriceSettings(event) {
  event.preventDefault();
  const form = event.target;
  const statusEl = document.getElementById("pricingStatus");

  const categoryMarkup = {};
  document.querySelectorAll(".category-markup-input").forEach(input => {
    if (input.value !== "") categoryMarkup[input.dataset.category] = Number(input.value);
  });

  const payload = {
    default_markup_pct: Number(form.default_markup_pct.value),
    round_to: Number(form.round_to.value),
    category_markup: categoryMarkup
  };

  statusEl.textContent = "Guardando...";
  statusEl.className = "admin-row-status";

  const { data, error } = await sb.from("price_settings").update(payload).eq("id", 1).select();

  if (error) {
    statusEl.textContent = "Error al guardar (¿falta crear la tabla \"price_settings\"?)";
    statusEl.className = "admin-row-status error";
    return;
  }
  if (!data || data.length === 0) {
    statusEl.textContent = "No se guardó: tu sesión puede haber expirado. Volvé a ingresar.";
    statusEl.className = "admin-row-status error";
    return;
  }

  priceSettings = data[0];
  renderCategoryMarkupInputs();
  statusEl.textContent = "Configuración guardada ✓";
  statusEl.className = "admin-row-status success";
  setTimeout(() => { statusEl.textContent = ""; }, 2000);
}

async function recalculateAllPrices() {
  const statusEl = document.getElementById("recalculateStatus");
  const withCost = adminProducts.filter(p => p.cost_price != null);

  if (withCost.length === 0) {
    statusEl.textContent = "Ningún producto tiene costo cargado todavía.";
    statusEl.className = "admin-row-status error";
    return;
  }
  if (!confirm(`Se va a recalcular el precio de ${withCost.length} producto(s) con la configuración actual. ¿Continuar?`)) return;

  statusEl.textContent = "Recalculando...";
  statusEl.className = "admin-row-status";

  let successCount = 0;
  for (const p of withCost) {
    const newPrice = calculateSuggestedPrice(p.cost_price, p.category);
    const { data, error } = await sb.from("products").update({ price: newPrice }).eq("id", p.id).select();
    if (!error && data && data.length > 0) successCount++;
  }

  await loadAdminProducts();
  statusEl.textContent = successCount === withCost.length
    ? `Listo: se actualizaron ${successCount} producto(s).`
    : `Se actualizaron ${successCount} de ${withCost.length} producto(s). Revisá tu sesión si alguno falló.`;
  statusEl.className = successCount === withCost.length ? "admin-row-status success" : "admin-row-status error";
}

/* ── ZONAS DE ENVÍO ── */
async function loadShippingZones() {
  const listEl = document.getElementById("shippingZonesList");
  if (!listEl) return;
  listEl.innerHTML = `<tr><td colspan="3" class="admin-loading">Cargando zonas...</td></tr>`;

  const { data, error } = await sb.from("shipping_zones").select("*").order("name", { ascending: true });

  if (error) {
    listEl.innerHTML = `<tr><td colspan="3" class="admin-row-status error">Todavía no hay zonas (¿falta crear la tabla "shipping_zones"?).</td></tr>`;
    return;
  }
  shippingZones = data;
  renderShippingZones();
}

function renderShippingZones() {
  const listEl = document.getElementById("shippingZonesList");
  if (!listEl) return;

  if (shippingZones.length === 0) {
    listEl.innerHTML = `<tr><td colspan="3" class="admin-loading">Todavía no agregaste zonas de envío.</td></tr>`;
    return;
  }
  listEl.innerHTML = shippingZones.map(z => `
    <tr data-id="${z.id}">
      <td><input type="text" class="zone-name" value="${escapeHtml(z.name)}" aria-label="Barrio o zona"></td>
      <td><input type="number" class="zone-cost" value="${z.cost}" min="0" step="1" aria-label="Costo"></td>
      <td class="admin-row-actions">
        <button type="button" class="btn btn-primary admin-save-btn" onclick="saveShippingZone(${z.id}, this)">Guardar</button>
        <button type="button" class="admin-delete-btn" onclick="deleteShippingZone(${z.id})">Eliminar</button>
        <span class="admin-row-status"></span>
      </td>
    </tr>
  `).join("");
}

async function saveShippingZone(id, btn) {
  const row = btn.closest("tr");
  const statusEl = row.querySelector(".admin-row-status");
  const payload = {
    name: row.querySelector(".zone-name").value.trim(),
    cost: Number(row.querySelector(".zone-cost").value)
  };

  btn.disabled = true;
  statusEl.textContent = "Guardando...";
  statusEl.className = "admin-row-status";

  const { data, error } = await sb.from("shipping_zones").update(payload).eq("id", id).select();
  btn.disabled = false;

  if (error || !data || data.length === 0) {
    statusEl.textContent = error ? "Error al guardar" : "No se guardó: tu sesión puede haber expirado.";
    statusEl.className = "admin-row-status error";
    return;
  }
  statusEl.textContent = "Guardado ✓";
  statusEl.className = "admin-row-status success";

  const idx = shippingZones.findIndex(z => z.id === id);
  if (idx !== -1) shippingZones[idx] = { ...shippingZones[idx], ...payload };
  setTimeout(() => { statusEl.textContent = ""; }, 2000);
}

async function deleteShippingZone(id) {
  if (!confirm("¿Eliminar esta zona de envío? No se puede deshacer.")) return;

  const { data, error } = await sb.from("shipping_zones").delete().eq("id", id).select();
  if (error || !data || data.length === 0) {
    alert(error ? "Error al eliminar: " + error.message : "No se eliminó: tu sesión puede haber expirado.");
    return;
  }
  shippingZones = shippingZones.filter(z => z.id !== id);
  renderShippingZones();
}

async function handleAddShippingZone(event) {
  event.preventDefault();
  const form = event.target;
  const statusEl = document.getElementById("addZoneStatus");

  const payload = {
    name: form.name.value.trim(),
    cost: Number(form.cost.value)
  };

  statusEl.textContent = "Agregando...";
  statusEl.className = "admin-row-status";

  const { error } = await sb.from("shipping_zones").insert(payload);

  if (error) {
    statusEl.textContent = "Error: " + error.message;
    statusEl.className = "admin-row-status error";
    return;
  }
  statusEl.textContent = "¡Zona agregada!";
  statusEl.className = "admin-row-status success";
  form.reset();
  await loadShippingZones();
  setTimeout(() => { statusEl.textContent = ""; }, 2000);
}

/* ── MÉTRICAS ── */
async function loadMetrics() {
  const statsEl = document.getElementById("adminStats");
  const topEl = document.getElementById("adminTopProducts");
  statsEl.innerHTML = `<p class="admin-loading">Cargando métricas...</p>`;

  const { data, error } = await sb
    .from("events")
    .select("type, page, product_name, query, has_results, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    statsEl.innerHTML = `<p class="admin-row-status error">Todavía no hay datos de métricas (¿falta crear la tabla "events"?).</p>`;
    topEl.innerHTML = `<li class="admin-loading">Todavía no hay datos suficientes.</li>`;
    renderHourlyChart(new Array(24).fill(0));
    allPageViews = [];
    renderWeekdayChart();
    renderTopBarChart([], "adminTopSearches", "searchTermsChartTable");
    return;
  }

  const pageViews = data.filter(e => e.type === "page_view");
  allPageViews = pageViews;
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

  const hourlyCounts = new Array(24).fill(0);
  pageViews.forEach(e => { hourlyCounts[getArgentinaHour(e.created_at)]++; });
  renderHourlyChart(hourlyCounts);

  const counts = {};
  addToCart.forEach(e => {
    const name = e.product_name || "Producto eliminado";
    counts[name] = (counts[name] || 0) + 1;
  });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  renderTopBarChart(ranked, "adminTopProducts", "productsChartTable");

  const searches = data.filter(e => e.type === "search" && e.query);
  const searchStats = {};
  searches.forEach(e => {
    const term = normalizeText(e.query).trim();
    if (!term) return;
    if (!searchStats[term]) searchStats[term] = { count: 0, everHadResults: false };
    searchStats[term].count++;
    // has_results null = búsqueda registrada antes de agregar esta columna;
    // el tracking viejo solo loggeaba búsquedas con resultado, así que null equivale a true.
    if (e.has_results !== false) searchStats[term].everHadResults = true;
  });
  const rankedSearches = Object.entries(searchStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([term, stats]) => [term, stats.count, !stats.everHadResults]);
  renderTopBarChart(rankedSearches, "adminTopSearches", "searchTermsChartTable");

  renderWeekdayChart();
}

/* ── GRÁFICOS (sin librerías externas) ── */

// created_at llega en UTC; Argentina es UTC-3 todo el año (sin horario de verano).
function getArgentinaHour(isoString) {
  const utcDate = new Date(isoString);
  const arDate = new Date(utcDate.getTime() - 3 * 60 * 60 * 1000);
  return arDate.getUTCHours();
}

// weekday: 0=lunes .. 6=domingo (getUTCDay() nativo es 0=domingo, se remapea).
function getArgentinaDateParts(isoString) {
  const utcDate = new Date(isoString);
  const arDate = new Date(utcDate.getTime() - 3 * 60 * 60 * 1000);
  return {
    year: arDate.getUTCFullYear(),
    month: arDate.getUTCMonth(),
    day: arDate.getUTCDate(),
    weekday: (arDate.getUTCDay() + 6) % 7
  };
}

function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

function renderHourlyChart(hourlyCounts) {
  const chartEl = document.getElementById("hourlyChart");
  const labelsEl = document.getElementById("hourlyLabels");
  const tableBody = document.querySelector("#hourlyChartTable tbody");
  if (!chartEl || !labelsEl || !tableBody) return;

  const max = niceMax(Math.max(...hourlyCounts, 0));
  const plotHeight = 140;

  const gridlines = [...new Set([max, Math.round(max / 2)])].map(value => {
    const topPx = Math.round(plotHeight - (plotHeight * value / max));
    return `
      <div class="admin-hourly-gridline" style="top:${topPx}px"></div>
      <div class="admin-hourly-gridline-label" style="top:${topPx}px">${value}</div>
    `;
  }).join("");

  const bars = hourlyCounts.map((count, hour) => {
    const barPx = Math.round(plotHeight * count / max);
    return `
      <div class="admin-hour-col" tabindex="0" data-hour="${hour}" data-count="${count}">
        <div class="admin-hour-bar" style="height:${barPx}px"></div>
      </div>
    `;
  }).join("");

  chartEl.innerHTML = gridlines + bars;

  labelsEl.innerHTML = hourlyCounts.map((count, hour) =>
    `<span class="admin-hour-label-col">${hour % 3 === 0 ? hour + "h" : ""}</span>`
  ).join("");

  chartEl.querySelectorAll(".admin-hour-col").forEach(col => {
    const hour = col.dataset.hour;
    const count = col.dataset.count;
    const showTooltip = event => showChartTooltip(event, `${count} visita${count === "1" ? "" : "s"}`, `${hour}:00 – ${hour}:59`);
    col.addEventListener("mouseenter", showTooltip);
    col.addEventListener("mousemove", showTooltip);
    col.addEventListener("mouseleave", hideChartTooltip);
    col.addEventListener("focus", showTooltip);
    col.addEventListener("blur", hideChartTooltip);
  });

  tableBody.innerHTML = "";
  hourlyCounts.forEach((count, hour) => {
    const tr = document.createElement("tr");
    const tdHour = document.createElement("td");
    tdHour.textContent = `${String(hour).padStart(2, "0")}:00`;
    const tdCount = document.createElement("td");
    tdCount.textContent = String(count);
    tr.append(tdHour, tdCount);
    tableBody.appendChild(tr);
  });
}

// ranked: [name, count, noResults?][] — noResults es opcional (marca el ítem con la badge roja)
function renderTopBarChart(ranked, listElId, tableElId) {
  const topEl = document.getElementById(listElId);
  const tableBody = document.querySelector(`#${tableElId} tbody`);
  if (!topEl || !tableBody) return;

  if (ranked.length === 0) {
    topEl.innerHTML = `<li class="admin-loading">Todavía no hay datos suficientes.</li>`;
    tableBody.innerHTML = "";
    return;
  }

  const max = ranked[0][1];
  topEl.innerHTML = ranked.map(([name, count, noResults]) => `
    <li>
      <span class="admin-top-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
      ${noResults ? `<span class="admin-top-badge" title="Nunca encontró resultados en el catálogo">⚠ Sin resultados</span>` : ""}
      <span class="admin-top-bar-track"><span class="admin-top-bar-fill${noResults ? " admin-top-bar-fill-warn" : ""}" style="width:${Math.round(count / max * 100)}%"></span></span>
      <span class="admin-top-count">${count}</span>
    </li>
  `).join("");

  tableBody.innerHTML = "";
  ranked.forEach(([name, count, noResults]) => {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = name + (noResults ? " (sin resultados)" : "");
    const tdCount = document.createElement("td");
    tdCount.textContent = String(count);
    tr.append(tdName, tdCount);
    tableBody.appendChild(tr);
  });
}

/* ── GRÁFICO DE BARRAS: VISITAS POR DÍA DE LA SEMANA ── */
const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const WEEKDAY_FULL_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const WEEKDAY_PLURAL = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];
let allPageViews = [];
let weekdayMode = "week";

// Algoritmo estándar de semana ISO-8601 (año/semana <-> lunes de esa semana),
// usado como calculadora de calendario pura (sin husos horarios de por medio).
function getIsoWeekInfo(year, month, day) {
  const date = new Date(Date.UTC(year, month, day));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3);
  const week = 1 + Math.round((date - firstThursday) / (7 * 86400000));
  return { isoYear, week };
}

function getMondayOfIsoWeek(isoYear, week) {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayNum = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4.getTime() - jan4DayNum * 86400000);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * 86400000);
}

function getArgentinaNowParts() {
  const arNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return { year: arNow.getUTCFullYear(), month: arNow.getUTCMonth(), day: arNow.getUTCDate() };
}

function defaultWeekdayInputValue(mode) {
  const now = getArgentinaNowParts();
  if (mode === "month") return `${now.year}-${String(now.month + 1).padStart(2, "0")}`;
  const { isoYear, week } = getIsoWeekInfo(now.year, now.month, now.day);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

function setWeekdayMode(mode) {
  weekdayMode = mode;
  document.querySelectorAll(".admin-mode-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
  const input = document.getElementById("weekdayDateInput");
  input.type = mode === "month" ? "month" : "week";
  input.value = defaultWeekdayInputValue(mode);
  renderWeekdayChart();
}

function computeWeekdayCounts() {
  const input = document.getElementById("weekdayDateInput");
  if (!input.value) input.value = defaultWeekdayInputValue(weekdayMode);

  const counts = new Array(7).fill(0);

  if (weekdayMode === "month") {
    const [yearStr, monthStr] = input.value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    allPageViews.forEach(e => {
      const parts = getArgentinaDateParts(e.created_at);
      if (parts.year === year && parts.month === month) counts[parts.weekday]++;
    });
    return { counts, dayDates: null };
  }

  const [yearStr, weekStr] = input.value.split("-W");
  const monday = getMondayOfIsoWeek(Number(yearStr), Number(weekStr));
  const dayDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 86400000);
    dayDates.push({ year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() });
  }
  allPageViews.forEach(e => {
    const parts = getArgentinaDateParts(e.created_at);
    const idx = dayDates.findIndex(d => d.year === parts.year && d.month === parts.month && d.day === parts.day);
    if (idx !== -1) counts[idx]++;
  });
  return { counts, dayDates };
}

function renderWeekdayChart() {
  const chartEl = document.getElementById("weekdayChart");
  const labelsEl = document.getElementById("weekdayLabels");
  const tableBody = document.querySelector("#weekdayChartTable tbody");
  if (!chartEl || !labelsEl || !tableBody) return;

  const { counts, dayDates } = computeWeekdayCounts();
  const max = niceMax(Math.max(...counts, 0));
  const plotHeight = 140;

  const gridlines = [...new Set([max, Math.round(max / 2)])].map(value => {
    const topPx = Math.round(plotHeight - (plotHeight * value / max));
    return `
      <div class="admin-hourly-gridline" style="top:${topPx}px"></div>
      <div class="admin-hourly-gridline-label" style="top:${topPx}px">${value}</div>
    `;
  }).join("");

  const bars = counts.map((count, idx) => `
    <div class="admin-hour-col" tabindex="0" data-idx="${idx}" data-count="${count}">
      <div class="admin-hour-bar" style="height:${Math.round(plotHeight * count / max)}px"></div>
    </div>
  `).join("");

  chartEl.innerHTML = gridlines + bars;
  labelsEl.innerHTML = WEEKDAY_LABELS.map(label => `<span class="admin-hour-label-col">${label}</span>`).join("");

  chartEl.querySelectorAll(".admin-hour-col").forEach(col => {
    const idx = Number(col.dataset.idx);
    const count = col.dataset.count;
    const labelText = dayDates
      ? `${WEEKDAY_FULL_NAMES[idx]} ${dayDates[idx].day}/${dayDates[idx].month + 1}`
      : `todos los ${WEEKDAY_PLURAL[idx]} del mes`;
    const showTooltip = event => showChartTooltip(event, `${count} visita${count === "1" ? "" : "s"}`, labelText);
    col.addEventListener("mouseenter", showTooltip);
    col.addEventListener("mousemove", showTooltip);
    col.addEventListener("mouseleave", hideChartTooltip);
    col.addEventListener("focus", showTooltip);
    col.addEventListener("blur", hideChartTooltip);
  });

  tableBody.innerHTML = "";
  counts.forEach((count, idx) => {
    const tr = document.createElement("tr");
    const tdDay = document.createElement("td");
    tdDay.textContent = dayDates ? `${WEEKDAY_LABELS[idx]} ${dayDates[idx].day}/${dayDates[idx].month + 1}` : WEEKDAY_LABELS[idx];
    const tdCount = document.createElement("td");
    tdCount.textContent = String(count);
    tr.append(tdDay, tdCount);
    tableBody.appendChild(tr);
  });
}

/* ── TOOLTIP COMPARTIDO ── */
function showChartTooltip(event, valueText, labelText) {
  const tooltip = document.getElementById("adminChartTooltip");
  if (!tooltip) return;
  tooltip.innerHTML = "";
  const strong = document.createElement("strong");
  strong.textContent = valueText;
  tooltip.append(strong, document.createTextNode(" — " + labelText));
  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY - 12}px`;
  tooltip.classList.add("visible");
}

function hideChartTooltip() {
  document.getElementById("adminChartTooltip")?.classList.remove("visible");
}

/* ── TOGGLE GRÁFICO / TABLA ── */
const CHART_TOGGLE_TARGETS = {
  hourly: { chart: "hourlyChartWrap", table: "hourlyChartTable" },
  products: { chart: "adminTopProducts", table: "productsChartTable" },
  searchTerms: { chart: "adminTopSearches", table: "searchTermsChartTable" },
  weekday: { chart: "weekdayChartWrap", table: "weekdayChartTable" }
};

function toggleChartTable(kind) {
  const target = CHART_TOGGLE_TARGETS[kind];
  const chartEl = document.getElementById(target.chart);
  const tableEl = document.getElementById(target.table);
  const btn = chartEl.closest(".admin-chart-card").querySelector(".admin-chart-table-toggle");
  const showingTable = tableEl.style.display !== "none";
  tableEl.style.display = showingTable ? "none" : "table";
  chartEl.style.display = showingTable ? "" : "none";
  btn.textContent = showingTable ? "Ver como tabla" : "Ver como gráfico";
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
          <select class="admin-category" aria-label="Categoría" onchange="handleCostInput(${p.id})">${categoryOptions}</select>
          <input type="number" class="admin-cost" value="${p.cost_price ?? ""}" placeholder="Costo ($)" min="0" step="1" aria-label="Costo" oninput="handleCostInput(${p.id})">
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
  const costVal = editRow.querySelector(".admin-cost").value;

  const payload = {
    emoji: editRow.querySelector(".admin-emoji").value.trim(),
    name: editRow.querySelector(".admin-name").value.trim(),
    brand: editRow.querySelector(".admin-brand").value.trim() || null,
    category: editRow.querySelector(".admin-category").value,
    cost_price: costVal === "" ? null : Number(costVal),
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
    cost_price: form.cost.value === "" ? null : Number(form.cost.value),
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
    await loadPriceSettings();
    renderCategoryMarkupInputs();
    loadAdminProducts();
    loadMetrics();
    loadShippingZones();
  } else {
    showLoggedOut();
  }
});
