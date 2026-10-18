import { MIN_SAMPLES, score, validVec, type SampleSet } from "./classifier";
import type { Vec } from "./features";

/** Prototype verifier for the supplied A clip; scores describe reference similarity. */
export function evaluateA(vec: Vec | null, reference?: SampleSet) {
  const reject = (feedback: string, similarity = 0) => ({ accepted: false, similarity, feedback });
  if (!vec || !validVec(vec)) return reject("Mostrá una sola mano completa, con buena luz.");
  if (!reference || reference.signId !== "a" || reference.samples.length < MIN_SAMPLES) return reject("Cargando la referencia de A…");
  const p = (i: number) => vec.slice(i * 3, i * 3 + 3);
  const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
  const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
  const similarity = score(vec, reference);
  for (const [base, joint, tip] of [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]]) {
    const a = sub(p(base), p(joint)), b = sub(p(tip), p(joint));
    const length = Math.hypot(...a) * Math.hypot(...b);
    if (length < 1e-6 || dot(a, b) / length < 0) return reject("Cerrá los cuatro dedos para formar el puño de A.", Math.min(similarity, 89));
  }
  const lateral = sub(p(5), p(17));
  const width = dot(lateral, lateral);
  if (width < 1e-6) return reject("Acercá la mano y mejorá la luz.");
  const thumbSide = dot(sub(p(4), p(5)), lateral) / width;
  if (thumbSide < 0.15) return reject("Dejá el pulgar al costado del índice, sin cruzarlo sobre el puño.", Math.min(similarity, 89));
  if (thumbSide > 1.8) return reject("Acercá el pulgar al costado del puño.", Math.min(similarity, 89));
  if (similarity < 90) return reject("Compará con el avatar: ajustá el pulgar y la orientación del puño.", similarity);
  return { accepted: true, similarity, feedback: "La forma coincide con A. ¡Sostenela un segundo!" };
}
