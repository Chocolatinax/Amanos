// Descarga el modelo de manos de MediaPipe a public/models para no depender de internet en la demo.
// Se corre solo en `npm install` (postinstall). Si falla, la app usa el CDN como respaldo.
import { mkdir, writeFile, stat } from "node:fs/promises";
const URL_ = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const out = "public/models/hand_landmarker.task";
try { const s = await stat(out); if (s.size > 1_000_000) { console.log("[amanos] modelo ya descargado"); process.exit(0); } } catch {}
try {
  await mkdir("public/models", { recursive: true });
  const r = await fetch(URL_); if (!r.ok) throw new Error(String(r.status));
  await writeFile(out, Buffer.from(await r.arrayBuffer()));
  console.log("[amanos] modelo descargado en", out);
} catch (e) { console.warn("[amanos] no se pudo descargar el modelo, se usará el CDN:", e.message); }
