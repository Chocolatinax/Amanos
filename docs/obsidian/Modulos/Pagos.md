---
tags: [amanos, modulo, pagos]
fase: Lanzamiento
---
# Pagos

Un solo plan: $5/mes. El paywall aparece solo al intentar usar la cámara.

## Requerimientos funcionales
| Código | Requerimiento | Prioridad |
|---|---|---|
| RF-31 | Único plan de $5/mes | Must |
| RF-32 | Checkout con Stripe o pasarela local | Must |
| RF-33 | Webhook actualiza estado de suscripción | Must |
| RF-34 | Paywall solo en cámara, nunca en contenido | Must |
| RF-35 | Cancelar suscripción desde el perfil | Must |
| RF-36 | Bloquear cámara con suscripción vencida | Must |

## Historias de usuario
- #10 Suscribirme por $5/mes (Must, 3 días)
- #11 Probar la cámara con 3 señas gratis (Should, 1 día)

## Fase
Lanzamiento

Relacionado: [[Camara IA]], [[Auth y perfil]], [[Stack]]
