import { SIGNS } from "./signs";
import type { Progress } from "./types";
import { localDay } from "./gamification";

/** Reto del día: una seña pendiente, estable durante todo el día (rota según la fecha). */
export function dailyChallenge(p: Progress, today = localDay()) {
  const pending = SIGNS.filter(s => !p.signs[s.id]?.mastered);
  const pool = pending.length ? pending : SIGNS;
  const n = today.split("-").reduce((a, x) => a + Number(x), 0);
  return { sign: pool[n % pool.length], review: pending.length === 0 };
}
