import type { BodyFrame } from "./body-tracking";
export type ContactReference = { version: "contact-guidance-v1"; signId: "mucho-gusto"; status: "partial-no-grade"; frames: { gap: number; height: number }[] };
export function parseContact(value: unknown): ContactReference | null {
  const r = value as ContactReference;
  return r?.version === "contact-guidance-v1" && r.signId === "mucho-gusto" && r.status === "partial-no-grade" && Array.isArray(r.frames) && r.frames.length >= 6 && r.frames.every(p => Number.isFinite(p.gap) && p.gap >= 0 && Number.isFinite(p.height)) ? r : null;
}
/** Contact can be coached from visible wrists, but it cannot validate occluded fingers. */
export function guideContact(body: BodyFrame | null, timestamp: number, reference: ContactReference | null) {
  const no = (feedback: string) => ({ accepted: false, similarity: 0, feedback });
  if (!reference) return no("Cargando la guía de contacto…");
  if (!body?.imageSize || timestamp < body.timestamp || timestamp - body.timestamp > 300) return no("Mostrá ambos brazos y muñecas completos.");
  const points = body.pose.landmarks[0];
  if (!points || [11, 12, 15, 16].some(i => !points[i] || (points[i].visibility ?? 0) < .55)) return no("No se ven ambas muñecas con claridad. Ajustá el encuadre.");
  const aspect = body.imageSize.width / body.imageSize.height;
  const [a, b, l, r] = [points[11], points[12], points[15], points[16]];
  const width = Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  if (!Number.isFinite(width) || width < .03) return no("Mostrá ambos hombros para revisar la ubicación.");
  const gap = Math.hypot((l.x - r.x) * aspect, l.y - r.y) / width;
  const height = ((l.y + r.y) - (a.y + b.y)) / 2 / width;
  const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  if (gap > median(reference.frames.map(p => p.gap)) + .18) return no("Acercá las manos para formar el contacto de MUCHO GUSTO.");
  if (Math.abs(height - median(reference.frames.map(p => p.height))) > .4) return no("Ajustá la altura de las manos frente al pecho, como la referencia.");
  return no("El contacto y la altura se parecen a la referencia. Los dedos quedan ocultos: esta guía todavía no da una nota completa.");
}
