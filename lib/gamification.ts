// Reglas de XP, racha y meta diaria. Archivo puro (sin imports): se copia tal cual a api/src/progress/gamification.ts.
// Si cambiás una regla acá, cambiala también allá (hay una prueba de paridad en scripts/test-gamification.cjs).
import type { AttemptResult, DayActivity, LevelInfo, Progress, SignProgress, Stats, WeekDay } from "./types";

export const DAILY_GOAL = 3; // señas distintas por día
export const XP_SEEN = 10; // primera vez que abrís una seña
export const XP_MASTERED = 50; // primera vez que la dominás
export const MASTER_THRESHOLD = 90;
export const LEVELS = [
  { n: 1, name: "Explorador", min: 0 },
  { n: 2, name: "Aprendiz", min: 100 },
  { n: 3, name: "Aliado", min: 250 },
  { n: 4, name: "Practicante", min: 450 },
  { n: 5, name: "Comunicador", min: 700 },
];
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const pad = (n: number) => String(n).padStart(2, "0");
/** Día calendario LOCAL (no UTC): en El Salvador un día UTC cambia a las 6 pm. */
export const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (day: string) => { const [y, m, d] = day.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (day: string, n: number) => { const d = parse(day); d.setDate(d.getDate() + n); return localDay(d); };
export const mondayIndex = (day: string) => (parse(day).getDay() + 6) % 7;

export const emptyDay = (): DayActivity => ({ seen: [], mastered: [], xp: 0, scores: [] });
const hasActivity = (a?: DayActivity) => !!a && (a.seen.length > 0 || a.mastered.length > 0);

export function levelFor(xp: number): LevelInfo {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.min) cur = l;
  const next = LEVELS.find(l => l.min > cur.min) ?? null;
  const progress = next ? Math.min(1, (xp - cur.min) / (next.min - cur.min)) : 1;
  return { n: cur.n, name: cur.name, min: cur.min, next: next ? next.min : null, progress };
}

/** XP total: el guardado, o (datos viejos sin XP) lo derivado de las señas. */
export function totalXp(p: Progress): number {
  if (typeof p.xp === "number") return p.xp;
  return Object.values(p.signs).reduce((s, sp) => s + (sp.seen ? XP_SEEN : 0) + (sp.mastered ? XP_MASTERED : 0), 0);
}

export function streaks(p: Progress, today: string): { current: number; best: number } {
  const days = Object.keys(p.activity ?? {}).filter(d => hasActivity(p.activity![d])).sort();
  if (!days.length) {
    // Datos viejos sin actividad por día.
    const legacyAlive = p.lastActive === today || p.lastActive === addDays(today, -1);
    return { current: legacyAlive ? p.streak : 0, best: p.streak };
  }
  const set = new Set(days);
  let best = 0, run = 0, prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  // La racha sigue viva si hoy o ayer hubo actividad.
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) { current++; cursor = addDays(cursor, -1); }
  return { current, best };
}

export function weekOf(p: Progress, today: string): WeekDay[] {
  const monday = addDays(today, -mondayIndex(today));
  return DAY_LABELS.map((label, i) => {
    const date = addDays(monday, i);
    const a = p.activity?.[date];
    const done = hasActivity(a);
    const scores = a?.scores ?? [];
    const avgScore = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : null;
    const state: WeekDay["state"] = date === today ? (done ? "today-done" : "today") : date > today ? "future" : done ? "done" : "missed";
    return { date, label, state, avgScore };
  });
}

export function computeStats(p: Progress, totalSigns: number, today = localDay()): Stats {
  const signs = Object.values(p.signs);
  const scored = signs.filter(s => s.bestScore > 0);
  const t = p.activity?.[today];
  const xp = totalXp(p);
  const { current, best } = streaks(p, today);
  return {
    streak: current,
    bestStreak: best,
    xp,
    level: levelFor(xp),
    mastered: signs.filter(s => s.mastered).length,
    seen: signs.filter(s => s.seen).length,
    totalSigns,
    avgScore: scored.length ? Math.round((scored.reduce((x, s) => x + s.bestScore, 0) / scored.length) * 10) / 10 : null,
    todayCount: t ? new Set([...t.seen, ...t.mastered]).size : 0,
    dailyGoal: DAILY_GOAL,
    xpToday: t?.xp ?? 0,
    week: weekOf(p, today),
  };
}

const clone = (p: Progress): Progress => JSON.parse(JSON.stringify(p));
const day = (p: Progress, today: string) => (p.activity ??= {})[today] ??= emptyDay();
const addUnique = (arr: string[], v: string) => { if (!arr.includes(v)) arr.push(v); };

/** Abrir una seña. Devuelve un progreso nuevo (no muta el original). */
export function applySeen(prev: Progress, signId: string, today = localDay()): { progress: Progress; xpGained: number } {
  const p = clone(prev);
  const cur: SignProgress = p.signs[signId] ?? { seen: false, bestScore: 0, mastered: false };
  const first = !cur.seen;
  p.signs[signId] = { ...cur, seen: true };
  const d = day(p, today);
  addUnique(d.seen, signId);
  const xpGained = first ? XP_SEEN : 0;
  d.xp += xpGained;
  p.xp = totalXp(prev) + xpGained;
  p.lastActive = today;
  return { progress: p, xpGained };
}

/** Intento con puntaje de similitud 0-100. Domina la seña si llega al umbral. */
export function applyAttempt(prev: Progress, signId: string, score: number, today = localDay(), threshold = MASTER_THRESHOLD, now = new Date()): { progress: Progress } & AttemptResult {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const p = clone(prev);
  const cur: SignProgress = p.signs[signId] ?? { seen: false, bestScore: 0, mastered: false };
  const seenFirst = !cur.seen;
  const newlyMastered = !cur.mastered && s >= threshold;
  p.signs[signId] = {
    ...cur,
    seen: true,
    bestScore: Math.max(cur.bestScore, s),
    mastered: cur.mastered || s >= threshold,
    masteredAt: newlyMastered ? now.toISOString() : cur.masteredAt,
    attempts: (cur.attempts ?? 0) + 1,
  };
  const d = day(p, today);
  addUnique(d.seen, signId);
  let xpGained = seenFirst ? XP_SEEN : 0;
  if (s >= threshold) { addUnique(d.mastered, signId); (d.scores ??= []).push(s); }
  if (newlyMastered) xpGained += XP_MASTERED;
  d.xp += xpGained;
  p.xp = totalXp(prev) + xpGained;
  p.lastActive = today;
  return { progress: p, newlyMastered, xpGained };
}
