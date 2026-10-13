// Punto único para conectar el backend NestJS.
// Si NEXT_PUBLIC_API_URL está vacío, todo cae al seed local + localStorage.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const hasBackend = () => Boolean(API_URL);

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}
export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}
// Endpoints esperados del back:
// GET  /units                -> Unit[]
// GET  /signs/:id            -> Sign
// GET  /progress             -> Progress
// POST /progress { signId, score }
