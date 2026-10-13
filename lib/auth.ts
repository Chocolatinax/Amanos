"use client";
// Auth mock para la demo. Cuando el back tenga Google OAuth + JWT, reemplazar por el flujo real.
export type User = { name: string; email: string; avatar?: string };
const KEY = "amanos.user.v1";
export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function loginDemo(user?: Partial<User>) {
  const u: User = { name: user?.name ?? "Chris", email: user?.email ?? "demo@amanos.app", avatar: user?.avatar };
  localStorage.setItem(KEY, JSON.stringify(u)); return u;
}
export function logout() { localStorage.removeItem(KEY); }
