import { MIN_SAMPLES, distanceToSet, score, validVec, type SampleSet } from "./classifier";
import type { Vec } from "./features";

/** Letras sin evaluador propio de forma: I (meñique arriba) y S (pulgar cruzado por delante). */
export const LETTER_RIVALS: Record<string, string[]> = { i: [], s: ["a"] };
const NAMES: Record<string, string> = { i: "I", s: "S", a: "A" };
const HINTS: Record<string, string> = {
  i: "Cerrá el puño y extendé solo el meñique hacia arriba.",
  s: "Cerrá el puño y cruzá el pulgar por delante de los dedos.",
};
const point = (v: Vec, i: number) => [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function evaluateLetter(vec: Vec | null, id: "i" | "s", sets: SampleSet[]) {
  const no = (feedback: string, similarity = 0) => ({ accepted: false, similarity, feedback });
  const name = NAMES[id];
  if (!vec || !validVec(vec)) return no("Mostrá una sola mano completa, con buena luz.");
  const reference = sets.find(s => s.signId === id);
  if (!reference || reference.samples.length < MIN_SAMPLES) return no(`Cargando la referencia de ${name}…`);
  const similarity = score(vec, reference);
  if (id === "i") {
    // El meñique tiene que ser el dedo más extendido: punta lejos de su nudillo comparado con el índice.
    const pinky = dist(point(vec, 20), point(vec, 17)), index = dist(point(vec, 8), point(vec, 5));
    if (pinky < index * 1.3) return no(HINTS.i, Math.min(89, similarity));
  }
  // Si la pose está tan cerca de una letra vecina (S frente a A) como de la pedida, no se aprueba.
  // Se comparan distancias, no la similitud: la similitud se satura en 100 y puede empatar.
  const own = distanceToSet(vec, reference);
  for (const rival of LETTER_RIVALS[id]) {
    const set = sets.find(s => s.signId === rival);
    if (set && set.samples.length >= MIN_SAMPLES && distanceToSet(vec, set) - own < .2) return no(`Se parece más a ${NAMES[rival]}. ${HINTS[id]}`, Math.min(89, similarity));
  }
  if (similarity < 90) return no(`Compará con la referencia: ${HINTS[id].charAt(0).toLowerCase()}${HINTS[id].slice(1)}`, similarity);
  return { accepted: true, similarity, feedback: `La forma coincide con ${name}. ¡Sostenela un segundo!` };
}
