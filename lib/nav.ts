import { SIGNS, STATIC_SIGN_IDS, getSign } from "./signs";
import type { Progress } from "./types";

/** Próxima seña pendiente (o la primera si ya dominó todas). */
export function nextSign(p: Progress) {
  return SIGNS.find(s => !p.signs[s.id]?.mastered) ?? SIGNS[0];
}
/** A dónde lleva "Práctica con cámara": la próxima letra evaluable pendiente. */
export function practiceTarget(p: Progress) {
  const id = STATIC_SIGN_IDS.find(i => !p.signs[i]?.mastered) ?? STATIC_SIGN_IDS[0];
  return getSign(id)!;
}
