"use client";
// Sesión en el navegador. Modo local: solo el usuario. Modo API: usuario + JWT.
import type { User } from "./types";
export type { User } from "./types";

const USER_KEY = "amanos.user.v1";
const TOKEN_KEY = "amanos.token.v1";

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try { const r = localStorage.getItem(USER_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function saveSession(user: User, token?: string) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}
export function clearSession() { try { localStorage.removeItem(USER_KEY); localStorage.removeItem(TOKEN_KEY); } catch {} }

/** "chris.renderos@correo.com" -> "Chris Renderos" */
export function nameFromEmail(email: string) {
  const base = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return base ? base.replace(/\b\w/g, c => c.toUpperCase()) : "Amigo";
}
