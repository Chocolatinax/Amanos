import { MIN_SAMPLES, score, validVec, type SampleSet } from "./classifier";
import type { Vec } from "./features";
export function evaluateC(vec: Vec | null, reference?: SampleSet) {
  const no = (feedback: string, similarity = 0) => ({ accepted: false, similarity, feedback });
  if (!vec || !validVec(vec)) return no("Mostrá una sola mano completa, con buena luz.");
  if (!reference || reference.signId !== "c" || reference.samples.length < MIN_SAMPLES) return no("Cargando la referencia de C…");
  const similarity = score(vec, reference);
  const gap = Math.hypot(...[0, 1, 2].map(k => vec[12 + k] - vec[24 + k]));
  if (gap < .6) return no("Separá el pulgar del índice: dejá abierta la curva de C.", Math.min(89, similarity));
  if (gap > 2.1) return no("Curvá los dedos y acercá el pulgar para formar C.", Math.min(89, similarity));
  if (similarity < 90) return no("Compará con el avatar: revisá la curva de los dedos y la orientación de C.", similarity);
  return { accepted: true, similarity, feedback: "La forma coincide con C. ¡Sostenela un segundo!" };
}
