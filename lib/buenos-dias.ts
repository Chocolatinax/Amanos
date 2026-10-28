import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { BodyFrame } from "./body-tracking";
import { handFeatures } from "./human-evaluator";
import { handOpenness, type HandShape } from "./movement-check";

// BUENOS DÍAS en tres fases ordenadas: pulgar arriba con una mano, antebrazos cruzados frente al pecho y brazos abiertos.
// Muñecas relativas al centro de los hombros, en anchos de hombro, sin espejar (igual que scripts/prepare-buenos-dias-reference.py).
export type BuenosDiasPhase = "thumb-up" | "transition" | "cross" | "open";
export type ThumbSample = { features: number[]; thumbDirection: number[] };
// shape: forma de las manos detectadas en el cuadro; en el cruce y la apertura tienen que ser puños.
export type BuenosDiasPoint = { time: number; wrists: number[]; thumb: ThumbSample | null; shape: HandShape | null };
export type BuenosDiasReference = { version: "buenos-dias-v1"; signId: "buenos-dias"; frames: { time: number; phase: BuenosDiasPhase; wrists: number[] }[]; thumbs: ThumbSample[] };

const PHASES: BuenosDiasPhase[] = ["thumb-up", "transition", "cross", "open"];
const finite = (v: unknown, n: number): v is number[] => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]);
const unit = (a: number[]) => { const n = Math.hypot(...a); return a.map(x => x / Math.max(n, 1e-8)); };
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const rms = (a: number[]) => Math.hypot(...a) / Math.sqrt(a.length);

export function parseBuenosDias(value: unknown): BuenosDiasReference | null {
  const r = value as BuenosDiasReference;
  if (!r || r.version !== "buenos-dias-v1" || r.signId !== "buenos-dias" || !Array.isArray(r.frames) || !Array.isArray(r.thumbs)) return null;
  if (r.frames.some((f, i) => !f || !Number.isFinite(f.time) || (i > 0 && f.time <= r.frames[i - 1].time) || !PHASES.includes(f.phase) || !finite(f.wrists, 4))) return null;
  if ((["thumb-up", "cross", "open"] as const).some(p => r.frames.filter(f => f.phase === p).length < 4)) return null;
  // Las fases principales tienen que aparecer en orden.
  const order = r.frames.filter(f => f.phase !== "transition").map(f => PHASES.indexOf(f.phase));
  if (order.some((v, i) => i > 0 && v < order[i - 1])) return null;
  if (r.thumbs.length < 4 || r.thumbs.some(t => !finite(t?.features, 12) || !finite(t.thumbDirection, 3))) return null;
  return r;
}

export function observeBuenosDias(result: HandLandmarkerResult, body: BodyFrame | null, timestamp: number): BuenosDiasPoint | null {
  if (!body?.imageSize || timestamp < body.timestamp || timestamp - body.timestamp > 300) return null;
  const pose = body.pose.landmarks[0], { width: w, height: h } = body.imageSize;
  if (!pose || !w || !h || [11, 12, 15, 16].some(i => !pose[i] || (pose[i].visibility ?? 0) < .6 || !Number.isFinite(pose[i].x) || !Number.isFinite(pose[i].y))) return null;
  const aspect = w / h, a = pose[11], b = pose[12], width = Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  if (!Number.isFinite(width) || width < .03) return null;
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
  const wrists = [15, 16].flatMap(i => [(pose[i].x - cx) * aspect / width, (pose[i].y - cy) / width]);
  // La mano levantada (la más alta en la imagen) es la que hace el pulgar arriba.
  let thumb: ThumbSample | null = null, top = Infinity;
  result.worldLandmarks.forEach((points, i) => {
    const cat = result.handedness[i]?.[0], image = result.landmarks[i];
    if (!cat || cat.score < .65 || points.length !== 21 || image?.length !== 21 || image[0].y >= top) return;
    const o = points[0], m = points[9], scale = Math.hypot(m.x - o.x, m.y - o.y, m.z - o.z);
    if (scale < .005 || points.some(p => ![p.x, p.y, p.z].every(Number.isFinite))) return;
    const flip = cat.categoryName === "Left" ? -1 : 1;
    const v = points.flatMap(p => [(p.x - o.x) * flip / scale, (p.y - o.y) / scale, (p.z - o.z) / scale]);
    top = image[0].y;
    thumb = { features: handFeatures(v), thumbDirection: unit(sub(v.slice(12, 15), v.slice(6, 9))) };
  });
  return { time: timestamp / 1000, wrists, thumb, shape: handOpenness(result) };
}

// Persona zurda: la otra mano hace el pulgar y el cruce queda al revés. Se compara también la versión espejada.
const mirror = (w: number[]) => [-w[2], w[3], -w[0], w[1]];
const wristError = (a: number[], b: number[]) => rms(a.map((v, i) => Math.max(0, Math.abs(v - b[i]) - .15)));
const reply = (feedback: string, similarity = 0, accepted = false) => ({ feedback, similarity, accepted });

export class BuenosDiasTracker {
  private points: BuenosDiasPoint[] = [];
  private stage: "thumb-up" | "cross" | "open" = "thumb-up";
  private since: number | null = null;
  private lastMatch = 0;
  private crossFrom = Infinity;
  private openFrom = Infinity;
  private stageDone = false;
  private last = reply("Empezá con una mano arriba y el pulgar hacia arriba.");
  reset() { this.points = []; this.stage = "thumb-up"; this.since = null; this.lastMatch = 0; this.crossFrom = Infinity; this.openFrom = Infinity; this.stageDone = false; this.last = reply("Empezá con una mano arriba y el pulgar hacia arriba."); }

