const PRODUCTS = [
  // PRODUCTOS NATURALES
  { id: 1, name: "Polen Reconvertido", brand: "Crinway", category: "naturales", emoji: "🌸", description: "Polen de abeja reconvertido, altamente biodisponible. Ideal para energía y defensas.", featured: true },
  { id: 2, name: "Yacón", brand: "Crinway", category: "naturales", emoji: "🌱", description: "Endulzante natural de bajo índice glucémico. Beneficioso para la digestión.", featured: false },
  { id: 3, name: "Quino", brand: "Crinway", category: "naturales", emoji: "🌿", description: "Producto natural Crinway de alta calidad.", featured: false },
  { id: 4, name: "Propóleo", brand: "Noble Apicultor", category: "naturales", emoji: "🍯", description: "Propóleo puro, antibacteriano y antiviral natural. Ideal para el sistema inmune.", featured: true },
  { id: 5, name: "Fegatol", brand: "Provitality", category: "naturales", emoji: "💚", description: "Suplemento natural para el apoyo hepático.", featured: false },
  { id: 6, name: "Tintura Madre", brand: "Andino", category: "naturales", emoji: "🌿", description: "Tinturas madre de hierbas medicinales seleccionadas.", featured: false },
  { id: 7, name: "Ginkgo Biloba", brand: "Oasis", category: "naturales", emoji: "🍃", description: "Tintura madre de Ginkgo Biloba. Favorece la circulación y memoria.", featured: true },
  { id: 8, name: "Isoflavonas y Colágeno", brand: "Garden House", category: "naturales", emoji: "✨", description: "Combinación de isoflavonas y colágeno para la mujer.", featured: false },
  { id: 9, name: "Jugo de Aloe Vera", brand: "Natiel", category: "naturales", emoji: "🌵", description: "Jugo puro de aloe vera. Depurativo y digestivo.", featured: true },
  { id: 10, name: "Clorofila", brand: "", category: "naturales", emoji: "🥬", description: "Clorofila líquida. Desintoxicante y alcalinizante natural.", featured: false },
  { id: 11, name: "Jugo de Arándano", brand: "Cabañas Mico", category: "naturales", emoji: "🫐", description: "Jugo de arándano natural. Antioxidante y beneficioso para el tracto urinario.", featured: false },
  { id: 12, name: "Graviola", brand: "", category: "naturales", emoji: "🌺", description: "Extracto de graviola natural.", featured: false },
  { id: 13, name: "Graviola + Noni", brand: "Prodenza", category: "naturales", emoji: "🌺", description: "Combinación potente de graviola y noni. Antioxidante y fortalecedor del sistema inmune.", featured: false },

  // PANIFICADOS Y DULCES
  { id: 14, name: "Pan Casero", brand: "Elaboración propia", category: "panificados", emoji: "🍞", description: "Pan artesanal elaborado con ingredientes seleccionados. De campo, de molde o con semillas. Pedido con 24 hs.", featured: true },
  { id: 15, name: "Budín Dulce", brand: "Elaboración propia", category: "panificados", emoji: "🍰", description: "Budines caseros sin conservantes. Sabores: banana, zanahoria, vainilla. Pedido con 24 hs.", featured: true },
  { id: 16, name: "Bizcochuelo", brand: "Elaboración propia", category: "panificados", emoji: "🎂", description: "Bizcochuelo esponjoso casero con variantes de temporada. Pedido con 24 hs.", featured: false },
  { id: 17, name: "Granola Artesanal", brand: "Elaboración propia", category: "panificados", emoji: "🌾", description: "Granola casera con miel, frutos secos y semillas. Sin conservantes.", featured: true },
  { id: 18, name: "Mermelada Casera", brand: "Elaboración propia", category: "panificados", emoji: "🫙", description: "Mermeladas endulzadas con miel o stevia. Sin conservantes artificiales.", featured: false },
  { id: 19, name: "Barritas de Cereal", brand: "Elaboración propia", category: "panificados", emoji: "🍫", description: "Barritas artesanales con avena, miel y frutas secas. Por encargo.", featured: false },

  // FERMENTADOS
  { id: 20, name: "Yogur Probiótico", brand: "Elaboración propia", category: "fermentados", emoji: "🥛", description: "Yogur casero con cultivos probióticos activos. Pedido previo 48 hs. Requiere frío.", featured: false },
  { id: 21, name: "Chucrut Artesanal", brand: "Elaboración propia", category: "fermentados", emoji: "🥬", description: "Chucrut fermentado naturalmente. Excelente para la salud digestiva.", featured: false },

  // PASTAS FRESCAS
  { id: 22, name: "Tallarines Frescos", brand: "Elaboración propia", category: "pastas", emoji: "🍝", description: "Tallarines frescos de masa artesanal. Disponibles en harina común o semolín. Por encargo.", featured: false },
  { id: 23, name: "Fideos de Colores", brand: "Elaboración propia", category: "pastas", emoji: "🌈", description: "Fideos frescos con espinaca, remolacha o zanahoria. Coloridos y nutritivos.", featured: false },
  { id: 24, name: "Ñoquis Frescos", brand: "Elaboración propia", category: "pastas", emoji: "🥔", description: "Ñoquis artesanales de papa, zapallo o remolacha. Por encargo.", featured: false },

  // VIANDAS
  { id: 25, name: "Pollo al Horno con Vegetales", brand: "Consultar disponibilidad", category: "viandas", emoji: "🍗", description: "Pollo al horno con vegetales de estación. Casero, sin conservantes. Reserva 48 hs antes.", featured: false },
  { id: 26, name: "Guiso de Lentejas", brand: "Consultar disponibilidad", category: "viandas", emoji: "🍲", description: "Guiso casero de lentejas con arroz y verduras. Nutritivo y reconfortante. Reserva 48 hs.", featured: false },
];

const CATEGORY_LABELS = {
  naturales: "Productos naturales",
  panificados: "Panificados y dulces",
  fermentados: "Fermentados",
  pastas: "Pastas frescas",
  viandas: "Viandas"
};
