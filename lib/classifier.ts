import { FEATURE_VERSION, type Vec } from "./features";
import { loadReference } from './reference-source';
import { hasBackend } from './api';

export type SampleMeta = { senante?: string; dispositivo?: string; fecha?: string };
export type SampleSet = { version: typeof FEATURE_VERSION; signId: string; samples: Vec[]; meta?: SampleMeta[] };

const LS_PREFIX = "amanos.samples.v2.";
export function validVec(v: unknown): v is Vec {
  return Array.isArray(v) && v.length === 63 && v.every(x => typeof x === "number" && Number.isFinite(x));
}
export function parseSamples(value: unknown, signId: string): SampleSet | null {
  if (!value || typeof value !== "object") return null;
  const set = value as SampleSet;
  if (set.version !== FEATURE_VERSION || set.signId !== signId || !Array.isArray(set.samples) || !set.samples.every(validVec)) return null;
  return { version: FEATURE_VERSION, signId, samples: set.samples, meta: Array.isArray(set.meta) ? set.meta : [] };
}

/** Muestras grabadas con /capture en este navegador (no requieren copiar el JSON). */
export function loadLocalSamples(signId: string): SampleSet | null {
  if (typeof window === "undefined") return null;
  try { const r = localStorage.getItem(LS_PREFIX + signId); return r ? parseSamples(JSON.parse(r), signId) : null; } catch { return null; }
}
export function saveLocalSamples(set: SampleSet) {
  if (!parseSamples(set, set.signId)) throw new Error("Muestras incompatibles. Volvé a capturarlas.");
  localStorage.setItem(LS_PREFIX + set.signId, JSON.stringify(set));
}
export function clearLocalSamples(signId: string) {
  try { localStorage.removeItem(LS_PREFIX + signId); } catch {}

}

/** Une /public/samples/<id>.json (repo) + muestras locales del navegador. */
export async function loadSamples(signId: string): Promise<SampleSet | null> {
  let fromFile: SampleSet | null = null;
  try {
    fromFile = parseSamples(await loadReference(signId), signId);
  } catch { return null; }
  if (hasBackend()) return fromFile;
  const local = loadLocalSamples(signId);
  const samples = [...(fromFile?.samples ?? []), ...(local?.samples ?? [])];
  const set: SampleSet | null = samples.length ? { version: FEATURE_VERSION, signId, samples, meta: [...(fromFile?.meta ?? []), ...(local?.meta ?? [])] } : null;
  return set;
}

export function dist(a: Vec, b: Vec) {
  if (!validVec(a) || !validVec(b)) return Infinity;
  let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

// Similarity, not a probability. Calibrate against held-out people before claiming accuracy.
export const D_PERFECT = Number(process.env.NEXT_PUBLIC_D_PERFECT ?? 0.9);
export const D_ZERO = Number(process.env.NEXT_PUBLIC_D_ZERO ?? 3.2);
export const MIN_SAMPLES = 20;
export function distanceToSet(vec: Vec, set: SampleSet, k = 3): number {
  if (!validVec(vec) || set.samples.length < MIN_SAMPLES) return Infinity;
  const ds = set.samples.map(s => dist(vec, s)).sort((a, b) => a - b).slice(0, k);
  return ds.reduce((a, b) => a + b, 0) / ds.length;
}
export function score(vec: Vec, set: SampleSet): number {
  const d = distanceToSet(vec, set);
  if (!Number.isFinite(d) || !(D_ZERO > D_PERFECT)) return 0;
  return Math.round(100 * Math.min(1, Math.max(0, 1 - (d - D_PERFECT) / (D_ZERO - D_PERFECT))));
}
export function classify(vec: Vec, sets: SampleSet[], requiredIds: string[]) {
  const available = requiredIds.map(id => sets.find(s => s.signId === id));
  if (available.length < 2 || available.some(s => !s || s.samples.length < MIN_SAMPLES)) return null;
  const ranked = (available as SampleSet[]).map(set => ({ signId: set.signId, distance: distanceToSet(vec, set), similarity: score(vec, set) }))
    .sort((a, b) => a.distance - b.distance);
  const [first, second] = ranked;
  // Reject ambiguous poses even if both classes have high similarity.
  if (!Number.isFinite(first.distance) || first.similarity < 90 || second.distance - first.distance < 0.2) return null;
  return first;
}

/** Require continuous accepted frames; a stalled camera must not complete an attempt. */
export class HoldTracker {
  private since: number | null = null;
  private last: number | null = null;
  reset() { this.since = null; this.last = null; }
  /** Milisegundos que lleva reconocida la seña de forma continua (para la barra de progreso). */
  held(): number { return this.since !== null && this.last !== null ? this.last - this.since : 0; }
  update(accepted: boolean, ts: number): boolean {
    if (!accepted || !Number.isFinite(ts)) { this.reset(); return false; }
    if (this.last === null || ts <= this.last || ts - this.last > 250) this.since = ts;
    this.last = ts;
    return ts - (this.since ?? ts) >= 1000;
  }
}

/** Suaviza el score en el tiempo para que no parpadee en pantalla. */
export class Smoother {
  private buf: number[] = [];
  constructor(private n = 8) {}
  push(v: number) { this.buf.push(v); if (this.buf.length > this.n) this.buf.shift(); return this.value; }
  get value() { return this.buf.length ? Math.round(this.buf.reduce((a, b) => a + b, 0) / this.buf.length) : 0; }
  reset() { this.buf = []; }
}
