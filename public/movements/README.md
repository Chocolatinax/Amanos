# Referencias de movimiento de la demo

`a.json`, `tu.json` y `gracias.json` conservan todos los cuadros originales de MediaPipe Holistic, con manos, cuerpo, fps, tamaño de imagen y marcas de interpolación. El índice es `manifest.json`.

Estos archivos son referencias de captura para desarrollar el reconocimiento de cámara. No son un modelo entrenado ni muestras compatibles con `hand-world-v2`: las manos usan coordenadas normalizadas de imagen, mientras el clasificador actual usa coordenadas métricas de HandLandmarker. No convertirlas cambiando solamente la etiqueta de versión.

Para evaluar TÚ se debe incluir ubicación respecto al cuerpo; GRACIAS requiere comparar la secuencia completa. La práctica actual conserva su evaluación existente y no otorga aprobación automática a estas dos señas.

El avatar usa una copia de los mismos datos en `/avatar/landmarks`, con las correcciones visuales separadas en `demo-corrections.js`. Las correcciones visuales no se agregan a las referencias de reconocimiento.

Para actualizar los recursos desde `avatar-senas`, ejecutar `node scripts/sync-avatar-demo.cjs` desde la raíz de la web.
