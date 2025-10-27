# 🚀 Guía de Deploy a Producción

## 📋 Resumen
- **Frontend**: Vercel
- **Backend**: Render
- **Base de datos**: Neon (PostgreSQL)

---

## 🔧 1. Variables de Entorno

### Backend (Render)
Configurar en Render Dashboard → Environment Variables:

```bash
# Base de datos PostgreSQL (Neon)
DATABASE_URL=postgresql://[usuario]:[password]@[host].neon.tech/[database]?sslmode=require

# JWT para autenticación (generar una clave secreta fuerte)
JWT_SECRET=tu_clave_super_secreta_de_produccion_cambiar_esto

# Puerto (Render lo asigna automáticamente, no cambiar)
PORT=10000

# Ambiente
NODE_ENV=production

# CORS Origins (URL de tu frontend en Vercel)
CORS_ORIGINS=https://tu-app.vercel.app
```

**⚠️ IMPORTANTE:**
- Reemplaza `DATABASE_URL` con tu conexión real de Neon
- Genera un `JWT_SECRET` único y fuerte (puedes usar: `openssl rand -base64 32`)
- Reemplaza `CORS_ORIGINS` con la URL real de tu app en Vercel

---

### Frontend (Vercel)
Configurar en Vercel Dashboard → Settings → Environment Variables:

```bash
# URL del backend en Render
REACT_APP_API_URL=https://tu-backend.onrender.com/api

# Ambiente
NODE_ENV=production
```

**⚠️ IMPORTANTE:**
- Reemplaza `REACT_APP_API_URL` con la URL real de tu backend en Render
- Una vez que Render despliegue tu backend, copia la URL (ej: `https://crm2-backend-abc123.onrender.com`)

---

## 🎯 2. Pasos para Deploy

### Paso 1: Hacer commit de los cambios
```bash
cd "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2"
git add .
git commit -m "Deploy: configuración de producción y nuevas funcionalidades"
git push origin main
```

### Paso 2: Deploy del Backend (Render)
1. Ve a tu dashboard de Render: https://dashboard.render.com
2. Selecciona tu servicio de backend (o créalo si no existe)
3. Si es un nuevo servicio:
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Configuración:
     - **Name**: crm2-backend
     - **Region**: Oregon (US West) o la más cercana
     - **Branch**: main
     - **Root Directory**: backend
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free (o el que necesites)
4. Configura las variables de entorno (ver sección anterior)
5. Click en "Create Web Service" o "Manual Deploy"
6. Espera a que el deploy termine (puedes ver logs en tiempo real)
7. **Copia la URL del servicio** (ej: `https://crm2-backend-abc123.onrender.com`)

### Paso 3: Configurar Frontend con la URL del Backend
1. Ve a tu dashboard de Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto de frontend
3. Ve a "Settings" → "Environment Variables"
4. Agrega/actualiza `REACT_APP_API_URL` con la URL del backend de Render
5. Ejemplo: `https://crm2-backend-abc123.onrender.com/api`
6. Guarda los cambios

### Paso 4: Deploy del Frontend (Vercel)
1. Si es un nuevo proyecto:
   - Click en "Add New..." → "Project"
   - Importa tu repositorio de GitHub
   - Framework Preset: Other
   - Root Directory: `./` (raíz del proyecto)
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
2. Si ya existe el proyecto:
   - Vercel detectará automáticamente el push a `main` y desplegará
   - O puedes hacer deploy manual: "Deployments" → "Redeploy"
3. Configura las variables de entorno (ver sección anterior)
4. Espera a que el deploy termine
5. Accede a la URL de producción (ej: `https://tu-app.vercel.app`)

---

## ✅ 3. Verificación Post-Deploy

### Backend (Render)
- Accede a `https://tu-backend.onrender.com/api/health`
- Deberías ver: `{"status":"ok"}`

### Frontend (Vercel)
- Accede a `https://tu-app.vercel.app`
- Verifica que cargue correctamente
- Prueba login/autenticación
- Verifica las nuevas funcionalidades:
  - Panel de importación de ventas y abonos
  - Descarga de plantillas Excel
  - Tablas comparativas
  - Exportación a Excel

---

## 🔄 4. Deploys Futuros

Una vez configurado, los deploys futuros son automáticos:

```bash
# 1. Hacer cambios en el código
# 2. Commit y push
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main

# 3. Render y Vercel desplegarán automáticamente
```

---

## 🐛 5. Troubleshooting

### Backend no inicia en Render
- Revisa los logs en Render Dashboard
- Verifica que `DATABASE_URL` esté correctamente configurada
- Verifica que todas las dependencias estén en `package.json`

### Frontend no conecta con Backend
- Verifica que `REACT_APP_API_URL` en Vercel apunte a la URL correcta de Render
- Verifica que `CORS_ORIGINS` en Render incluya la URL de Vercel
- Revisa logs del backend en Render

### Error 401/403 en autenticación
- Verifica que `JWT_SECRET` sea el mismo que usaste en desarrollo (o genera uno nuevo y actualiza tokens)

### Archivos Excel no se cargan/descargan
- Verifica que la librería `xlsx` y `multer` estén en `dependencies` (no `devDependencies`)
- Revisa logs del backend para errores específicos

---

## 📞 6. Soporte

Si encuentras problemas:
1. Revisa los logs en Render (Backend) y Vercel (Frontend)
2. Verifica las variables de entorno
3. Compara con el entorno local que funciona
4. Si el error persiste, comparte el log específico para debugging

---

## 🎉 ¡Listo!

Tu aplicación CRM2 está ahora en producción con:
- ✅ Backend en Render con base de datos Neon
- ✅ Frontend en Vercel
- ✅ Deploy automático en cada push
- ✅ Nuevas funcionalidades de importación disponibles
