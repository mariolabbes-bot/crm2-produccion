# Release MVP checklist (sin Asistente)

Este archivo agrupa las tareas necesarias para lanzar el MVP sin el módulo "Asistente".

## Pre-deploy
- [ ] Revisar y ejecutar migraciones en la BD (asegúrate de tener backup).
- [ ] Verificar scripts de importación (ventas, abonos) y su output.
- [ ] Preparar variables de entorno para Render y Vercel.

## Deploy
- [ ] Backend: desplegar en Render (Web Service).
- [ ] Frontend: desplegar en Vercel.
- [ ] Ejecución de migraciones en el entorno de producción.

## Smoke tests (post-deploy)
- [ ] Clientes: búsqueda/autocomplete y navegación a ficha cliente.
- [ ] Ficha Cliente: tabs Deuda, Ventas, Productos, Actividades funcionan y muestran datos correctos.
- [ ] Productos tab: verifica endpoint `/api/client-detail/:rut/productos-6m` y columnas esperadas.
- [ ] Dashboard principal: métricas básicas y enlaces.
- [ ] Import scripts: ejecutar un run en staging con sample data.

## QA y pruebas
- [ ] Unit / Integration tests seleccionados (parser de datos, endpoints clave).
- [ ] Tests E2E básicos (login, búsqueda cliente, ver ficha cliente, export CSV).

## Monitoreo y operaciones
- [ ] Logging en Render: revisar worker/web logs.
- [ ] Alertas básicas (jobs failed, 5xx rate).
- [ ] Documentación operativa y runbook (cómo rollback, reinstalar migrations).

## Post-launch
- [ ] Recibir feedback y bug fixes críticos.
- [ ] Planificar backlog para el asistente en una siguiente versión.
