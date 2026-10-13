// Diccionario v0 para la demo: 10 señas ESTÁTICAS (solo forma de mano).
// Reemplazar glosas/descripciones con lo que confirme alguien que sepa LESSA.
export type Sign = {
  id: string;
  glosa: string;
  significado: string;
  unidadId: string;
  tipo: "estatica" | "dinamica";
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
  { id: "l", glosa: "L", significado: "Letra L", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Índice hacia arriba y pulgar hacia el lado, el resto cerrado", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: ["Pulgar poco abierto"], video: "/videos/l.mp4" },
  { id: "v", glosa: "V", significado: "Letra V", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Índice y medio extendidos y separados, el resto cerrado", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: ["Dedos juntos (parece U)"], video: "/videos/v.mp4" },
  { id: "y", glosa: "Y", significado: "Letra Y", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Pulgar y meñique extendidos, el resto cerrado", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: ["Índice medio extendido"], video: "/videos/y.mp4" },
  { id: "uno", glosa: "1", significado: "Número uno", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Índice extendido hacia arriba, el resto cerrado", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: ["Pulgar abierto (parece L)"], video: "/videos/uno.mp4" },
  { id: "tres", glosa: "3", significado: "Número tres", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Pulgar, índice y medio extendidos", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: ["Usar anular en vez de pulgar"], video: "/videos/tres.mp4" },
  { id: "cinco", glosa: "5", significado: "Número cinco", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Mano abierta, cinco dedos extendidos y separados", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: ["Dedos juntos (parece B)"], video: "/videos/cinco.mp4" },
  { id: "te-amo", glosa: "TE-AMO", significado: "Te amo", unidadId: "1", tipo: "estatica",
    descripcion: { configuracionMano: "Pulgar, índice y meñique extendidos, medio y anular doblados", ubicacion: "Frente al pecho", orientacion: "Palma hacia adelante" },
    erroresComunes: ["Pulgar doblado (parece cuernos)"], video: "/videos/te-amo.mp4" },
];

export const UNITS: Unit[] = [
  { id: "1", nombre: "Unidad 1: Alfabeto y números", descripcion: "10 señas estáticas para arrancar.", signIds: SIGNS.map(s => s.id) },
  { id: "2", nombre: "Unidad 2: Saludos", descripcion: "Próximamente", signIds: [] },
  { id: "3", nombre: "Unidad 3: Familia", descripcion: "Próximamente", signIds: [] },
];

export const getSign = (id: string) => SIGNS.find(s => s.id === id);
export const getUnit = (id: string) => UNITS.find(u => u.id === id);
