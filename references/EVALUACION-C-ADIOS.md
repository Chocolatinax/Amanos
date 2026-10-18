# C y ADIÓS: referencias de evaluación

- C: 46 muestras de HandLandmarker float16/1 VIDEO, cuadros 65–110 del video del equipo. Se compara la forma y orientación en coordenadas world; se revisa la apertura pulgar–índice y se exige un segundo continuo. Las muestras están en `/samples/c.json` y los criterios en `/evaluation/c.json`.
- ADIÓS: 18 puntos temporales del tramo 60–113, con forma de mano y muñeca relativa a ambos hombros. `/evaluation/adios.json` usa el mismo HandLandmarker y PoseLandmarker lite que la cámara. La comparación ordenada tolera distinta velocidad, exige movimiento real y reinicia al perder la mano o el cuerpo.
- La secuencia es un prototipo a partir de un solo video. Las pruebas verifican los casos de referencia y rechazan mano quieta, puño de A, ubicación baja, pérdida de cuerpo y cámara interrumpida. No miden precisión en personas nuevas; falta calibración en vivo y revisión LESSA.
- Los movimientos del avatar están en `/movements/c.json` y `/movements/adios.json`; se generan con Holistic y no se usan como muestras world del clasificador. Los videos originales permanecen en `references/videos`, fuera de `public`.
- Regenerar las muestras: `python scripts/prepare-c-adios.py` (requiere mediapipe y opencv). Publicar los movimientos extraídos desde avatar-senas: `npm run sync-avatar`.

Ajuste de movimiento: ADIÓS compara ángulos de dedos, ubicación respecto a hombros y un recorrido de ida y vuelta de muñeca o mano. Tolera hasta 300 ms de pérdida sin aprobar cuadros ausentes y conserva el resultado entre muestras. La ventana temporal llega a 4.2 s; las pruebas incluyen ritmo lento, proporciones distintas y rechazo de temblores o desplazamiento en un solo sentido. La cara se procesa cada 300 ms para reducir carga.


Revisión de falsos positivos: el desplazamiento del brazo dejó de contar como vaivén. Se exigen al menos tres inversiones de muñeca con excursión significativa y amplitud total de 0.4 radianes, cuatro dedos extendidos y palma compatible con la referencia. Se eliminó el tramo de distancia que saturaba el resultado en 100%. Las pruebas negativas incluyen traslado del brazo, palma al revés, un único movimiento grande y oscilación pequeña. Estos criterios siguen siendo del prototipo basado en el video del equipo y requieren revisión LESSA y calibración en personas nuevas.


Calibración por reprocesamiento: se evalúa la apertura mediante medianas temporales de los cuatro dedos y proporción de cuadros con al menos tres dedos claramente extendidos. Un cierre evidente sigue reiniciando el intento. La ubicación se compara dentro de una zona admisible respecto a hombros, con tolerancia a altura y proporciones; se mantienen las restricciones absolutas y la orientación de palma. Se conserva el requisito de tres inversiones de muñeca. El reprocesamiento de la grabación del usuario pasó de cero aprobaciones a detectar el vaivén; esto no sustituye una prueba de cámara en vivo. Se agregaron regresiones para ruido breve de un dedo, altura de muñeca y C en movimiento.

