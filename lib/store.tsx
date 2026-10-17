"use client";
// Estado global de la app: sesión, progreso y estadísticas.
// Modo local (sin NEXT_PUBLIC_API_URL): todo en localStorage. Modo API: la fuente de verdad es el servidor,
// con actualización optimista para que la UI no espere y la demo no se rompa si el servidor se cae.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, hasBackend } from "./api";
import { clearSession, getToken, getUser, nameFromEmail, saveSession } from "./auth";
import { applyAttempt, applySeen, computeStats, localDay } from "./gamification";
import { emptyProgress, loadProgress, resetProgress as resetLocal, saveProgress, setPlan as setPlanLocal, THRESHOLD } from "./progress";
import { SIGNS } from "./signs";
import type { AttemptResult, PlanId, Progress, Stats, User } from "./types";

type Ctx = {
  ready: boolean;
  user: User | null;
  progress: Progress;
  stats: Stats;
  mode: "local" | "api";
  /** true si el último cambio no se pudo sincronizar con el servidor. */
  syncError: boolean;
  loginEmail: (email: string, name?: string) => Promise<void>;
  loginGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  markSeen: (signId: string) => void;
  recordAttempt: (signId: string, score: number) => Promise<AttemptResult>;
  setPlan: (planId: PlanId | null) => Promise<void>;
  resetProgress: () => Promise<void>;
};

const Store = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(Store);
  if (!c) throw new Error("useApp fuera de <AppProvider>");
  return c;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const mode: Ctx["mode"] = hasBackend() ? "api" : "local";
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  const [serverStats, setServerStats] = useState<Stats | null>(null);
  const [syncError, setSyncError] = useState(false);
  const progressRef = useRef(progress); progressRef.current = progress;

  const stats = useMemo(() => serverStats ?? computeStats(progress, SIGNS.length), [serverStats, progress]);
  const tokenOf = () => getToken();

  const adopt = useCallback((p: Progress, s?: Stats) => {
    setProgress(p); setServerStats(s ?? null); saveProgress(p);
  }, []);

  const logout = useCallback(() => {
    clearSession(); setUser(null); setProgress(emptyProgress()); setServerStats(null);
  }, []);

  // Carga inicial de la sesión.
  useEffect(() => {
    (async () => {
      const u = getUser(); const t = getToken();
      if (!u || (mode === "api" && !t)) { if (u) clearSession(); setReady(true); return; }
      setUser(u);
      if (mode === "local") { setProgress(loadProgress()); setReady(true); return; }
      try { const e = await api.progress(t!); adopt(e.progress, e.stats); setSyncError(false); }
      catch (err) {
        if (err instanceof ApiError && err.status === 401) logout();
        else { setProgress(loadProgress()); setSyncError(true); } // servidor caído: seguimos con lo guardado
      }
      setReady(true);
    })();
  }, [mode, adopt, logout]);

  const afterLogin = useCallback(async (u: User, token?: string) => {
    saveSession(u, token); setUser(u);
    if (mode === "api" && token) {
      try { const e = await api.progress(token); adopt(e.progress, e.stats); setSyncError(false); }
      catch { setProgress(loadProgress()); setSyncError(true); }
    } else setProgress(loadProgress());
  }, [mode, adopt]);

  const loginEmail = useCallback(async (email: string, name?: string) => {
    const clean = email.trim().toLowerCase();
    if (mode === "api") { const r = await api.loginDemo(clean, name); await afterLogin(r.user, r.accessToken); }
    else await afterLogin({ name: name || nameFromEmail(clean), email: clean });
  }, [mode, afterLogin]);

  const loginGoogle = useCallback(async (credential: string) => {
    const r = await api.loginGoogle(credential); await afterLogin(r.user, r.accessToken);
  }, [afterLogin]);

  const markSeen = useCallback((signId: string) => {
    // Siempre se aplica: aunque la seña ya estuviera vista, abrirla cuenta como actividad del día (racha).
    const { progress: next } = applySeen(progressRef.current, signId, localDay());
    if (mode === "local") { adopt(next); return; }
    setProgress(next); setServerStats(null); saveProgress(next); // optimista
    const t = tokenOf(); if (!t) return;
    api.seen(t, signId).then(e => { adopt(e.progress, e.stats); setSyncError(false); }).catch(() => setSyncError(true));
  }, [mode, adopt]);

  const recordAttempt = useCallback(async (signId: string, score: number): Promise<AttemptResult> => {
    const local = applyAttempt(progressRef.current, signId, score, localDay(), THRESHOLD);
    adopt(local.progress); // optimista (también en modo API)
    if (mode === "local") return { newlyMastered: local.newlyMastered, xpGained: local.xpGained };
    const t = tokenOf();
    if (!t) return { newlyMastered: local.newlyMastered, xpGained: local.xpGained };
    try { const e = await api.attempt(t, signId, score); adopt(e.progress, e.stats); setSyncError(false); return e.result; }
    catch { setSyncError(true); return { newlyMastered: local.newlyMastered, xpGained: local.xpGained }; }
  }, [mode, adopt]);

  const setPlan = useCallback(async (planId: PlanId | null) => {
    if (mode === "local") { adopt(setPlanLocal(planId ? "pago" : "gratis", planId ?? undefined)); return; }
    const t = tokenOf(); if (!t) return;
    const e = planId ? await api.subscribe(t, planId) : await api.cancel(t);
    adopt(e.progress, e.stats);
  }, [mode, adopt]);

  const resetProgress = useCallback(async () => {
    if (mode === "api") { const t = tokenOf(); if (t) { try { const e = await api.reset(t); adopt(e.progress, e.stats); return; } catch {} } }
    resetLocal(); setProgress(emptyProgress()); setServerStats(null);
  }, [mode, adopt]);

  const value: Ctx = { ready, user, progress, stats, mode, syncError, loginEmail, loginGoogle, logout, markSeen, recordAttempt, setPlan, resetProgress };
  return <Store.Provider value={value}>{children}</Store.Provider>;
}
