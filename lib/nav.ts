import { SIGNS, STATIC_SIGN_IDS, getSign } from "./signs";
import type { Progress } from "./types";
import type { Sign } from './signs';

/** Próxima seña pendiente (o la primera si ya dominó todas). */
export function nextSign(p: Progress, signs: Sign[] = SIGNS) {
  return signs.find(s => !p.signs[s.id]?.mastered) ?? signs[0];
}
/** A dónde lleva "Práctica con cámara": la próxima letra evaluable pendiente. */
export function practiceTarget(p: Progress, signs: Sign[] = SIGNS) {
  const available = signs.filter(s => STATIC_SIGN_IDS.includes(s.id));
  return available.find(s => !p.signs[s.id]?.mastered) ?? available[0] ?? signs[0];
}
