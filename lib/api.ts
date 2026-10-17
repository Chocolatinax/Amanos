// Cliente de la API NestJS (carpeta /api). Si NEXT_PUBLIC_API_URL está vacío, la app corre 100% local.
import type { AttemptResult, PlanId, Progress, Stats, User } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
export const hasBackend = () => Boolean(API_URL);
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
  get isNetwork() { return this.status === 0; }
}

async function request<T>(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch { throw new ApiError(0, "No se pudo conectar con el servidor."); }
  if (!r.ok) {
    let msg = `Error ${r.status}`;
    try { const j = await r.json(); msg = Array.isArray(j.message) ? j.message.join(", ") : j.message ?? msg; } catch {}
    throw new ApiError(r.status, msg);
  }
  return r.status === 204 ? (undefined as T) : r.json();
}

export type Envelope = { progress: Progress; stats: Stats };
export type AuthResponse = { accessToken: string; user: User };
export type Plan = { id: PlanId; nombre: string; precio: number; moneda: string; intervalo: "mes" | "año"; etiqueta?: string };

export const api = {
  health: () => request<{ status: string }>("/health"),
  loginDemo: (email: string, name?: string) => request<AuthResponse>("/auth/demo", { method: "POST", body: { email, name } }),
  loginGoogle: (credential: string) => request<AuthResponse>("/auth/google", { method: "POST", body: { credential } }),
  me: (t: string) => request<{ user: User }>("/me", { token: t }),
  progress: (t: string) => request<Envelope>("/progress", { token: t }),
  seen: (t: string, signId: string) => request<Envelope>("/progress/seen", { method: "POST", body: { signId }, token: t }),
  attempt: (t: string, signId: string, score: number) =>
    request<Envelope & { result: AttemptResult }>("/progress/attempts", { method: "POST", body: { signId, score }, token: t }),
  reset: (t: string) => request<Envelope>("/progress", { method: "DELETE", token: t }),
  plans: () => request<Plan[]>("/plans"),
  subscribe: (t: string, planId: PlanId) => request<Envelope>("/subscription", { method: "PUT", body: { planId }, token: t }),
  cancel: (t: string) => request<Envelope>("/subscription", { method: "DELETE", token: t }),
  waitlist: (email: string, source: string) => request<{ ok: true }>("/waitlist", { method: "POST", body: { email, source } }),
};
