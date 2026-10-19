# Admin y práctica móvil

## Acceso local

- Web: `http://localhost:3000/login`. Iniciar con Google usando `codirrl@gmail.com`.
- Panel: `http://localhost:3000/app/admin` o menú de cuenta → Administrar Amanos.
- API: `http://localhost:4000`. La configuración local está en `api/.env.local`, ignorada por Git. Base local: `api/amanos.local.sqlite`.
- La API requiere Node 22 o superior por la versión instalada de Google Auth. En esta máquina se arrancó con el runtime Node 24 de Codex.
- Compilar API: `cd api`, `npm ci`, `npm run build`; arrancar: `node --env-file=.env.local dist/main.js`.

El permiso se verifica en cada petición usando el JWT firmado, el proveedor Google y el identificador Google almacenado. Un correo escrito en el login de demo o un `isAdmin` modificado en el navegador no concede acceso. Las sesiones anteriores a este cambio deben volver a entrar por Google para administrar.

## Contenido y referencias

Permite editar textos, mostrar/ocultar señas, pausar evaluación, cargar/descargar/restaurar JSON compatibles y listar usuarios por páginas. Detecta cambios simultáneos mediante revisiones. Los cambios se reflejan al abrir la app o volver a enfocarla; quien guarda los ve inmediatamente.

Los JSON de movimientos del avatar no son referencias del evaluador. El servidor valida el formato y la seña antes de guardar. GRACIAS y MUCHO GUSTO siguen teniendo comprobación parcial de movimiento; YO y BUENOS DÍAS todavía no tienen un evaluador habilitado. La cámara no sustituye silenciosamente una referencia administrada por una anterior si falla la conexión.

## Antes de desplegar

1. Ejecutar en el SQL Editor de Supabase `api/supabase/migrations/20261018_admin_sign_settings.sql`.
2. En Render conservar las variables existentes y configurar `ADMIN_EMAIL=codirrl@gmail.com`. Mantener `ALLOW_DEMO_AUTH=false` y `DB_SYNC=false` en producción.
3. Desplegar la API y después la web. Vercel debe usar la URL pública de Render en `NEXT_PUBLIC_API_URL`, nunca localhost.

La migración habilita RLS sin políticas públicas en la tabla de administración. El backend accede con su conexión de base de datos existente. Se ejecutó en Supabase el 19 de octubre de 2026: se verificaron las cinco columnas de `sign_settings`, RLS habilitado, ausencia de permisos para `anon` y `authenticated`, y lectura desde la conexión del backend. Los cambios de la API y la web todavía deben desplegarse.

## Móvil

La práctica ocupa el viewport dinámico y respeta las áreas seguras. En pantallas pequeñas, la imagen completa de cámara ocupa una zona independiente del avatar, las indicaciones y los controles. Hay distribución horizontal y vista ampliada del avatar. La cámara se pausa al salir de la pestaña o ampliar la referencia; se liberan los recursos al desactivar.

Para probar cámara en un iPhone físico, usar una URL HTTPS (por ejemplo, el despliegue Vercel actualizado). La dirección HTTP de la computadora en la red local no habilita cámara en Safari. No se ha realizado una prueba en un iPhone físico; falta verificar permisos, giro de pantalla y detección con sus cámaras reales.

Validación: pruebas de API (incluyendo autorización, contenido, referencias, usuarios), pruebas de catálogo y carga de referencias, compilación TypeScript y Next.js. No se usaron credenciales Google reales en las pruebas automáticas.
