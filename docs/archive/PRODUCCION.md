# Instrucciones de Despliegue en Producción

## Paso 1: Configurar Base de Datos en Supabase

1. Ve a https://supabase.com y crea una cuenta
2. Crea un nuevo proyecto llamado "crm2"
3. Espera a que se inicialice (2-3 minutos)
4. Ve a Settings > Database 
5. Copia la **Connection String** (postgresql://postgres:[password]@[host]:5432/postgres)
6. Ve a SQL Editor y pega todo el contenido de `backend/schema.sql`
7. Ejecuta el script para crear las tablas

## Paso 2: Desplegar Backend en Render.com

1. Ve a https://render.com y crea cuenta con GitHub
2. Sube tu código a un repositorio GitHub público
3. En Render, haz clic en "New +" > "Web Service"
4. Conecta tu repositorio GitHub
5. Configura:
   - **Name**: crm2-backend
   - **Root Directory**: backend
   - **Environment**: Node
   - **Build Command**: npm install
   - **Start Command**: npm start

6. En "Environment Variables", agrega:
   ```
   NODE_ENV=production
   DATABASE_URL=[tu connection string de Supabase]
   JWT_SECRET=mi_super_clave_secreta_2024
   CORS_ORIGINS=https://tu-app.vercel.app
   ```

7. Haz clic en "Create Web Service"
8. Espera el despliegue (5-10 minutos)
9. Copia la URL que te da Render (ej: https://crm2-backend.onrender.com)

## Paso 3: Desplegar Frontend en Vercel

1. Ve a https://vercel.com y crea cuenta con GitHub
2. Haz clic en "Import Project"
3. Selecciona tu repositorio
4. Configura:
   - **Framework Preset**: Other
   - **Root Directory**: frontend
   - **Build Command**: npm run build
   - **Output Directory**: dist

5. En "Environment Variables", agrega:
   ```
   REACT_APP_API_URL=https://tu-backend.onrender.com/api
   NODE_ENV=production
   ```

6. Haz clic en "Deploy"
7. Espera el despliegue (3-5 minutos)
8. Copia la URL del frontend (ej: https://crm2.vercel.app)

## Paso 4: Actualizar CORS

1. Vuelve a Render.com > tu backend > Environment
2. Actualiza la variable `CORS_ORIGINS` con la URL real de Vercel:
   ```
   CORS_ORIGINS=https://crm2.vercel.app
   ```
3. Redespliega el backend

## Paso 5: Verificar funcionamiento

1. Ve a tu frontend en Vercel
2. Prueba registro/login
3. Verifica health check: `https://tu-backend.onrender.com/api/health`
4. Prueba crear clientes, actividades, importar ventas

## URLs finales:
- **Frontend**: https://crm2.vercel.app
- **Backend**: https://crm2-backend.onrender.com
- **Base de datos**: Panel de Supabase
- **Health check**: https://crm2-backend.onrender.com/api/health

¡Tu CRM2 estará funcionando en producción con SSL, escalabilidad automática y monitoreo!

## Notas importantes:
- Render puede tardar ~30 segundos en despertar después de inactividad (plan gratuito)
- Supabase incluye 500MB de almacenamiento gratis
- Vercel incluye 100GB de ancho de banda mensual
- Guarda las URLs y credenciales en un lugar seguro