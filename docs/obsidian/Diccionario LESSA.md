---
tags: [amanos, ia, diccionario]
---
# Diccionario LESSA

Una sola fuente de verdad: la misma tabla de señas alimenta [[Lecciones]], [[Admin CMS]] y el entrenamiento en [[Dataset IA]].

## Estructura por seña (JSON)
```json
{
  "id": "gracias",
  "glosa": "GRACIAS",
  "significado": "Gracias",
  "unidad": "saludos",
  "tipo": "dinamica",
  "manos": 1,
  "mano_dominante": true,
  "descripcion": {
    "configuracion_mano": "...",
    "ubicacion": "...",
    "movimiento": "...",
    "orientacion": "...",
    "expresion_facial": "..."
  },
  "errores_comunes": ["..."],
  "videos": {"frontal": "url", "lateral": "url", "lento": "url"},
  "muestras": [
    {
      "senante_id": "s01",
      "dispositivo": "android",
      "fecha": "2026-10-20",
      "fps": 30,
      "frames": [[0.12, 0.33, 0.01, "..."], "..."]
    }
  ],
  "validado_por": "Nombre",
  "fecha_validacion": "2026-10-20"
}
```

## Keypoints
- 21 puntos por mano x 3 coords (x, y, z) + pose opcional
- Normalizados respecto a la muñeca y al tamaño de la mano
- Frames x features por muestra

## Versionado
Git o bucket, un archivo por seña o un Parquet por versión.

Relacionado: [[Plan de grabacion]], [[Camara IA]]
