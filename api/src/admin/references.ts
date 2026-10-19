// Validate the same normalized formats consumed by the camera, never raw video landmarks.
const vector = (v: unknown, n: number) => Array.isArray(v) && v.length === n && v.every(x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 1000);
export function validReference(value: unknown, id: string): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as any;
  if (r.signId !== id || JSON.stringify(r).length > 900_000) return false;
  if (['a', 'b', 'c'].includes(id)) return r.version === 'hand-world-v2' && Array.isArray(r.samples) && r.samples.length >= 20 && r.samples.length <= 1000 && r.samples.every((v: unknown) => vector(v, 63));
  if (!Array.isArray(r.frames) || r.frames.length < 8 || r.frames.length > 600 || r.frames.some((f: any, i: number) => !f || !Number.isFinite(f.time) || f.time < 0 || (i > 0 && f.time <= r.frames[i - 1].time))) return false;
  if (id === 'adios') return r.version === 'hand-body-sequence-v1' && r.frames.every((f: any) => vector(f.shape, 63) && vector(f.anchor, 2));
  if (['gracias', 'mucho-gusto'].includes(id)) return r.version === 'movement-check-v1' && r.scope === 'body-motion-only' && r.mode === (id === 'gracias' ? 'sequence' : 'contact') && r.frames.every((f: any) => vector(f.wrists, 4));
  if (!['tu', 'hola', 'buenas-tardes'].includes(id) || r.version !== 'human-body-v1' || r.requiredHands !== 1 || r.mode !== (id === 'tu' ? 'hold' : 'sequence')) return false;
  if (!r.frames.every((f: any) => Number.isFinite(f.gap) && f.gap >= 0 && Array.isArray(f.hands) && f.hands.length === 1 && f.hands.every((h: any) => h && vector(h.features, 12) && vector(h.anchor, 4) && (id !== 'hola' || vector(h.thumb, 3))))) return false;
  if (id === 'buenas-tardes') {
    const phases = ['thumb-up', 'transition', 'flat'];
    if (r.frames.some((f: any, i: number) => !phases.includes(f.phase) || !vector(f.hands[0].thumbDirection, 3) || (i > 0 && phases.indexOf(f.phase) < phases.indexOf(r.frames[i - 1].phase)))) return false;
    if (['thumb-up', 'flat'].some(phase => r.frames.filter((f: any) => f.phase === phase).length < 4)) return false;
  }
  return true;
}
