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
  // I y S: según las láminas del alfabeto que compartió el equipo.
  { id: "i", glosa: "I", significado: "Letra I", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Puño cerrado con el meñique extendido hacia arriba y el pulgar sobre los dedos doblados", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: [], video: "/videos/i.mp4" },
  { id: "s", glosa: "S", significado: "Letra S", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Puño cerrado con el pulgar cruzado por delante de los dedos", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: ["Pulgar al costado, pegado al índice (esa es la A)"], video: "/videos/s.mp4" },
  { id: "hola", glosa: "HOLA", significado: "Saludo", unidadId: "2", tipo: "dinamica",
    descripcion: { configuracionMano: "Cuatro dedos extendidos y juntos, con el pulgar pegado a la palma", ubicacion: "Iniciá junto a la frente y completá el saludo hacia afuera", orientacion: "Seguí la orientación y el movimiento del avatar" },
    erroresComunes: [], video: "/videos/hola.mp4" },
  ...([
    ["buenos-dias", "BUENOS DÍAS", "2", "dinamica", "27"],
    ["buenas-tardes", "BUENAS TARDES", "2", "dinamica", "27"],
    ["adios", "ADIÓS", "2", "dinamica", "21"],
    ["tu", "TÚ", "3", "ubicacion", "29"],
    ["gracias", "GRACIAS", "4", "dinamica", "22"],
  ] as const).map(([id, glosa, unidadId, tipo, pagina]): Sign => ({
    id, glosa, significado: glosa, unidadId, tipo, pagina,
    descripcion: id === "adios" ? {
      configuracionMano: "Mano abierta con los dedos extendidos, como en el avatar",
      ubicacion: "Al costado de la cabeza; mantené ambos hombros visibles para evaluar la ubicación",
      orientacion: "Palma hacia adelante con los cambios de orientación del movimiento de referencia",
    } : id === "buenos-dias" ? {
      configuracionMano: "Iniciá con el pulgar arriba y los otros dedos cerrados; después formá ambos puños",
      ubicacion: "Frente al cuerpo: cruzá los antebrazos y luego abrilos, como muestra el avatar",
      orientacion: "Seguí la orientación de las manos durante el cruce y la apertura",
    } : id === "buenas-tardes" ? {
      configuracionMano: "Iniciá con el pulgar arriba y los otros dedos cerrados; después extendé la mano",
      ubicacion: "Frente al cuerpo, con el cambio de posición que muestra el avatar",
      orientacion: "Pasá a la mano extendida con la palma hacia abajo, siguiendo el video de referencia",
    } : id === "gracias" ? {
      // Lo observable en el video de referencia del equipo; pendiente de validación LESSA.
      configuracionMano: "Ambas manos abiertas, con los dedos extendidos",
      ubicacion: "A los costados del cuerpo, a la altura de los hombros",
      orientacion: "Subí y bajá ambas manos a la vez, como muestra el avatar",
    } : {
      configuracionMano: "Referencia LESSA pendiente de revisión con el equipo",
      ubicacion: "Consultar la ubicación en el material de referencia",
      orientacion: "Consultar la orientación en el material de referencia",
    },
    erroresComunes: [], video: `/videos/${id}.mp4`,
  })),
];

export const STATIC_SIGN_IDS = SIGNS.filter(s => s.tipo === "estatica").map(s => s.id);

export const UNITS: Unit[] = [
  { id: "1", nombre: "Unidad 1: Letras", descripcion: "A, B, C, I y S", signIds: ["a", "b", "c", "i", "s"] },
  { id: "2", nombre: "Unidad 2: Saludos", descripcion: "Hola, buenos días, buenas tardes y adiós", signIds: ["hola", "buenos-dias", "buenas-tardes", "adios"] },
  { id: "3", nombre: "Unidad 3: Presentación", descripcion: "Tú", signIds: ["tu"] },
  { id: "4", nombre: "Unidad 4: Cortesía", descripcion: "Gracias", signIds: ["gracias"] },
];

export const getSign = (id: string) => SIGNS.find(s => s.id === id);
export const getUnit = (id: string) => UNITS.find(u => u.id === id);
