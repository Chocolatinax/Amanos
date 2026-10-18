import { validVec } from "./classifier";
import type { Vec } from "./features";
export type SequencePoint = { shape: Vec; anchor: number[]; time: number };
export type AdiosReference = { version: "hand-body-sequence-v1"; signId: "adios"; frames: SequencePoint[] };
export function parseAdios(value: unknown): AdiosReference | null {
  const r = value as AdiosReference;
  if (!r || r.version !== "hand-body-sequence-v1" || r.signId !== "adios" || !Array.isArray(r.frames) || r.frames.length < 8) return null;
  if (r.frames.some((p, i) => !validVec(p.shape) || !Array.isArray(p.anchor) || p.anchor.length !== 2 || !p.anchor.every(Number.isFinite) || !Number.isFinite(p.time) || (i > 0 && p.time <= r.frames[i - 1].time))) return null;
  return r;
}
type Point = { x: number; y: number; visibility?: number };
export function wristAnchor(wrist: Point | undefined, pose: Point[] | undefined, handedness?: string): number[] | null {
  if (!wrist || !pose || !["Left", "Right"].includes(handedness ?? "")) return null;
  const a = pose[11], b = pose[12];
  if (!a || !b || (a.visibility ?? 0) < .6 || (b.visibility ?? 0) < .6) return null;
  const width = Math.hypot(a.x - b.x, a.y - b.y);
  if (width < .03) return null;
  const anchor = [(wrist.x - (a.x + b.x) / 2) * (handedness === "Left" ? -1 : 1) / width, (wrist.y - (a.y + b.y) / 2) / width];
  return anchor.every(Number.isFinite) ? anchor : null;
}
const rms = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length);
function computeCurls(shape: Vec) {
  const p = (i: number) => shape.slice(i * 3, i * 3 + 3);
  return [5, 9, 13, 17].map(i => {
    const a = p(i).map((v, k) => v - p(i + 1)[k]);
    const b = p(i + 3).map((v, k) => v - p(i + 1)[k]);
    const length = Math.hypot(...a) * Math.hypot(...b);
    return length > 1e-6 ? a.reduce((s, v, k) => s + v * b[k], 0) / length : 1;
  });
}
// Joint angles avoid penalizing differences in finger length between people.
function computePalmNormal(shape: Vec) {
  const a = [0, 1, 2].map(k => shape[15 + k]);
  const b = [0, 1, 2].map(k => shape[51 + k]);
  const normal = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const length = Math.hypot(...normal);
  return length > 1e-6 ? normal.map(v => v / length) : [0, 0, 0];
}
const featureCache = new WeakMap<Vec, { curls: number[]; normal: number[] }>();
function features(shape: Vec) {
  let cached = featureCache.get(shape);
  if (!cached) { cached = { curls: computeCurls(shape), normal: computePalmNormal(shape) }; featureCache.set(shape, cached); }
  return cached;
}
const curls = (shape: Vec) => features(shape).curls;
const palmNormal = (shape: Vec) => features(shape).normal;
const facing = (a: Vec, b: Vec) => { const bNormal = palmNormal(b); return palmNormal(a).reduce((s, v, i) => s + v * bNormal[i], 0); };
const shapeDistance = (a: Vec, b: Vec) => {
  const bCurls = curls(b);
  const differences = curls(a).map((v, i) => Math.max(0, Math.abs(v - bCurls[i]) - .08));
  return Math.hypot(...differences) / 2 * .5 + .15 * (1 - Math.max(-1, Math.min(1, facing(a, b))));
};
function openThroughout(points: SequencePoint[]) {
  const bends = points.map(p => curls(p.shape));
  // A single noisy fingertip must not discard an otherwise open-hand sequence.
  const medians = [0, 1, 2, 3].map(i => bends.map(b => b[i]).sort((a, b) => a - b)[Math.floor(bends.length / 2)]);
  return medians.every(v => v < -.7) && bends.filter(b => b.filter(v => v < -.7).length >= 3).length / bends.length >= .65;
}
const locationDistance = (a: number[], b: number[]) => Math.hypot(Math.max(0, Math.abs(a[0] - b[0]) - .35), Math.max(0, Math.abs(a[1] - b[1]) - .8));
function reversals(values: number[], excursion: number) {
  let low = values[0], high = values[0], direction = 0, count = 0;
  for (const value of values) {
    low = Math.min(low, value); high = Math.max(high, value);
    if (!direction && value - low >= excursion) { direction = 1; high = value; }
    else if (!direction && high - value >= excursion) { direction = -1; low = value; }
    else if (direction === 1 && high - value >= excursion) { count++; direction = -1; low = value; }
    else if (direction === -1 && value - low >= excursion) { count++; direction = 1; high = value; }
  }
  return count;
}
function hasMotion(points: SequencePoint[]) {
  const roll = points.map(p => Math.atan2(p.shape[27], -p.shape[28]));
  // A translated arm alone is not the wrist wave seen in this reference clip.
  return Math.max(...roll) - Math.min(...roll) >= .4 && reversals(roll, .22) >= 3;
}
// Ordered sequence comparison allows timing variation, but still requires visible movement.
export class AdiosTracker {
  private points: SequencePoint[] = [];
  private lastResult = { accepted: false, similarity: 0, feedback: "Abrí la mano y completá el movimiento de ADIÓS." };
  reset() { this.points = []; this.lastResult = { accepted: false, similarity: 0, feedback: "Abrí la mano y completá el movimiento de ADIÓS." }; }
  update(shape: Vec | null, anchor: number[] | null, timestamp: number, reference: AdiosReference | null) {
    const no = (feedback: string, similarity = 0) => ({ accepted: false, similarity, feedback });
    if (!reference) { this.reset(); return no("Cargando el movimiento de ADIÓS…"); }
    if (!shape || !validVec(shape) || !anchor || anchor.length !== 2 || !anchor.every(Number.isFinite) || !Number.isFinite(timestamp)) {
      const last = this.points.at(-1);
      // Keep the observed sequence through a brief blur, but never approve a missing frame.
      if (last && Number.isFinite(timestamp) && timestamp / 1000 > last.time && timestamp / 1000 - last.time <= .3) return no("Recuperando la mano…", Math.min(89, this.lastResult.similarity));
      this.reset(); return no("Mostrá la mano completa y ambos hombros.");
    }
    const time = timestamp / 1000, previous = this.points.at(-1);
    if (previous && (time <= previous.time || time - previous.time > .4)) this.reset();
    if (previous && time > previous.time && time - previous.time < .08) return this.lastResult;
    if (anchor[1] > .35 || anchor[1] < -1.6 || Math.abs(anchor[0]) > 1.8) { this.reset(); return no("Subí la mano al costado de la cabeza, como el avatar."); }
    const bend = curls(shape);
    if (bend.filter(v => v < -.4).length < 3 || bend.some(v => v > 0)) { this.reset(); return no("Mantené los cuatro dedos extendidos durante ADIÓS."); }
    if (Math.max(...reference.frames.map(p => facing(shape, p.shape))) < .65) { this.reset(); return no("Orientá la palma hacia adelante, como en el avatar."); }
    this.points.push({ shape, anchor, time });
    this.points = this.points.filter(p => time - p.time <= 4.5);
    let best = 0, moving = false;
    for (let start = 0; start <= this.points.length - 8; start++) {
      const window = this.points.slice(start), duration = time - window[0].time;
      if (duration < .65 || duration > 4.2) continue;
      if (!hasMotion(window)) continue;
      if (!openThroughout(window)) continue;
      moving = true;
      const n = window.length, m = reference.frames.length;
      const cost = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity)); cost[0][0] = 0;
      for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
        const a = window[i - 1], b = reference.frames[j - 1];
        const distance = shapeDistance(a.shape, b.shape) + .25 * locationDistance(a.anchor, b.anchor);
        cost[i][j] = distance + Math.min(cost[i - 1][j], cost[i][j - 1], cost[i - 1][j - 1]);
      }
      const distance = cost[n][m] / Math.max(n, m);
      best = Math.max(best, Math.round(100 * Math.max(0, Math.min(1, 1 - distance / .6))));
    }
    if (!moving) this.lastResult = no("Completá el vaivén de muñeca del avatar, manteniendo la palma abierta.");
    else if (best < 90) this.lastResult = no("Revisá la ubicación y mantené la mano abierta durante el recorrido.", best);
    else this.lastResult = { accepted: true, similarity: best, feedback: "El movimiento coincide con la referencia de ADIÓS." };
    return this.lastResult;
  }
}
