"use client";
// Progreso en localStorage (modo demo / sin backend). Con NEXT_PUBLIC_API_URL, lib/store.tsx usa la API.
import { applyAttempt, applySeen, localDay, MASTER_THRESHOLD } from "./gamification";
import type { AttemptResult, PlanId, Progress } from "./types";

export type { Progress, SignProgress } from "./types";

const KEY = "amanos.progress.v2";
export const THRESHOLD = Number(process.env.NEXT_PUBLIC_MASTER_THRESHOLD ?? MASTER_THRESHOLD);

export const emptyProgress = (): Progress => ({ signs: {}, streak: 0, plan: "gratis" });

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try { const raw = localStorage.getItem(KEY); return raw ? { ...emptyProgress(), ...JSON.parse(raw) } : emptyProgress(); }
  catch { return emptyProgress(); }
}
export function saveProgress(p: Progress) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} }

export function markSeen(id: string): Progress {
  const { progress } = applySeen(loadProgress(), id, localDay());
  saveProgress(progress); return progress;
}
export function recordAttempt(id: string, score: number): { progress: Progress } & AttemptResult {
  const r = applyAttempt(loadProgress(), id, score, localDay(), THRESHOLD);
  saveProgress(r.progress); return r;
}
export function setPlan(plan: Progress["plan"], planId?: PlanId): Progress {
  const p = loadProgress();
  p.plan = plan; p.planId = plan === "pago" ? planId ?? "mensual" : undefined;
  saveProgress(p); return p;
}
export function resetProgress() { try { localStorage.removeItem(KEY); } catch {} }
