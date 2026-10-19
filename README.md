# Amanos · demo de 11 señas

## Ejecutar

`npm install`, `npm run dev`. Abrir http://localhost:3000.
`npm run get-model` descarga el modelo; hay respaldo por CDN.
`npm test` ejecuta las pruebas de reconocimiento y de XP/racha. `npm run build` verifica la aplicación.

### Modo local vs. con backend

- **Modo local (por defecto)**: sin `NEXT_PUBLIC_API_URL` todo vive en `localStorage` del navegador. Es lo más seguro para la demo en vivo: no depende de internet ni de un servidor.
- **Modo API**: con `NEXT_PUBLIC_API_URL=http://localhost:4000` el progreso, la racha, el XP y el plan se guardan en la API. Si el servidor se cae, la app sigue funcionando en local y muestra un aviso.
- Variables del front (`.env.local`, ver `.env.example`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_MASTER_THRESHOLD`. Sin client id de Google, el botón "Continuar con Google" hace un login de demo simulado.

## Backend (carpeta `api/`)

NestJS + TypeORM. Por defecto guarda en un archivo SQLite (sql.js, sin compilar nada nativo); con `DATABASE_URL` usa Postgres (Supabase, proyecto `amanos`, tablas ya creadas con `api/supabase/migrations`; pon la cadena de conexión del *Session pooler* en `api/.env` y `DB_SYNC=false`).

```
cd api && cp .env.example .env && npm install
npm run build && npm start        # http://localhost:4000  (Swagger en /docs)
npm test                          # paridad con el front + pruebas e2e
```

Endpoints: `GET /health`, `GET /catalog`, `GET /plans`, `POST /auth/demo`, `POST /auth/google`, `GET /me`, `GET /progress`, `POST /progress/seen`, `POST /progress/attempts`, `DELETE /progress`, `PUT|DELETE /subscription`, `POST /waitlist`.

Notas de diseño y límites honestos:
- Las reglas de XP, racha y meta diaria viven en `lib/gamification.ts` y se copian tal cual a `api/src/progress/gamification.ts`; una prueba falla si dejan de ser idénticas.
- Los días se calculan en `America/El_Salvador` (no UTC).
- El puntaje es **similitud** calculada en el navegador. La API lo acota a 0-100 pero no puede verificarlo, así que el progreso no es a prueba de trampa.
- La suscripción es un **mock**: no hay cobro real. El login de demo se desactiva en producción (`ALLOW_DEMO_AUTH`). Google verifica el ID token en el servidor con `GOOGLE_CLIENT_ID`.
- Con SQLite las tablas se crean solas. Con Supabase el esquema viene de la migración SQL y RLS está activo sin políticas: solo la API (rol postgres) puede leer y escribir, la API REST pública de Supabase no ve nada.

## Vocabulario acordado

| Seña | Tipo | Página del material del equipo |
| --- | --- | --- |
| A, B, C | Estática | 12–20 |
| Buenos días, buenas tardes | Con movimiento | 27 |
| Hola | Con movimiento | Video disponible |
| Adiós | Con movimiento | 21 |
| Yo, tú | Estática con ubicación | 29 |
| Mucho gusto | Con movimiento | 25 |
| Gracias | Con movimiento | 22 |

Las páginas provienen de la lista del equipo; no equivalen a validación lingüística.
Todos los ejercicios están accesibles en la demo sin pasar por el plan de pago.

## Preparar las referencias

1. Validar las posturas y videos con una persona que domine LESSA.
2. Abrir `/capture`: grabar y guardar al menos 20 muestras para **cada una de A, B y C**.
   Hacer varias tandas, con distintas personas, iluminación e inclinaciones naturales.
   Guardar una postura incorrecta como referencia enseñará ese error al comparador.
3. Descargar `a.json`, `b.json`, `c.json` y colocarlos en `public/samples/` para compartirlos.
   Las muestras guardadas en un navegador no se sincronizan con otros dispositivos.
4. Las muestras nuevas usan `version: "hand-world-v2"`. Las anteriores no son compatibles:
   volver a grabarlas. Se conservan en su antigua clave, pero no se utilizan.
5. Agregar videos revisados a `public/videos/` con los nombres:
   `a.mp4`, `b.mp4`, `c.mp4`, `buenos-dias.mp4`, `buenas-tardes.mp4`, `adios.mp4`,
   `yo.mp4`, `tu.mp4`, `mucho-gusto.mp4`, `gracias.mp4`.
   HOLA utiliza el video existente `public/videos/hola.mp4` y se conserva como práctica guiada adicional.
6. Ensayar en el equipo de la demo con personas y tomas que no estén en las referencias.
   Probar también letras equivocadas, posturas desconocidas, dos manos, pérdida de mano y cambios de luz.

## Qué evalúa esta versión

A, B y C: MediaPipe detecta la mano; se normalizan sus 21 puntos en coordenadas mundiales,
con unidades consistentes y espejo de lateralidad. Se conserva la orientación porque también
puede ser parte de la seña. El comparador busca la mejor clase entre las tres, exige referencias
completas y rechaza resultados demasiado cercanos entre clases. Un segundo continuo de
reconocimiento permite completar la práctica; un corte mayor de 250 ms reinicia el intento.

El porcentaje representa **similitud**, no probabilidad ni precisión medida. Los umbrales siguen
siendo iniciales y deben calibrarse con tomas independientes. Las pruebas sintéticas verifican
las reglas del programa, no la calidad del reconocimiento con personas reales.

Las otras ocho señas ofrecen práctica guiada con cámara, sin puntuación ni aprobación automática.
Reconocerlas requiere secuencias y/o referencias corporales; no se evaluarán como una foto de mano.
No se inventaron sus configuraciones: las instrucciones esperan el material revisado del equipo.

Se eliminó el atajo que fijaba 92. El progreso nuevo usa `amanos.progress.v2` para no heredar
aprobaciones simuladas. El progreso viejo permanece almacenado, pero no se presenta como válido.

## Avatar

El proyecto vecino `avatar-senas` mantiene cuerpo y mano en sus referencias respectivas al mover
el brazo, conserva el signo de la profundidad y aplica el intercambio de manos en IK.
La interpolación se limita a 0.10 segundos, marca los puntos generados y reporta cobertura real.
Reextraer desde los videos originales: los JSON antiguos ya rellenados no permiten recuperar
qué cuadros fueron inventados. Revisar visualmente brazos, pulgares y orientación antes de exportar.
Pruebas del extractor: `python -m unittest test_extraction.py` desde ese proyecto.

## Limitaciones

El repositorio todavía no contiene los videos ni las muestras de las diez señas acordadas.
No hay un modelo entrenado para movimiento, ubicación corporal o expresiones.
El plan comercial es una demo sin cobro. Solo A, B y C se evalúan con cámara; el resto es práctica guiada con video. La validación por señante nativo sigue pendiente.
