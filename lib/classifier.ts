import type { Vec } from "./hand";

export type SampleMeta = { senante?: string; dispositivo?: string; fecha?: string };
export type SampleSet = { signId: string; samples: Vec[]; meta?: SampleMeta[] };

const LS_PREFIX = "amanos.samples.";
const cache = new Map<string, SampleSet | null>();

/** Muestras grabadas con /capture en este navegador (no requieren copiar el JSON). */
export function loadLocalSamples(signId: string): SampleSet | null {
  if (typeof window === "undefined") return null;
  try { const r = localStorage.getItem(LS_PREFIX + signId); return r ? (JSON.parse(r) as SampleSet) : null; } catch { return null; }
}
export function saveLocalSamples(set: SampleSet) {
  try { localStorage.setItem(LS_PREFIX + set.signId, JSON.stringify(set)); } catch {}
  cache.delete(set.signId);
}
export function clearLocalSamples(signId: string) {
  try { localStorage.removeItem(LS_PREFIX + signId); } catch {}
  cache.delete(signId);
}

/** Une /public/samples/<id>.json (repo) + muestras locales del navegador. */
export async function loadSamples(signId: string): Promise<SampleSet | null> {
  if (cache.has(signId)) return cache.get(signId)!;
  let fromFile: SampleSet | null = null;
  try {
    const r = await fetch(`/samples/${signId}.json`, { cache: "no-store" });
    if (r.ok) fromFile = (await r.json()) as SampleSet;
  } catch {}
  const local = loadLocalSamples(signId);
  const samples = [...(fromFile?.samples ?? []), ...(local?.samples ?? [])];
  const set = samples.length ? { signId, samples, meta: [...(fromFile?.meta ?? []), ...(local?.meta ?? [])] } : null;
  cache.set(signId, set);
  return set;
}

export function dist(a: Vec, b: Vec) {
  let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

/**
 * Score 0-100 por kNN: promedio de distancia a las 3 muestras más cercanas de la seña objetivo.
 * D_PERFECT: distancia por debajo de la cual es 100. D_ZERO: distancia a partir de la cual es 0.
 * Ajustar estos dos números el sábado con las personas de la demo.
 */
export const D_PERFECT = Number(process.env.NEXT_PUBLIC_D_PERFECT ?? 0.9);
export const D_ZERO = Number(process.env.NEXT_PUBLIC_D_ZERO ?? 3.2);

export function score(vec: Vec, set: SampleSet, k = 3): number {
  if (!set.samples.length) return 0;
  const ds = set.samples.map(s => dist(vec, s)).sort((a, b) => a - b).slice(0, k);
  const d = ds.reduce((a, b) => a + b, 0) / ds.length;
  const t = (d - D_PERFECT) / (D_ZERO - D_PERFECT);
  return Math.round(100 * Math.min(1, Math.max(0, 1 - t)));
}

/** Suaviza el score en el tiempo para que no parpadee en pantalla. */
export class Smoother {
  private buf: number[] = [];
  constructor(private n = 8) {}
  push(v: number) { this.buf.push(v); if (this.buf.length > this.n) this.buf.shift(); return this.value; }
  get value() { return this.buf.length ? Math.round(this.buf.reduce((a, b) => a + b, 0) / this.buf.length) : 0; }
  reset() { this.buf = []; }
}
