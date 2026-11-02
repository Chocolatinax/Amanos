import { MIN_SAMPLES, validVec, type SampleSet } from "./classifier";
import type { Vec } from "./features";

// Letras de puño (A, S, I): se califican por la forma, medida respecto a la propia palma. Esas medidas no cambian si la
// mano está junto a la cara o frente al pecho. La similitud kNN no sirve acá: la A real daba 59 contra una referencia de
// otro clip y la S daba 62. Umbrales medidos en los videos del equipo (una sola persona: falta validar con más gente).
const point = (v: Vec, i: number) => v.slice(i * 3, i * 3 + 3);
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]);
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const clip = (x: number) => Math.max(0, Math.min(1, x));
const FINGERS = { index: [5, 6, 8], middle: [9, 10, 12], ring: [13, 14, 16], pinky: [17, 18, 20] } as const;

/** Coseno en el nudillo medio: cerca de -1 el dedo está recto, positivo está doblado. */
export function fingerBend(v: Vec, finger: keyof typeof FINGERS) {
  const [base, joint, tip] = FINGERS[finger];
  const a = sub(point(v, base), point(v, joint)), b = sub(point(v, tip), point(v, joint));
  return dot(a, b) / Math.max(1e-8, Math.hypot(...a) * Math.hypot(...b));
}
/** Pulgar a lo ancho de la palma, en anchos de palma: positivo hacia afuera del índice, negativo cruzado por delante. */
export function thumbSide(v: Vec) {
  const axis = sub(point(v, 5), point(v, 17));
  return dot(sub(point(v, 4), point(v, 5)), axis) / Math.max(1e-8, dot(axis, axis));
}
// De 0 a 1: el valor llega a 1 en el umbral, sin escalones, para que el porcentaje no se quede pegado cerca de la meta.
const closed = (bend: number) => clip((bend + .6) / .4);
const straight = (bend: number) => clip((-.2 - bend) / .4);

const reply = (feedback: string, similarity: number, accepted = false) => ({ feedback, similarity, accepted });
function ready(vec: Vec | null, reference: SampleSet | undefined, id: string, name: string): string | null {
  if (!vec || !validVec(vec)) return "Mostrá una sola mano completa, con buena luz.";
  if (!reference || reference.signId !== id || reference.samples.length < MIN_SAMPLES) return `Cargando la referencia de ${name}…`;
  return null;
}
const allClosed = (v: Vec) => Math.min(...(["index", "middle", "ring", "pinky"] as const).map(f => closed(fingerBend(v, f))));

export function evaluateA(vec: Vec | null, reference?: SampleSet) {
  const wait = ready(vec, reference, "a", "A"); if (wait) return reply(wait, 0);
  const v = vec!, fist = allClosed(v), side = thumbSide(v);
  // En las referencias de A el pulgar va de .44 a .94; S llega hasta -.13 y C empieza en 1.2.
  // La frontera con S queda en .15, con una franja de por medio que no aprueba ninguna de las dos.
  const beside = Math.min(clip((side + .05) / .25), clip((1.3 - side) / .25));
  const fit = Math.round(100 * Math.min(fist, beside));
  if (fit >= 90) return reply("La forma coincide con A. ¡Sostenela un segundo!", fit, true);
  if (fist < beside) return reply("Cerrá los cuatro dedos para formar el puño de A.", fit);
  return reply(side > 1 ? "Pegá el pulgar al costado del puño." : "Dejá el pulgar al costado del índice, sin cruzarlo sobre los dedos.", fit);
}

export function evaluateS(vec: Vec | null, reference?: SampleSet) {
  const wait = ready(vec, reference, "s", "S"); if (wait) return reply(wait, 0);
  const v = vec!, fist = allClosed(v), crossed = clip((.35 - thumbSide(v)) / .25);
  const fit = Math.round(100 * Math.min(fist, crossed));
  if (fit >= 90) return reply("La forma coincide con S. ¡Sostenela un segundo!", fit, true);
  if (fist < crossed) return reply("Cerrá los cuatro dedos para formar el puño de S.", fit);
  return reply("Eso se parece a la A: cruzá el pulgar por delante de los dedos.", fit);
}

export function evaluateI(vec: Vec | null, reference?: SampleSet) {
  const wait = ready(vec, reference, "i", "I"); if (wait) return reply(wait, 0);
  const v = vec!, pinky = straight(fingerBend(v, "pinky"));
  const others = Math.min(...(["index", "middle", "ring"] as const).map(f => closed(fingerBend(v, f))));
  // El pulgar va sobre los dedos doblados: en la referencia su punta queda hasta .57 del medio; extendido se aleja de 1.
  const tip = point(v, 4), middle = point(v, 10), thumb = clip((1.05 - Math.hypot(...sub(tip, middle))) / .25);
  const fit = Math.round(100 * Math.min(pinky, others, thumb));
  if (fit >= 90) return reply("La forma coincide con I. ¡Sostenela un segundo!", fit, true);
  if (thumb < pinky && thumb < others) return reply("Dejá el pulgar sobre los dedos doblados.", fit);
  if (pinky < others) return reply("Extendé el meñique hacia arriba.", fit);
  return reply("Cerrá el índice, el medio y el anular; solo queda arriba el meñique.", fit);
}
