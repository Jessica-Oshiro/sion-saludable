export const CATEGORIES = ["Productos naturales", "Panificados", "Fermentados", "Pastas frescas", "Viandas"];

export const PRODUCTS = [
  { id: "p1", category: "Productos naturales", emoji: "🍯", name: "Miel pura de abeja", brand: "Sión Saludable", desc: "Miel de flores silvestres, cosechada en pequeños apiarios del interior bonaerense.", orderable: true },
  { id: "p2", category: "Productos naturales", emoji: "🥥", name: "Aceite de coco extra virgen", brand: "Sión Saludable", desc: "Prensado en frío, ideal para cocinar y para el cuidado de la piel.", orderable: true },
  { id: "p3", category: "Productos naturales", emoji: "🌿", name: "Yerba mate orgánica", brand: "Sión Saludable", desc: "Sin agroquímicos, secada a leña como se hacía antes.", orderable: true },
  { id: "p4", category: "Productos naturales", emoji: "🌱", name: "Semillas de chía", brand: "Sión Saludable", desc: "Ricas en omega 3 y fibra, para sumar a tus comidas de cada día.", orderable: true },
  { id: "p5", category: "Productos naturales", emoji: "🍠", name: "Dulce de batata sin azúcar", brand: "Sión Saludable", desc: "Endulzado solo con la dulzura natural de la batata.", orderable: true },
  { id: "p6", category: "Panificados", emoji: "🍞", name: "Pan integral de masa madre", brand: "Sión Saludable", desc: "Fermentación lenta de 24 horas, miga húmeda y corteza crocante.", orderable: true },
  { id: "p7", category: "Panificados", emoji: "🥖", name: "Pan sin TACC de semillas", brand: "Sión Saludable", desc: "Elaborado en espacio libre de contaminación cruzada.", orderable: true },
  { id: "p8", category: "Panificados", emoji: "🥕", name: "Budín de zanahoria y nuez", brand: "Sión Saludable", desc: "Húmedo, especiado y con un toque de miel de la casa.", orderable: true },
  { id: "p9", category: "Panificados", emoji: "🍪", name: "Galletitas de avena y coco", brand: "Sión Saludable", desc: "Sin azúcar refinada, ideales para acompañar el mate.", orderable: true },
  { id: "p10", category: "Panificados", emoji: "🧈", name: "Scones integrales", brand: "Sión Saludable", desc: "Recién horneados, tiernos por dentro y dorados por fuera.", orderable: true },
  { id: "p11", category: "Fermentados", emoji: "🍵", name: "Kombucha de jengibre", brand: "Sión Saludable", desc: "Fermentación artesanal con cultivo madre propio.", orderable: true },
  { id: "p12", category: "Fermentados", emoji: "🥬", name: "Chucrut casero", brand: "Sión Saludable", desc: "Repollo fermentado naturalmente, rico en probióticos.", orderable: true },
  { id: "p13", category: "Fermentados", emoji: "💧", name: "Kéfir de agua", brand: "Sión Saludable", desc: "Refrescante y liviano, con cultivos vivos.", orderable: true },
  { id: "p14", category: "Fermentados", emoji: "🥛", name: "Kéfir de leche", brand: "Sión Saludable", desc: "Cremoso y suave, elaborado con leche de tambos locales.", orderable: true },
  { id: "p15", category: "Fermentados", emoji: "🌶️", name: "Kimchi casero", brand: "Sión Saludable", desc: "Picante justo, fermentado varias semanas para más sabor.", orderable: true },
  { id: "p16", category: "Pastas frescas", emoji: "🥔", name: "Ñoquis de batata", brand: "Sión Saludable", desc: "Amasados a mano con batata asada y un toque de nuez moscada.", orderable: true },
  { id: "p17", category: "Pastas frescas", emoji: "🥟", name: "Ravioles de verdura", brand: "Sión Saludable", desc: "Relleno de acelga, ricota y espinaca de estación.", orderable: true },
  { id: "p18", category: "Pastas frescas", emoji: "🎃", name: "Sorrentinos de calabaza y queso", brand: "Sión Saludable", desc: "Masa fina, relleno cremoso, sabor a otoño.", orderable: true },
  { id: "p19", category: "Pastas frescas", emoji: "🍝", name: "Tallarines integrales", brand: "Sión Saludable", desc: "Con harina integral molida a la piedra.", orderable: true },
  { id: "p20", category: "Viandas", emoji: "🍱", name: "Vianda vegetariana del día", brand: "Sión Saludable", desc: "Menú rotativo semanal, siempre fresco y de estación.", orderable: false },
  { id: "p21", category: "Viandas", emoji: "🍲", name: "Guiso de lentejas", brand: "Sión Saludable", desc: "Reconfortante, con vegetales orgánicos y especias suaves.", orderable: false },
  { id: "p22", category: "Viandas", emoji: "🥧", name: "Tarta de acelga y puerro", brand: "Sión Saludable", desc: "Masa casera integral, relleno abundante.", orderable: false },
  { id: "p23", category: "Viandas", emoji: "🥗", name: "Bowl de quinoa y vegetales asados", brand: "Sión Saludable", desc: "Completo, liviano y lleno de color.", orderable: false }
];

export function buildWhatsAppOrderUrl(phone, items) {
  const lines = items.map(function (it) { return "- " + it.name + " x" + it.qty; });
  const text = "Hola! Quiero hacer un pedido:\n" + lines.join("\n") + "\n\n¿Me confirman disponibilidad y precio? Gracias!";
  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
}

export function buildWhatsAppQueryUrl(phone, productName) {
  const text = "Hola! Quería consultar disponibilidad de: " + productName;
  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
}
