// Tipos compartidos entre el front (modo local) y la API (api/src/progress/gamification.ts).
export type SignProgress = { seen: boolean; bestScore: number; mastered: boolean; masteredAt?: string; attempts?: number };
export type DayActivity = { seen: string[]; mastered: string[]; xp: number; scores?: number[] };
export type PlanId = "mensual" | "anual";
export type Progress = {
  signs: Record<string, SignProgress>;
  /** Legado: solo se usa si no hay `activity`. La racha real se deriva de `activity`. */
  streak: number;
  lastActive?: string;
  plan: "gratis" | "pago";
  planId?: PlanId;
  xp?: number;
  /** Actividad por día local (YYYY-MM-DD). */
  activity?: Record<string, DayActivity>;
};
export type User = { name: string; email: string; avatar?: string };

export type LevelInfo = { n: number; name: string; min: number; next: number | null; progress: number };
export type WeekDay = {
  date: string;
  label: string;
  state: "done" | "today-done" | "today" | "missed" | "future";
  avgScore: number | null;
};
export type Stats = {
  streak: number;
  bestStreak: number;
  xp: number;
  level: LevelInfo;
  mastered: number;
  seen: number;
  totalSigns: number;
  avgScore: number | null;
  todayCount: number;
  dailyGoal: number;
  xpToday: number;
  week: WeekDay[];
};
export type AttemptResult = { newlyMastered: boolean; xpGained: number };
