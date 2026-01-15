# Release Notes - MVP (sin Asistente)

Fecha: 2026-01-08
Versión: 1.0.0-MVP

Resumen
-------
Se lanza la versión MVP del CRM sin el módulo "Asistente". Esta release contiene las funcionalidades core para la gestión de clientes, visualización de ventas y productos, e infraestructura básica para importaciones y despliegue.

Funcionalidades incluidas
-------------------------
- Autenticación y navegación (sidebar colapsable).
- Buscador de clientes con Autocomplete.
- Ficha de cliente con 4 tabs: Deuda, Ventas, Productos, Actividades.
- Endpoint `/api/client-detail/:rut/productos-6m` y su frontend asociado (mostrar venta mes actual, promedio 12m, relacion, precio promedio, última compra).
- Scripts y utilidades para importaciones existentes (sin el nuevo importador por mapeo).
- Worker/cola (Bull) preparada en backend; worker entrypoint y script `npm run worker` añadidos.

Notas de deploy
----------------
- Backend (Render): usar `render.yaml` en la raíz como plantilla o crear los servicios desde la UI con los comandos:
  - Web: `cd backend && npm ci && npm run start`
  - Worker: `cd backend && npm ci && npm run worker`
- Frontend (Vercel): asegúrate de establecer la variable pública que apunte al backend (ej. `REACT_APP_API_URL` o `NEXT_PUBLIC_API_URL`).
- Provisionar Redis solo si se va a usar el worker. Si no, el worker puede permanecer parado.

Smoke tests
-----------
Se incluye `scripts/smoke_tests.sh` como referencia para pruebas rápidas locales o en staging. Ajusta `API_URL` y `TOKEN` antes de ejecutarlo.

Tareas abiertas importantes
---------------------------
- Deploy worker en Render (Background Worker) y verificación E2E.
- Configurar Twilio/WhatsApp si se requiere envíos reales.
- Tests automatizados e integración continua.
- Monitorización y alertas (logs, jobs failed).

Instrucciones rápidas post-release
----------------------------------
1. Ejecutar migraciones en producción y validar tablas.
2. Hacer smoke tests en staging con `scripts/smoke_tests.sh`.
3. Verificar `assistant_audit` en base de datos si se hacen pruebas del asistente (aunque no se active en MVP).
4. Documentar cualquier incidente y crear tickets para fixes prioritarios.

Contacto
--------
Para dudas técnicas contactar a: equipo de desarrollo (ver `CREDENCIALES.md` para acceso a servicios).
