"use client";
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";

export type Vec = number[]; // 63 = 21 puntos x (x,y,z) normalizados

// Todo se sirve desde /public para no depender de internet en la demo. El CDN queda de respaldo.
const WASM_LOCAL = "/mediapipe/wasm";
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_LOCAL = "/models/hand_landmarker.task";
const MODEL_CDN = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let landmarker: HandLandmarker | null = null;
let loading: Promise<HandLandmarker> | null = null;

async function exists(url: string) {
  try { const r = await fetch(url, { method: "HEAD" }); return r.ok && Number(r.headers.get("content-length") ?? 1) > 1000; } catch { return false; }
}

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (landmarker) return landmarker;
  if (!loading) {
    loading = (async () => {
      const [wasmOk, modelOk] = await Promise.all([exists(`${WASM_LOCAL}/vision_wasm_internal.wasm`), exists(MODEL_LOCAL)]);
      const vision = await FilesetResolver.forVisionTasks(wasmOk ? WASM_LOCAL : WASM_CDN);
      const make = (delegate: "GPU" | "CPU") => HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: modelOk ? MODEL_LOCAL : MODEL_CDN, delegate },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      try { landmarker = await make("GPU"); } catch { landmarker = await make("CPU"); }
      return landmarker;
    })().catch(e => { loading = null; throw e; });
  }
  return loading;
}

/**
 * Normaliza 21 landmarks: origen en la muñeca (0), escala por distancia muñeca -> base del dedo medio (9),
 * y espeja la mano izquierda para que ambas manos compartan referencia.
 */
export function normalize(result: HandLandmarkerResult): Vec | null {
  const lm = result.landmarks?.[0];
  if (!lm || lm.length !== 21) return null;
  const handed = result.handedness?.[0]?.[0]?.categoryName ?? "Right";
  const flip = handed === "Left" ? -1 : 1;
  const w = lm[0], m = lm[9];
  const scale = Math.hypot(m.x - w.x, m.y - w.y, m.z - w.z) || 1e-6;
  const out: number[] = [];
  for (const p of lm) {
    out.push(((p.x - w.x) * flip) / scale, (p.y - w.y) / scale, (p.z - w.z) / scale);
  }
  return out;
}

export function drawLandmarks(ctx: CanvasRenderingContext2D, result: HandLandmarkerResult, w: number, h: number, color = "#2f7cf6") {
  const lm = result.landmarks?.[0];
  if (!lm) return;
  const C = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.fillStyle = "#fff";
  for (const [a, b] of C) { ctx.beginPath(); ctx.moveTo(lm[a].x * w, lm[a].y * h); ctx.lineTo(lm[b].x * w, lm[b].y * h); ctx.stroke(); }
  for (const p of lm) { ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}
