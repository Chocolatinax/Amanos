import { API_URL, hasBackend } from './api';

export function referencePath(id: string) {
  // Letras estáticas: muestras del clasificador. GRACIAS: comprobación de recorrido. El resto: referencias de evaluación.
  return ['a', 'b', 'c', 'i', 's'].includes(id) ? `/samples/${id}.json` : `/evaluation/${id}${id === 'gracias' ? '-movement' : ''}.json`;
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
