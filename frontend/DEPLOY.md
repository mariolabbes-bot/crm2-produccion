# Deploy a Vercel (Frontend)

Esta app usa una estructura monorepo. Recomendamos que Vercel construya desde la carpeta `frontend` y use el `frontend/vercel.json`.

## Configuración recomendada

- Project Settings > General > Root Directory: `frontend`
- Build & Output Settings:
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Install Command: `npm install`
- Environment Variables:
  - `REACT_APP_API_URL=https://crm2-backend.onrender.com/api`
- Archivo de configuración usado: `frontend/vercel.json`

> Nota: Evita tener dos `vercel.json` activos (raíz y `frontend`) para prevenir conflictos. Si eliges `Root Directory = frontend`, ignora o elimina el `vercel.json` de la raíz.

## Rewrites (SPA)

`frontend/vercel.json` ya contiene:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://crm2-backend.onrender.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Flujo de Deploy

1. Hacer commit y push a `main`.
2. En Vercel, asegurarse de tener "Auto Deploy" activado para `main`.
3. Para despliegue manual, usar "Deploy latest" del último commit (no "Redeploy" de un deployment viejo). Si sospechas de cache, marca "Clear build cache".
4. Validar:
   - HTML title correcto
   - Fuentes (Poppins/Inter) cargadas
   - Estilos y tarjetas (Vision UI)

## Problemas comunes

- "rewrites" y "routes" juntos: no se permiten. Mantén solo `rewrites`.
- Directorio de salida incorrecto: usa `dist` si `Root Directory=frontend`.
- Redeploy de un commit viejo: usa "Deploy latest" del último commit de `main`.
