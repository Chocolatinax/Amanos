// Vocabulario de la demo. Las referencias LESSA requieren revisión humana.
// Reemplazar glosas/descripciones con lo que confirme alguien que sepa LESSA.
export type Sign = {
  id: string;
  glosa: string;
  significado: string;
  unidadId: string;
  tipo: "estatica" | "dinamica" | "ubicacion";
  pagina?: string;
  descripcion: { configuracionMano: string; ubicacion: string; orientacion: string };
  erroresComunes: string[];
  video: string; // ruta en /public/videos
};

export type Unit = { id: string; nombre: string; descripcion: string; signIds: string[] };

export const SIGNS: Sign[] = [
  { id: "a", glosa: "A", significado: "Letra A", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Puño cerrado con el pulgar al costado, pegado al índice", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: ["Pulgar cruzado sobre los dedos", "Puño muy inclinado"], video: "/videos/a.mp4" },
  { id: "b", glosa: "B", significado: "Letra B", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Cuatro dedos extendidos y juntos, pulgar doblado sobre la palma", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: ["Dedos separados", "Pulgar hacia afuera"], video: "/videos/b.mp4" },
  { id: "c", glosa: "C", significado: "Letra C", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Mano curva formando una C", ubicacion: "Frente al pecho", orientacion: "Palma hacia el lado" },
    erroresComunes: ["C demasiado cerrada (parece O)"], video: "/videos/c.mp4" },
  { id: "hola", glosa: "HOLA", significado: "Saludo", unidadId: "2", tipo: "dinamica",
    descripcion: { configuracionMano: "Observá la forma de la mano en el video", ubicacion: "Observá la posición inicial y final en el video", orientacion: "Seguí la orientación y el movimiento del video" },
    erroresComunes: [], video: "/videos/hola.mp4" },
  ...([
    ["buenos-dias", "BUENOS DÍAS", "2", "dinamica", "27"],
    ["buenas-tardes", "BUENAS TARDES", "2", "dinamica", "27"],
    ["adios", "ADIÓS", "2", "dinamica", "21"],
    ["yo", "YO", "3", "ubicacion", "29"],
    ["tu", "TÚ", "3", "ubicacion", "29"],
    ["mucho-gusto", "MUCHO GUSTO", "3", "dinamica", "25"],
    ["gracias", "GRACIAS", "4", "dinamica", "22"],
  ] as const).map(([id, glosa, unidadId, tipo, pagina]): Sign => ({
    id, glosa, significado: glosa, unidadId, tipo, pagina,
    descripcion: {
      configuracionMano: "Referencia LESSA pendiente de revisión con el equipo",
      ubicacion: "Consultar la ubicación en el material de referencia",
      orientacion: "Consultar la orientación en el material de referencia",
    },
    erroresComunes: [], video: `/videos/${id}.mp4`,
  })),
];

export const STATIC_SIGN_IDS = SIGNS.filter(s => s.tipo === "estatica").map(s => s.id);

export const UNITS: Unit[] = [
  { id: "1", nombre: "Unidad 1: Letras", descripcion: "A, B y C · páginas 12–20", signIds: ["a", "b", "c"] },
  { id: "2", nombre: "Unidad 2: Saludos", descripcion: "Hola, buenos días, buenas tardes y adiós", signIds: ["hola", "buenos-dias", "buenas-tardes", "adios"] },
  { id: "3", nombre: "Unidad 3: Presentación", descripcion: "Yo, tú y mucho gusto", signIds: ["yo", "tu", "mucho-gusto"] },
  { id: "4", nombre: "Unidad 4: Cortesía", descripcion: "Gracias", signIds: ["gracias"] },
];

export const getSign = (id: string) => SIGNS.find(s => s.id === id);
export const getUnit = (id: string) => UNITS.find(u => u.id === id);
