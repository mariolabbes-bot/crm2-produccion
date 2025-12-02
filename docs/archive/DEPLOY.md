
# Despliegue de CRM2 en Producción

## Arquitectura de Producción
- **Base de datos**: PostgreSQL en Supabase (gratis)
- **Backend**: Node.js/Express en Render.com (gratis)
- **Frontend**: React en Vercel (gratis)

## 1. Base de Datos PostgreSQL (Supabase)

### Configuración inicial:
1. Crea cuenta en https://supabase.com
2. Crea nuevo proyecto
3. Ve a Settings > Database y copia la connection string
4. En SQL Editor, ejecuta `backend/schema.sql` completo
5. Habilita Row Level Security (RLS) si quieres seguridad adicional

### Variables que necesitarás:
- `DATABASE_URL`: Connection string completa de PostgreSQL
- `SUPABASE_URL`: URL del proyecto
- `SUPABASE_ANON_KEY`: Clave pública anon

## 2. Backend Node.js (Render.com)

### Preparación:
1. Sube código a GitHub (carpeta completa o solo backend/)
2. En Render.com crea nuevo "Web Service"
3. Conecta tu repositorio GitHub

### Variables de entorno en Render:
```
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
JWT_SECRET=tu_clave_super_secreta_aqui
PORT=3001
NODE_ENV=production
```

### Configuración build:
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Root Directory**: `.` (o `backend` si subes solo backend)

## 3. Frontend React (Vercel)

### Despliegue:
1. En Vercel.com importa tu repositorio
2. Configura como proyecto React
3. Build Directory: `frontend/dist`
4. Install Command: `cd frontend && npm install`
5. Build Command: `cd frontend && npm run build`

### Variables de entorno en Vercel:
```
REACT_APP_API_URL=https://tu-backend.onrender.com/api
REACT_APP_SUPABASE_URL=tu_url_supabase
REACT_APP_SUPABASE_ANON_KEY=tu_clave_anon
```

## 4. Configuración de producción

### CORS en backend:
El backend ya está configurado para aceptar múltiples orígenes.

### Build de frontend:
```bash
cd frontend
npm run build
```

### Verificación de endpoints:
- Backend health: `https://tu-backend.onrender.com/api/health`
- Frontend: `https://tu-app.vercel.app`

## 5. Proceso paso a paso

1. **Configura Supabase** → Obtén DATABASE_URL
2. **Despliega Backend en Render** → Obtén URL del backend
3. **Configura variables en Frontend** → Apunta al backend de Render
4. **Despliega Frontend en Vercel** → ¡Listo!

## 6. Monitoreo

- Logs backend: Render dashboard
- Logs frontend: Vercel dashboard  
- Base de datos: Supabase dashboard
- Health check: `GET /api/health`

¡Tu CRM2 estará online con todas las funcionalidades: autenticación, CRUD, importación CSV/JSON, KPIs y más!
