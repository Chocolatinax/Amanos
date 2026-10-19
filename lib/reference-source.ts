import { API_URL, hasBackend } from './api';

export function referencePath(id: string) {
  return ['a', 'b', 'c'].includes(id) ? `/samples/${id}.json` : `/evaluation/${id}${['gracias', 'mucho-gusto'].includes(id) ? '-movement' : ''}.json`;
}
export async function loadReference(id: string): Promise<unknown> {
  if (hasBackend()) {
    // Only a confirmed absence falls back. Connection failures must not silently
    // grade against an obsolete reference after an admin changed it.
    const response = await fetch(`${API_URL}/content/references/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (response.ok) return response.json();
    if (response.status !== 404) throw new Error('No se pudo cargar la referencia del servidor.');
  }
  const response = await fetch(referencePath(id), { cache: 'no-store' });
  return response.ok ? response.json() : null;
}
