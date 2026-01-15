# TODO: Crear Worker en Render (crm2-worker)

Estado: pendiente (no creado en Render por falta de tarjeta de crédito).
Objetivo: crear el Background Worker exactamente como está declarado en `render.yaml` para evitar inconsistencias.

Pasos para crear el servicio en Render (UI)
1. Dashboard Render → Services → New → Background Worker.
2. Conectar repo: `mariolabbes-bot/crm2-produccion` y branch `main`.
3. Configurar:
   - Name: `crm2-worker`
   - Build Command: `cd backend && npm ci`
   - Start Command: `cd backend && npm run worker`
   - Region: oregon (o la que uses)
   - Plan: starter (o según tu preferencia)
4. Crear servicio.

Variables de entorno (mínimas)
- DATABASE_URL (cadena Postgres)
- JWT_SECRET
- REDIS_URL (si vas a usar Bull en producción)
- TWILIO_* / SMTP_* (opcional, solo si usarás providers reales)

Obtener Service ID (srv_...)
- Cuando el servicio esté creado, copia el Service ID desde la URL del servicio (https://dashboard.render.com/services/srv_xxxxx/overview) o desde Settings.
- Ejemplo: `srv_kj23h4kjasd`

Agregar secret a GitHub
- En GitHub repo `mariolabbes-bot/crm2-produccion` → Settings → Secrets and variables → Actions → New repository secret.
  - Name: `RENDER_SERVICE_ID_WORKER`
  - Value: `srv_xxxxx` (el Service ID copiado)
- También añadir `RENDER_API_KEY` (API key de Render) si quieres que los workflows ejecuten deploys vía API.

Provisionamiento Redis (opcional)
- Si quieres usar Bull en producción, provisiona Redis (Upstash, Redis Cloud, etc.) y añade `REDIS_URL` como env var en el servicio render (o con `scripts/render/set_env.sh`).

Verificar y probar
1. Desde GitHub Actions ejecuta `Deploy Worker to Render` (workflow dispatch) o haz un push a `main` si el workflow está configurado.
2. En Render → Services → crm2-worker → Logs: revisar build y start logs.
3. Verificar que el worker ejecute jobs: encolar una tarea desde `/api/assistant/parse` y ver que `assistant_audit` recibe `done`/`failed`.

Rollback / limpieza
- Para desactivar temporalmente el worker, pausa el servicio en Render o deshabilita el workflow `deploy-worker.yml`.

Notas
- El repo ya tiene `render.yaml` con `crm2-worker` definido; si quieres consistencia, importa `render.yaml` en Render o crea el servicio con el mismo nombre y comandos.
- Mantener registro de `srv_...` en GitHub Secrets evita errores en deploys automatizados.

---

Cuando quieras que proceda automáticamente (crear PR con estos archivos, o abrir un Issue/Task en GitHub) dime y lo hago.
