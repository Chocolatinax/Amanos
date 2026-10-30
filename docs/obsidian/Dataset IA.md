---
tags: [amanos, ia, dataset]
---
# Dataset IA

Cómo se entrena la IA que valida señas. Depende de [[Diccionario LESSA]] y de [[Plan de grabacion]].

## Requerimientos funcionales
| Código | Requerimiento | Prioridad |
|---|---|---|
| RF-47 | Diccionario LESSA estructurado con keypoints por seña | Must |
| RF-48 | Herramienta interna de captura (keypoints etiquetados por seña, señante, dispositivo) | Must |
| RF-49 | Grabar múltiples muestras consecutivas de la misma seña | Must |
| RF-50 | Exportar dataset versionado (JSON o Parquet) | Should |
| RF-51 | Modelo ejecutable en el navegador (TensorFlow.js) | Should |

## Historias
- #15 Diccionario LESSA con keypoints (Must, 5 días)
- #16 Herramienta de captura (Must, 3 días)
- #17 Entrenar y evaluar el modelo (Should, 8 días)

## Cómo aprende
1. **Fase 1 (MVP, sin entrenar)**: DTW (dynamic time warping) entre la secuencia del usuario y las muestras de referencia, sobre keypoints normalizados. Score 0 a 100. Suficiente para señas estáticas.
2. **Fase 2**: clasificador de secuencias (GRU o Transformer pequeño) con ~3,000 muestras. Augmentación: espejo (zurdos), ruido, escala, recorte temporal. Split por señante. Export a TF.js.
3. **Fase 3**: feedback por componente comparando configuración de mano, posición y trayectoria por separado.

## Meta de calidad
RNF-11: 90% accuracy en estáticas, 80% en dinámicas, evaluado con split por señante.

## Herramienta de captura
Página web interna: elegís la seña, cuenta regresiva, graba 3 segundos, extrae keypoints en el cliente y los guarda etiquetados. Permite 10+ muestras seguidas. Registra señante, mano dominante y dispositivo.

Relacionado: [[Camara IA]], [[Admin CMS]], [[Stack]]
