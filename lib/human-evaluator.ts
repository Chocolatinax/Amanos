import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { BodyFrame } from "./body-tracking";
export type HumanHand = { features: number[]; anchor: number[]; thumb?: number[]; thumbDirection?: number[] };
export type HumanPoint = { time: number; hands: HumanHand[]; gap: number; phase?: "thumb-up" | "transition" | "flat" };
export type HumanReference = { version: "human-body-v1"; signId: "tu" | "gracias" | "hola" | "buenas-tardes"; mode: "hold" | "sequence"; requiredHands: number; frames: HumanPoint[] };
export const BODY_EVALUATED_IDS = ["tu", "gracias", "hola", "buenas-tardes"];
// Señas que se califican y marcan como dominadas. GRACIAS usa lib/movement-check.ts y BUENOS DÍAS lib/buenos-dias.ts.
// I y S se califican en cuanto existan sus muestras (public/samples, /capture o el panel de administración).
export const CAMERA_EVALUATED_IDS = ["a", "b", "c", "i", "s", "adios", "tu", "hola", "buenas-tardes", "gracias", "buenos-dias"];
const finite = (v: unknown, n: number): v is number[] => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
export function parseHumanReference(value: unknown, id: string): HumanReference | null {
  const r = value as HumanReference;
  if (!r || r.version !== "human-body-v1" || r.signId !== id || !BODY_EVALUATED_IDS.includes(id) || r.mode !== (id === "tu" ? "hold" : "sequence") || r.requiredHands !== (id === "gracias" ? 2 : 1) || !Array.isArray(r.frames) || r.frames.length < 6) return null;
  if (r.frames.some((f, i) => !Number.isFinite(f.time) || (i > 0 && f.time <= r.frames[i - 1].time) || !Number.isFinite(f.gap) || f.gap < 0 || !Array.isArray(f.hands) || f.hands.length !== r.requiredHands || f.hands.some(h => !finite(h.features, 12) || !finite(h.anchor, 4)))) return null;
  if (id === "hola" && r.frames.some(f => f.hands.some(h => !finite(h.thumb, 3)))) return null;
  if (id === "buenas-tardes") {
    if (r.frames.some(f => !["thumb-up", "transition", "flat"].includes(f.phase ?? "") || !finite(f.hands[0].thumbDirection, 3))) return null;
    if (["thumb-up", "flat"].some(phase => r.frames.filter(f => f.phase === phase).length < 4)) return null;
    const order = r.frames.map(f => ["thumb-up", "transition", "flat"].indexOf(f.phase!));
    if (order.some((value, i) => i > 0 && value < order[i - 1])) return null;
  }
  return r;
}
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]);
const unit = (a: number[]) => { const n = Math.hypot(...a); return a.map(x => x / Math.max(n, 1e-8)); };
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
export function handFeatures(v: number[]) {
  const p = (i: number) => v.slice(i * 3, i * 3 + 3);
  const bend = [5, 9, 13, 17].map(i => dot(unit(sub(p(i), p(i + 1))), unit(sub(p(i + 3), p(i + 1)))));
  const a = p(5), b = p(17);
  const normal = unit([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
  return [...bend, ...unit(sub(p(8), p(5))), ...normal, Math.hypot(...sub(p(8), p(20))), Math.hypot(...sub(p(4), p(8)))];
}
export function observeHuman(result: HandLandmarkerResult, body: BodyFrame | null, timestamp: number, requiredHands: number): HumanPoint | null {
  if (!body?.imageSize || timestamp < body.timestamp || timestamp - body.timestamp > 300) return null;
  const pose = body.pose.landmarks[0], size = body.imageSize;
  if (!pose || !size.height || !size.width) return null;
  const a = pose[11], b = pose[12], nose = pose[0];
  if (!a || !b || !nose || [a, b, nose].some(p => (p.visibility ?? 0) < .6)) return null;
  const aspect = size.width / size.height, width = Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  if (!Number.isFinite(width) || width < .03) return null;
  const hands: (HumanHand & { screen: number[] })[] = [];
  result.worldLandmarks.forEach((points, i) => {
    const cat = result.handedness[i]?.[0], image = result.landmarks[i];
    if (!cat || cat.score < .65 || !["Left", "Right"].includes(cat.categoryName) || points.length !== 21 || image?.length !== 21 || points.some(p => ![p.x, p.y, p.z].every(Number.isFinite))) return;
    const w = points[0], m = points[9], scale = Math.hypot(m.x - w.x, m.y - w.y, m.z - w.z);
    if (scale < .005) return;
    const flip = cat.categoryName === "Left" ? -1 : 1, wrist = image[0], tip = image[8];
    const v = points.flatMap(p => [(p.x - w.x) * flip / scale, (p.y - w.y) / scale, (p.z - w.z) / scale]);
    const anchor = [(wrist.x - (a.x + b.x) / 2) * aspect * flip / width, (wrist.y - (a.y + b.y) / 2) / width, (tip.x - nose.x) * aspect * flip / width, (tip.y - nose.y) / width];
    if (!anchor.every(Number.isFinite)) return;
    const thumb = [5, 9, 17].map(i => Math.hypot(...sub(v.slice(12, 15), v.slice(i * 3, i * 3 + 3))));
    const thumbDirection = unit(sub(v.slice(12, 15), v.slice(6, 9)));
    hands.push({ features: handFeatures(v), thumb, thumbDirection, anchor, screen: [wrist.x * aspect, wrist.y] });
  });
  if (hands.length < requiredHands) return null;
  const selected = hands.sort((a, b) => a.screen[1] - b.screen[1]).slice(0, requiredHands);
  const gap = requiredHands === 2 ? Math.hypot(...sub(selected[0].screen, selected[1].screen)) / width : 0;
  return { time: timestamp / 1000, hands: selected.map(({ features, anchor, thumb, thumbDirection }) => ({ features, anchor, thumb, thumbDirection })), gap };
}
const rms = (a: number[]) => Math.hypot(...a) / Math.sqrt(a.length);
function handDistance(a: HumanHand, b: HumanHand) {
  const bends = a.features.slice(0, 4).map((v, i) => Math.max(0, Math.abs(v - b.features[i]) - .08));
  const direction = sub(a.features.slice(4, 7), b.features.slice(4, 7));
  const normal = sub(a.features.slice(7, 10), b.features.slice(7, 10));
  const position = a.anchor.map((v, i) => Math.max(0, Math.abs(v - b.anchor[i]) - .3));
  const thumb = a.thumb && b.thumb ? .3 * rms(sub(a.thumb, b.thumb)) : 0;
  return .45 * rms(bends) + .12 * rms(direction) + .08 * rms(normal) + .35 * rms(position) + thumb;
}
function pointDistance(a: HumanPoint, b: HumanPoint) {
  const distance = (hands: HumanHand[]) => a.hands.reduce((s, h, i) => s + handDistance(h, hands[i]), 0) / a.hands.length;
  return a.hands.length === 2 ? Math.min(distance(b.hands), distance([...b.hands].reverse())) : distance(b.hands);
}
const similarity = (d: number) => Math.round(100 * Math.max(0, Math.min(1, 1 - d / .65)));
const result = (feedback: string, value = 0, accepted = false) => ({ feedback, similarity: value, accepted });
function motionVector(p: HumanPoint, id: string) {
  if (id === "hola") return p.hands[0].anchor.slice(2, 4);
  return [p.hands.reduce((s, h) => s + h.anchor[1], 0) / p.hands.length, Math.abs(p.hands[0].anchor[1] - p.hands[1].anchor[1])];
}
const amplitude = (points: HumanPoint[], id: string) => {
  const v = points.map(p => motionVector(p, id));
  return Math.max(...v.flatMap(a => v.map(b => Math.hypot(...sub(a, b)))));
};
export class HumanEvaluator {
  private points: HumanPoint[] = [];
  private last = result("Mostrá las manos y el rostro completos.");
  reset() { this.points = []; this.last = result("Repetí la seña desde el inicio."); }
  update(observation: HumanPoint | null, reference: HumanReference | null, timestamp: number) {
    if (!reference) return result("Cargando la referencia de evaluación…");
    if (!observation || observation.hands.length !== reference.requiredHands || !Number.isFinite(timestamp)) {
      const previous = this.points.at(-1);
      if (!previous || timestamp / 1000 - previous.time > .3) this.reset();
      return result(reference.requiredHands === 2 ? "Mostrá ambas manos, los hombros y el rostro completos." : "Mostrá la mano, los hombros y el rostro completos.");
    }
    if (observation.hands.some(h => !finite(h.features, 12) || !finite(h.anchor, 4) || h.anchor[1] > 1.5 || h.anchor[1] < -2)) { this.reset(); return result("Ajustá la ubicación de las manos según el avatar."); }
    if (reference.signId === "hola") {
      const hand = observation.hands[0];
      // Do not let a correct trajectory compensate for an incorrect thumb.
      if (!finite(hand.thumb, 3) || Math.min(hand.thumb[0], hand.thumb[1]) > .8 || Math.min(...reference.frames.map(p => rms(sub(hand.thumb!, p.hands[0].thumb!)))) > .24) {
        this.reset(); return result("Pegá el pulgar a la palma, como en HOLA, y repetí el saludo.");
      }
      if (hand.features.slice(0, 4).some(bend => bend > -.6)) {
        this.reset(); return result("Extendé los cuatro dedos y mantené el pulgar pegado a la palma.");
      }
      if (hand.features[10] > Math.max(...reference.frames.map(p => p.hands[0].features[10])) + .2) {
        this.reset(); return result("Juntá los cuatro dedos y mantené el pulgar pegado a la palma.");
      }
    }
    if (reference.mode === "hold") {
      const score = similarity(Math.min(...reference.frames.map(p => pointDistance(observation, p))));
      const direction = reference.frames.map(p => dot(observation.hands[0].features.slice(4, 7), p.hands[0].features.slice(4, 7)));
      if (Math.max(...direction) < .75) return result("Apuntá con el índice hacia la persona frente a vos, como en TÚ.", Math.min(score, 89));
      return score >= 90 ? result("La forma y ubicación coinciden con TÚ. Sostenela un segundo.", score, true) : result("Revisá el índice extendido, los demás dedos cerrados y la ubicación de TÚ.", score);
    }
    const previous = this.points.at(-1);
    if (previous && (observation.time <= previous.time || observation.time - previous.time > .4)) this.reset();
    else if (previous && observation.time - previous.time < .1) return this.last;
    this.points.push(observation); this.points = this.points.filter(p => observation.time - p.time <= 5);
    let best = 0, moving = false;
    const minimum = Math.max(.6, Math.min(1.2, (reference.frames.at(-1)!.time - reference.frames[0].time) * .5));
    for (let start = 0; start <= this.points.length - 6; start++) {
      const window = this.points.slice(start), duration = observation.time - window[0].time;
      if (duration < minimum || duration > 4.5 || amplitude(window, reference.signId) < Math.max(.12, amplitude(reference.frames, reference.signId) * .45)) continue;
      if (reference.signId === "hola" && !window.some(p => Math.hypot(...p.hands[0].anchor.slice(2, 4)) < 1 && p.hands[0].anchor[3] < -.15)) continue;
      moving = true;
      const n = window.length, m = reference.frames.length, costs = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity)); costs[0][0] = 0;
      for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
        let distance = pointDistance(window[i - 1], reference.frames[j - 1]);
        if (reference.signId === "gracias") {
          // Flat, foreshortened fingers are unreliable in this source. Coach the
          // observed wrist path only; this branch must never issue a full grade.
          distance = .35 * rms(sub(motionVector(window[i - 1], "gracias"), motionVector(reference.frames[j - 1], "gracias")));
        }
        costs[i][j] = distance + Math.min(costs[i - 1][j], costs[i][j - 1], costs[i - 1][j - 1]);
      }
      best = Math.max(best, similarity(costs[n][m] / Math.max(n, m)));
    }
    if (reference.signId === "gracias") {
      this.last = result(!moving ? "Con ambas manos visibles, completá el recorrido de GRACIAS." : best < 90 ? "Revisá el recorrido y la altura de ambas manos según la referencia." : "El recorrido de GRACIAS se parece a la referencia. Esta guía todavía no califica la forma de los dedos.");
      return this.last;
    }
    this.last = !moving ? result("Llevá la mano a la frente y completá el saludo de HOLA.")
      : best < 90 ? result("Revisá la forma, orientación y recorrido completos de la referencia.", best)
      : result("La secuencia coincide con la referencia.", best, true);
    return this.last;
  }
}
