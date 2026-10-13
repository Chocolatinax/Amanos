"use client";
// Progreso en localStorage (modo demo). Cuando haya backend, lib/api.ts lo reemplaza.
export type SignProgress = { seen: boolean; bestScore: number; mastered: boolean; masteredAt?: string };
export type Progress = { signs: Record<string, SignProgress>; streak: number; lastActive?: string; plan: "gratis" | "pago" };

const KEY = "amanos.progress.v1";
export const THRESHOLD = Number(process.env.NEXT_PUBLIC_MASTER_THRESHOLD ?? 90);

const empty = (): Progress => ({ signs: {}, streak: 0, plan: "gratis" });

export function loadProgress(): Progress {
  if (typeof window === "undefined") return empty();
  try { const raw = localStorage.getItem(KEY); return raw ? { ...empty(), ...JSON.parse(raw) } : empty(); }
  catch { return empty(); }
}
export function saveProgress(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}
function touchStreak(p: Progress) {
  const today = new Date().toISOString().slice(0, 10);
  if (p.lastActive === today) return;
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  p.streak = p.lastActive === y ? p.streak + 1 : 1;
  p.lastActive = today;
}
export function markSeen(id: string) {
  const p = loadProgress();
  p.signs[id] = { ...(p.signs[id] ?? { seen: false, bestScore: 0, mastered: false }), seen: true };
  touchStreak(p); saveProgress(p); return p;
}
export function recordScore(id: string, score: number) {
  const p = loadProgress();
  const cur = p.signs[id] ?? { seen: true, bestScore: 0, mastered: false };
  const best = Math.max(cur.bestScore, score);
  const mastered = cur.mastered || score >= THRESHOLD;
  p.signs[id] = { ...cur, seen: true, bestScore: best, mastered, masteredAt: mastered && !cur.mastered ? new Date().toISOString() : cur.masteredAt };
  touchStreak(p); saveProgress(p); return p;
}
export function setPlan(plan: Progress["plan"]) { const p = loadProgress(); p.plan = plan; saveProgress(p); return p; }
export function resetProgress() { try { localStorage.removeItem(KEY); } catch {} }
