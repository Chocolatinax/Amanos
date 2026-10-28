// Catálogo mínimo que la API necesita (ids de señas y unidades). La fuente de verdad del contenido es lib/signs.ts del front;
// test/gamification.spec.ts verifica que ambas listas coincidan.
export const UNITS = [
  { id: "1", nombre: "Unidad 1: Letras", signIds: ["a", "b", "c", "i", "s"] },
  { id: "2", nombre: "Unidad 2: Saludos", signIds: ["hola", "buenos-dias", "buenas-tardes", "adios"] },
  { id: "3", nombre: "Unidad 3: Presentación", signIds: ["tu"] },
  { id: "4", nombre: "Unidad 4: Cortesía", signIds: ["gracias"] },
];
export const SIGN_IDS = UNITS.flatMap(u => u.signIds);
export const isSignId = (id: string) => SIGN_IDS.includes(id);
export const PLANS = [
  { id: "mensual", nombre: "Plus mensual", precio: 5, moneda: "USD", intervalo: "mes" },
  { id: "anual", nombre: "Plus anual", precio: 45, moneda: "USD", intervalo: "año", etiqueta: "Ahorrá 25%" },
] as const;
