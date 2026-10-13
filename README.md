# Amanos web (demo 19 oct)

Frontend Next.js 14 + Tailwind + MediaPipe. Funciona sin backend: señas desde `lib/signs.ts`, progreso y muestras en localStorage.

## Correr
```bash
npm install          # también descarga el modelo de manos a public/models (postinstall)
cp .env.example .env.local
npm run dev
```
Abrí http://localhost:3000. Si el modelo no se descargó (`npm run get-model` lo reintenta), la app usa el CDN de respaldo.

## Flujo de la demo (5 min)
1. `/` landing con la promesa y waitlist (captura `?utm_source=`).
2. `/login` → "Continuar con Google" (simulado).
3. `/app` dashboard: X/10 dominadas, racha, plan.
4. `/app/unidad/1` → `/app/sena/a` video + descripción.
5. `/app/practica/a` cámara: score en vivo, al sostener 90% por 1 s sale "Seña dominada".
6. La 4ta seña (`l`) pide plan: `/app/paywall` → "Activar por $5/mes" (mock, no cobra).
7. Vuelve al dashboard con el avance.

## Antes de la demo (orden)
1. **Grabar muestras**: abrí `/capture`, elegí la seña, "Grabar 20 muestras", "Guardar tanda". 2 o 3 tandas por persona que vaya a demostrar, para las 10 señas. Las muestras quedan en el navegador y ya se usan en la práctica.
2. **Compartir muestras con el equipo**: "Descargar a.json" y ponelo en `public/samples/a.json` (se suman a las locales).
3. **Videos**: `public/videos/<id>.mp4` (a, b, c, l, v, y, uno, tres, cinco, te-amo). Si falta, se ve un placeholder con la glosa.
4. **Afinar umbral**: `NEXT_PUBLIC_MASTER_THRESHOLD` (default 90) y `NEXT_PUBLIC_D_PERFECT` / `NEXT_PUBLIC_D_ZERO` en `.env.local` (ver `lib/classifier.ts`).
5. **Ensayar en la laptop y navegador de la demo**, con la luz del salón. Dar permiso de cámara una vez para que no vuelva a preguntar.

## Plan B en vivo
En `/app/practica/<id>` presioná la tecla **b**: el score se fija en 92 y la seña se marca dominada sola. Volvé a presionar para desactivar.
"Reiniciar progreso (demo)" está al final del dashboard.

## Cómo funciona la cámara
MediaPipe HandLandmarker corre en el navegador y saca 21 puntos de la mano. `lib/hand.ts` los normaliza (muñeca como origen, escala por tamaño de mano, espejo para mano izquierda). `lib/classifier.ts` compara contra las muestras grabadas con kNN (k=3) y mapea la distancia a 0-100. No hay red neuronal ni servidor; nada de video sale del dispositivo.

## Conectar backend
Definí `NEXT_PUBLIC_API_URL` y usá `lib/api.ts` (endpoints esperados: `GET /units`, `GET /signs/:id`, `GET/POST /progress`, `GET /auth/google`). `lib/auth.ts` y `lib/progress.ts` son los puntos a reemplazar.

## Estructura
```
app/            landing, login, capture, app/(dashboard, unidad, sena, practica, paywall)
components/     HandCamera (cámara + landmarks), ScoreRing, SignVideo, AppShell (nav + guard)
lib/            signs (seed), hand (MediaPipe), classifier (kNN), progress, auth, api
public/         mediapipe/wasm, models/, samples/, videos/
scripts/        get-model.mjs
```
