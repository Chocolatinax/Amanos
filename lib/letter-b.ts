import { MIN_SAMPLES, score, validVec, type SampleSet } from "./classifier";
import type { Vec } from "./features";

export function evaluateB(vec: Vec | null, reference?: SampleSet) {
  const no = (feedback: string, similarity = 0) => ({ accepted: false, similarity, feedback });
  if (!vec || !validVec(vec)) return no("Mostrá una sola mano completa, con buena luz.");
  if (!reference || reference.signId !== "b" || reference.samples.length < MIN_SAMPLES) return no("Cargando la referencia de B…");
  const distance = (v: Vec, a: number, b: number) => Math.hypot(...[0, 1, 2].map(k => v[a * 3 + k] - v[b * 3 + k]));
  const similarity = score(vec, reference);
  for (const i of [5, 9, 13, 17]) {
    const a = [0, 1, 2].map(k => vec[i * 3 + k] - vec[(i + 1) * 3 + k]);
    const b = [0, 1, 2].map(k => vec[(i + 3) * 3 + k] - vec[(i + 1) * 3 + k]);
    const bend = a.reduce((s, x, k) => s + x * b[k], 0) / Math.max(1e-8, Math.hypot(...a) * Math.hypot(...b));
    if (bend > -.6) return no("Extendé los cuatro dedos para formar B.", Math.min(89, similarity));
  }
  const thumbError = Math.min(...reference.samples.map(v => Math.hypot(...[5, 9, 17].map(i => distance(vec, 4, i) - distance(v, 4, i))) / Math.sqrt(3)));
  if (Math.min(distance(vec, 4, 5), distance(vec, 4, 9)) > .9 || thumbError > .2) return no("Doblá el pulgar sobre la palma; no lo dejés hacia afuera.", Math.min(89, similarity));
  if (distance(vec, 8, 20) > Math.max(...reference.samples.map(v => distance(v, 8, 20))) + .18) return no("Juntá los cuatro dedos, como en B.", Math.min(89, similarity));
  if (similarity < 90) return no("Compará la forma y orientación de B con el avatar.", similarity);
  return { accepted: true, similarity, feedback: "La forma coincide con B. ¡Sostenela un segundo!" };
}
