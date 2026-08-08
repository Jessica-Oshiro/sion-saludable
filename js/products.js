const CATEGORY_LABELS = {
  naturales: "Productos naturales",
  panificados: "Panificados y dulces",
  fermentados: "Fermentados",
  pastas: "Pastas frescas",
  viandas: "Viandas"
};

let PRODUCTS = [];

async function loadProducts() {
  // Nunca pedir cost_price acá: es información confidencial de costos que
  // no debe quedar expuesta en la API pública del sitio.
  const { data, error } = await sb
    .from("products")
    .select("id, name, brand, category, emoji, description, price, featured, orderable")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error cargando productos:", error);
    PRODUCTS = [];
    return;
  }
  PRODUCTS = data;
}
