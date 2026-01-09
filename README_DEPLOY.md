# README - Deploy automation

Este documento explica cómo usar los workflows y scripts añadidos para desplegar el backend (Render), worker (Render) y frontend (Vercel).

Secrets GitHub necesarios
- RENDER_API_KEY: API key de Render con permisos para desplegar
- RENDER_SERVICE_ID_BACKEND: ID del servicio Web (Render)
- RENDER_SERVICE_ID_WORKER: ID del servicio Worker (Render)
- VERCEL_TOKEN: token de Vercel (para CLI deploy)

Notas rápidas
1. Añade los secrets en GitHub > Settings > Secrets & variables > Actions.
2. El workflow `deploy-backend.yml` se dispara automáticamente en push a `main` y llamará a la API de Render para crear un nuevo deploy del servicio backend.
3. El workflow `deploy-worker.yml` se puede lanzar manualmente desde GitHub Actions (workflow_dispatch) y encolará un nuevo deploy del servicio worker en Render.
4. El workflow `deploy-frontend-vercel.yml` se dispara en push a `main` y ejecuta `vercel --prod` usando el token proporcionado.

Usar `scripts/render/set_env.sh`
- Exporta `RENDER_API_KEY` y ejecuta:

```bash
export RENDER_API_KEY="<tu_api_key>"
./scripts/render/set_env.sh $RENDER_SERVICE_ID_BACKEND DATABASE_URL="postgres://..." JWT_SECRET="..." REDIS_URL="redis://..."
```

Ejecutar smoke tests localmente
- Levanta backend y (opcional) worker como en la README del proyecto.
- Ejecuta:
```bash
export API_URL=http://localhost:3001
./scripts/smoke_tests.sh
```

Seguridad
- No pongas valores sensibles en archivos del repo. Usa los Secrets de GitHub y los env vars en Render/Vercel.

Si quieres que yo cree un PR con estos cambios (workflow + scripts + README), lo hago y te avisaré para que agregues los secrets y merges el PR.
