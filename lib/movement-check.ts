import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { BodyFrame } from "./body-tracking";
import { handFeatures } from "./human-evaluator";

// GRACIAS: recorrido de ambas muñecas (pose) más un control de manos abiertas. En el video fuente los dedos se ven
// de frente y su detección cuadro a cuadro es inestable, así que la forma se decide por mayoría durante el intento.
export const MOVEMENT_CHECK_IDS = ["gracias"];
export type MovementPoint = { time: number; wrists: number[] };
export type MovementReference = { version: "movement-check-v1"; scope: "body-motion-only"; signId: string; mode: "sequence"; frames: MovementPoint[] };
// windowStart: inicio del tramo que obtuvo la similitud (para contar la forma de las manos en ese mismo tramo).
export type MovementCheck = { verified: boolean; similarity: number; feedback: string; checks: { label: string; ok: boolean }[]; windowStart?: number };
export type HandShape = "open" | "fist" | "mixed";
const finite = (v: unknown): v is number[] => Array.isArray(v) && v.length === 4 && v.every(Number.isFinite);
export function parseMovementReference(value: unknown, id: string): MovementReference | null {
  const r = value as MovementReference;
  return r?.version === "movement-check-v1" && r.scope === "body-motion-only" && r.signId === id && MOVEMENT_CHECK_IDS.includes(id) && r.mode === "sequence" && Array.isArray(r.frames) && r.frames.length >= 8 && r.frames.every((p, i) => p && Number.isFinite(p.time) && finite(p.wrists) && (i === 0 || p.time > r.frames[i - 1].time)) ? r : null;
}

/** "open": una mano con los dedos extendidos y ninguna en puño claro. "fist": todas cerradas. "mixed": una abierta y otra en puño. */
export function handOpenness(result: HandLandmarkerResult): HandShape | null {
  const bends = result.worldLandmarks.flatMap((points, i) => {
    const cat = result.handedness[i]?.[0];
    if (!cat || cat.score < .65 || points.length !== 21) return [];
    const o = points[0], m = points[9], scale = Math.hypot(m.x - o.x, m.y - o.y, m.z - o.z);
    if (scale < .005) return [];
    const v = points.flatMap(p => [(p.x - o.x) / scale, (p.y - o.y) / scale, (p.z - o.z) / scale]);
    const b = handFeatures(v).slice(0, 4);
    return b.every(Number.isFinite) ? [b.reduce((s, x) => s + x, 0) / 4] : [];
  });
  if (!bends.length) return null;
  const open = bends.some(b => b < -.5), fist = bends.some(b => b > .3);
  return open && fist ? "mixed" : open ? "open" : bends.every(b => b > .1) ? "fist" : null;
}

