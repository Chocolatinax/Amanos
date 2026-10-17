import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";

export type Vec = number[];
export const FEATURE_VERSION = "hand-world-v2";

/** World coordinates use the same units on all axes, regardless of camera aspect ratio.
 * Keep palm orientation: removing all rotation would also erase meaningful sign differences.
 */
export function normalize(result: HandLandmarkerResult): Vec | null {
  if (result.landmarks.length !== 1) return null;
  const lm = result.worldLandmarks?.[0];
  const handed = result.handedness?.[0]?.[0];
  if (!lm || lm.length !== 21 || !handed || handed.score < 0.8) return null;
  if (lm.some(p => ![p.x, p.y, p.z].every(Number.isFinite))) return null;
  const w = lm[0], m = lm[9];
  const scale = Math.hypot(m.x - w.x, m.y - w.y, m.z - w.z);
  if (scale < 0.005) return null;
  const flip = handed.categoryName === "Left" ? -1 : 1;
  return lm.flatMap(p => [(p.x - w.x) * flip / scale, (p.y - w.y) / scale, (p.z - w.z) / scale]);
}
