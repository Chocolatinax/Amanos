// Download models locally for camera practice; remote assets remain a fallback.
import { mkdir, writeFile, stat } from 'node:fs/promises';
const base = 'https://storage.googleapis.com/mediapipe-models';
const models = [
  ['hand_landmarker', `${base}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`],
  ['pose_landmarker_lite', `${base}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`],
  ['face_landmarker', `${base}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`],
];
await mkdir('public/models', { recursive: true });
for (const [name, url] of models) {
  const output = `public/models/${name}.task`;
  try { if ((await stat(output)).size > 1_000_000) { console.log(`[amanos] ${name} disponible`); continue; } } catch {}
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(String(response.status));
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1_000_000) throw new Error('Modelo incompleto');
    await writeFile(output, buffer);
    console.log(`[amanos] ${name} descargado`);
  } catch (error) { console.warn(`[amanos] ${name}: se usará el respaldo remoto (${error.message})`); }
}