/** Mayoría de cuadros con la forma esperada durante el mismo tramo que se evalúa. */
export class ShapeVote {
  private votes: { time: number; state: HandShape }[] = [];
  reset() { this.votes = []; }
  update(state: HandShape | null, time: number) {
    if (state) this.votes.push({ time, state });
    this.votes = this.votes.filter(v => time - v.time <= 5);
  }
  /** Al menos `minimum` cuadros clasificados desde `since` y mayoría con la forma pedida ("mixed" cuenta en contra). */
  ok(expected: "open" | "fist", since = -Infinity, minimum = 4) {
    const window = this.votes.filter(v => v.time >= since);
    return window.length >= minimum && window.filter(v => v.state === expected).length / window.length >= .6;
  }
}
export function observeMovement(body: BodyFrame | null, timestamp: number): MovementPoint | null {
  if (!body?.imageSize || !Number.isFinite(timestamp) || timestamp < body.timestamp || timestamp - body.timestamp > 300) return null;
  const p = body.pose.landmarks[0], { width, height } = body.imageSize;
  if (!p || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || [11, 12, 13, 14, 15, 16].some(i => !p[i] || (p[i].visibility ?? 0) < .6 || !Number.isFinite(p[i].x) || !Number.isFinite(p[i].y))) return null;
  const aspect = width / height, scale = Math.hypot((p[11].x - p[12].x) * aspect, p[11].y - p[12].y);
  if (!Number.isFinite(scale) || scale < .03) return null;
  const pairs = [15, 16].map(i => [(p[i].x - (p[11].x + p[12].x) / 2) * aspect / scale, (p[i].y - (p[11].y + p[12].y) / 2) / scale]).sort((a, b) => a[0] - b[0]);
  return { time: body.timestamp / 1000, wrists: pairs.flat() };
}
const gap = (p: MovementPoint) => Math.hypot(p.wrists[0] - p.wrists[2], p.wrists[1] - p.wrists[3]);
const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const range = (v: number[]) => Math.max(...v) - Math.min(...v);
const typicalRange = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor((s.length - 1) * .9)] - s[Math.floor((s.length - 1) * .1)]; };
const distance = (a: MovementPoint, b: MovementPoint) => Math.hypot(...a.wrists.map((v, i) => Math.max(0, Math.abs(v - b.wrists[i]) - .06))) / 2;
function turns(values: number[], excursion: number) {
  let pivot = values[0], extreme = pivot, direction = 0, count = 0;
  for (const value of values) {
    if (!direction) { if (Math.abs(value - pivot) >= excursion) { direction = Math.sign(value - pivot); extreme = value; } }
    else if ((value - extreme) * direction >= 0) extreme = value;
    else if (Math.abs(value - extreme) >= excursion) { count++; direction *= -1; extreme = value; }
  }
  return count;
}
export class MovementTracker {
  private points: MovementPoint[] = [];
  private last: MovementCheck = { verified: false, similarity: 0, feedback: "Mostrá ambos brazos y muñecas.", checks: [] };
  reset() { this.points = []; this.last = { verified: false, similarity: 0, feedback: "Repetí desde el inicio.", checks: [] }; }
  /** Inicio del búfer del intento en curso (null si se reinició). */
  get since() { return this.points[0]?.time ?? null; }
  update(point: MovementPoint | null, reference: MovementReference | null): MovementCheck {
    const reply = (feedback: string, similarity: number, checks: MovementCheck["checks"], verified = false) => this.last = { feedback, similarity, checks, verified };
    if (!reference) return reply("Cargando la comprobación de cámara…", 0, []);
    if (!point || !finite(point.wrists) || !Number.isFinite(point.time)) { this.reset(); return reply("Mostrá ambos hombros, brazos y muñecas con claridad.", 0, [{ label: "Ambos brazos visibles", ok: false }]); }
    const previous = this.points.at(-1);
    if (previous && (point.time < previous.time || point.time - previous.time > .35)) this.reset();
    else if (previous && point.time - previous.time < .06) return this.last;
    const checks = [{ label: "Ambos brazos visibles", ok: true }];
    const heights = [1, 3].every(i => {
      const values = reference.frames.map(p => p.wrists[i]);
      return point.wrists[i] >= Math.min(...values) - .15 && point.wrists[i] <= Math.max(...values) + .15;
    });
    const separation = Math.abs(gap(point) - median(reference.frames.map(gap))) < .3;
    const centered = Math.abs((point.wrists[0] + point.wrists[2]) / 2 - median(reference.frames.map(p => (p.wrists[0] + p.wrists[2]) / 2))) < .3;
    checks.push({ label: "Altura de las manos", ok: heights }, { label: "Separación de ambas manos", ok: separation && centered });
    if (!heights || !separation || !centered) { this.points = []; return reply(!heights ? "Ajustá la altura de ambas manos según el avatar." : "Mantené las manos separadas y frente al cuerpo, como en GRACIAS.", 0, checks); }
    this.points.push(point); this.points = this.points.filter(p => point.time - p.time <= 5);
    const minimum = Math.max(1.2, (reference.frames.at(-1)!.time - reference.frames[0].time) * .75);
    let best = 0, moving = false, windowStart: number | undefined;
    for (let start = 0; start <= this.points.length - 8; start++) {
      const window = this.points.slice(start), duration = point.time - window[0].time;
      if (duration < minimum || duration > 4.5) continue;
      const complete = [1, 3].every(i => {
        const values = window.map(p => p.wrists[i]), expected = typicalRange(reference.frames.map(p => p.wrists[i]));
        return range(values) >= Math.max(.12, expected * .6) && turns(values, Math.max(.06, expected * .25)) >= 1;
      });
      if (!complete) continue;
      moving = true;
      const n = window.length, m = reference.frames.length, costs = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity)); costs[0][0] = 0;
      for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) costs[i][j] = distance(window[i - 1], reference.frames[j - 1]) + Math.min(costs[i - 1][j], costs[i][j - 1], costs[i - 1][j - 1]);
      const similarity = Math.round(100 * Math.max(0, 1 - costs[n][m] / Math.max(n, m) / .4));
      if (similarity > best) { best = similarity; windowStart = window[0].time; }
    }
    const verified = moving && best >= 90;
    checks.push({ label: "Subida y bajada de ambas manos", ok: moving }, { label: "Recorrido completo de referencia", ok: verified });
    reply(verified ? "Recorrido de GRACIAS comprobado." : !moving ? "Completá la subida y la bajada con ambas manos; mover solo una no alcanza." : "Repetí el recorrido completo siguiendo el avatar.", best, checks, verified);
    return this.last = { ...this.last, windowStart };
  }
}
