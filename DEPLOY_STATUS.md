# Estado de despliegue — registro rápido

Fecha: 2026-01-09
Responsable: mariolabbe (usuario)

Resumen general
- Se prepararon workflows de despliegue (backend, worker, frontend) y scripts auxiliares en el repo.
- Se instaló nvm y Node LTS (v24.12.0) en la máquina local.
- Se instaló Vercel CLI (v50.1.6) localmente y se verificó con `vercel whoami`.
- `VERCEL_TOKEN` fue generado en Vercel y guardado como secret en GitHub (secret `VERCEL_TOKEN`).
- El deploy del frontend puede dispararse desde GitHub Actions o con `vercel --prod` usando el token.
- El worker (Background Worker) queda sólo en el repo (definición `render.yaml` con `crm2-worker`) y su creación en Render está pendiente por falta de tarjeta de crédito.
- Smoke tests: pendientes. El script `scripts/smoke_tests.sh` está en el repo y debe ejecutarse cuando el backend esté accesible.

Acciones realizadas (pasos completados)
- Añadidos al repo: workflows `.github/workflows/deploy-backend.yml`, `deploy-worker.yml`, `deploy-frontend-vercel.yml`.
- Añadidos scripts: `scripts/render/set_env.sh`, `scripts/smoke_tests.sh`.
- `render.yaml` actualizado localmente para incluir `crm2-backend` y `crm2-worker` (definiciones de ejemplo).
- Instalación local: `nvm` y `node --lts` (v24.12.0), `npm` v11.6.2.
- Instalación local Vercel CLI: `vercel` v50.1.6.
- Verificación Vercel: `vercel whoami --token "$VERCEL_TOKEN"` retornó `mariolabbes-bot`.
- `VERCEL_TOKEN` guardado en GitHub Secrets (repo `mariolabbes-bot/crm2-produccion`).

Pendientes / bloqueos
- Crear servicio Background Worker en Render (requiere añadir tarjeta en Render o cambiar plan). Pendiente por decisión de despliegue.
- Agregar `RENDER_SERVICE_ID_WORKER` a GitHub Secrets después de crear el worker en Render.
- (Opcional) Provisionar Redis y añadir `REDIS_URL` en Render para usar Bull en prod.
- Ejecutar smoke tests y validar endpoints después de deploy.

Comandos y pasos para cuando vuelvas (rápido)
- Lanzar deploy frontend desde la raíz del repo:
```bash
cd "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2"
vercel --prod --token "$VERCEL_TOKEN" --yes --cwd ./frontend
```
- O disparar workflow desde GitHub Actions (Actions → Deploy Frontend to Vercel → Run workflow).
- Ejecutar smoke tests:
```bash
export API_URL="https://crm2-backend.onrender.com"
export TOKEN="<tu_token_si_es_necesario>"
./scripts/smoke_tests.sh
```
- Crear worker en Render (ver `TODO_WORKER.md`) y luego agregar secret `RENDER_SERVICE_ID_WORKER` en GitHub.

Notas rápidas
- Si no quieres usar Vercel CLI local, el workflow de GitHub Actions usará el secret y correrá `vercel` desde CI.
- Guarda las credenciales en un gestor seguro y rota los tokens regularmente.

---

Si quieres que al volver continúe automáticamente con: crear PR, ejecutar smoke tests (si me das credenciales), o crear el Issue/TODO en GitHub, dímelo y lo preparo para que sea un click. Buenviaje y hablamos cuando vuelvas.