  private thumbUp(p: BuenosDiasPoint, reference: BuenosDiasReference) {
    const raised = Math.min(p.wrists[1], p.wrists[3]), lowered = Math.max(p.wrists[1], p.wrists[3]);
    const hand = p.thumb;
    return raised < .6 && lowered - raised > .3 && !!hand
      && hand.features.slice(0, 4).every(v => v > -.45) && hand.thumbDirection[1] < -.25
      && reference.thumbs.some(t => dot(hand.thumbDirection, t.thumbDirection) > .6);
  }
  private crossed(p: BuenosDiasPoint) {
    const [lx, ly, rx, ry] = p.wrists;
    // Normalmente la muñeca izquierda queda a la derecha de la imagen; cruzadas, se invierten.
    return Math.abs(lx) < .9 && Math.abs(rx) < .9 && [ly, ry].every(y => y > -.6 && y < 1) && lx < rx - .05;
  }
  private open(p: BuenosDiasPoint) {
    const [lx, ly, rx, ry] = p.wrists;
    return lx > .5 && rx < -.5 && lx - rx > 1.1 && [ly, ry].every(y => y > -.9 && y < .6);
  }

  update(point: BuenosDiasPoint | null, reference: BuenosDiasReference | null) {
    if (!reference) return reply("Cargando la referencia de BUENOS DÍAS…");
    if (!point || !finite(point.wrists, 4) || !Number.isFinite(point.time)) {
      const previous = this.points.at(-1);
      if (previous && point === null) return this.last;
      this.reset(); return reply("Mostrá el rostro, ambos hombros y las dos muñecas.");
    }
    const previous = this.points.at(-1);
    if (previous && (point.time <= previous.time || point.time - previous.time > .4 || point.time - this.points[0].time > 6)) this.reset();
    else if (previous && point.time - previous.time < .06) return this.last;

    const matches = this.stage === "thumb-up" ? this.thumbUp(point, reference) : this.stage === "cross" ? this.crossed(point) : this.open(point);
    const hold = this.stage === "thumb-up" ? .25 : this.stage === "cross" ? .15 : .3;
    if (this.stage === "thumb-up" && !this.stageDone && !matches) { this.reset(); return this.last; }
    this.points.push(point);
    if (!matches) {
      // Entre fases se permite la transición, pero no quedarse demasiado tiempo fuera de la siguiente postura.
      this.since = null;
      if (this.stageDone) {
        const next = this.stage === "thumb-up" ? "cross" : this.stage === "cross" ? "open" : null;
        if (next) { this.stage = next; this.stageDone = false; if (next === "cross") this.crossFrom = point.time; if (next === "open") this.openFrom = point.time; }
      }
      if (point.time - this.lastMatch > 2) { this.reset(); return this.last = reply("Hacé las tres partes seguidas: pulgar arriba, cruzar los brazos y abrirlos."); }
      return this.last = reply(this.stage === "cross" ? "Ahora cerrá ambos puños y cruzá los antebrazos frente al pecho." : "Ahora abrí los brazos hacia los costados, a la altura de los hombros.", this.stage === "cross" ? 35 : 65);
    }
    this.lastMatch = point.time;
    if (this.since === null) this.since = point.time;
    if (point.time - this.since < hold) return this.last = reply(this.stage === "thumb-up" ? "Mantené brevemente el pulgar arriba." : this.stage === "cross" ? "Mantené los brazos cruzados un momento." : "Sostené los brazos abiertos.", this.stage === "thumb-up" ? 20 : this.stage === "cross" ? 50 : 80);
    if (this.stage !== "open") {
      this.stageDone = true;
      return this.last = reply(this.stage === "thumb-up" ? "Bien. Ahora cerrá ambos puños y cruzá los antebrazos frente al pecho." : "Bien. Ahora abrí los brazos hacia los costados.", this.stage === "thumb-up" ? 30 : 60);
    }
    // Desde que se dejó el pulgar, las manos tienen que estar en puño (cruce y apertura).
    // Se comprueba por separado en cada fase: un cruce con puños no compensa una apertura con las manos abiertas.
    const phases = [[this.crossFrom, this.openFrom], [this.openFrom, Infinity]].map(([from, to]) => this.points.filter(p => p.time >= from && p.time < to && p.shape).map(p => p.shape));
    if (phases.some(shapes => shapes.length < 2)) return this.last = reply("Mostrá bien las dos manos al cruzar y al abrir los brazos.", 85);
    if (phases.some(shapes => shapes.filter(s => s === "fist").length / shapes.length < .6)) return this.last = reply("Cerrá ambos puños al cruzar y al abrir los brazos.", 85);
    // Las tres fases ocurrieron en orden: se compara el recorrido completo con la referencia.
    const n = this.points.length, m = reference.frames.length;
    const cost = (map: (w: number[]) => number[]) => {
      const c = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity)); c[0][0] = 0;
      for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) c[i][j] = wristError(map(this.points[i - 1].wrists), reference.frames[j - 1].wrists) + Math.min(c[i - 1][j], c[i][j - 1], c[i - 1][j - 1]);
      return c[n][m] / Math.max(n, m);
    };
    const similarity = Math.round(100 * Math.max(0, Math.min(1, 1 - Math.min(cost(w => w), cost(mirror)) / .5)));
    return this.last = similarity >= 90 ? reply("La secuencia de BUENOS DÍAS coincide con la referencia.", similarity, true)
      : reply("Las tres partes están, pero revisá la altura y la apertura de los brazos según el avatar.", similarity);
  }
}
