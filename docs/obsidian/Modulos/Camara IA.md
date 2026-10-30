---
tags: [amanos, modulo, camara, ia]
fase: MVP piloto (estáticas) / Lanzamiento (dinámicas y feedback)
---
# Camara IA

Validación de la seña por cámara con % de precisión. Es el feature de pago y el corazón del producto. Todo corre en el navegador.

## Requerimientos funcionales
| Código | Requerimiento | Prioridad |
|---|---|---|
| RF-16 | Permiso explícito antes de activar la cámara | Must |
| RF-17 | Captura con cámara frontal desde el navegador | Must |
| RF-18 | Keypoints de manos y pose en el cliente, sin enviar video | Must |
| RF-19 | Comparar contra referencia y devolver precisión 0 a 100 | Must |
| RF-20 | Seña 'dominada' al alcanzar 90% | Must |
| RF-21 | Resultado en menos de 200 ms | Should |
| RF-22 | Indicar qué componente falló (mano, posición, movimiento) | Should |
| RF-23 | Usuario gratis prueba la cámara con 3 señas | Should |
| RF-24 | Aportar keypoints anónimos al dataset (opt-in) | Could |

## Historias de usuario
- #6 La cámara valida mi seña (Must, 10 días)
- #7 Saber qué parte me falló (Should, 4 días)

## Fase
MVP piloto (estáticas) / Lanzamiento (dinámicas y feedback)

Relacionado: [[Dataset IA]], [[Diccionario LESSA]], [[Pagos]], [[Stack]], [[Requerimientos no funcionales]]
