# ✅ CHECKLIST DE DESPLIEGUE - RENDER + VERCEL

## 🎯 OBJETIVO
Conectar tu backend en Render con el frontend en Vercel y la base de datos Neon.

---

## 📋 PARTE 1: CONFIGURAR BACKEND EN RENDER

### ✅ Paso 1.1: Verificar que el servicio esté creado en Render

1. Ve a https://dashboard.render.com
2. Busca tu servicio `crm2-backend`
3. Si no existe, créalo:
   - Click **New +** → **Web Service**
   - Conecta tu repositorio de GitHub
   - Nombre: `crm2-backend`
   - Environment: `Node`
   - Root Directory: Dejar vacío o poner `/`
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Plan: **Free**

### ✅ Paso 1.2: Configurar Variables de Entorno en Render

Ve a tu servicio → **Environment** → Add Environment Variable

Agrega las siguientes variables **UNA POR UNA**:

```
NODE_ENV
production

PORT
10000

DATABASE_URL
postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require

CORS_ORIGINS
https://crm2-produccion.vercel.app,http://localhost:3000

JWT_SECRET
baa20e848edf99dcdaa39ca95f0771af3e5a82d059061cbd8aa04e7410323d3e
```

**IMPORTANTE**: Después de agregar las variables, click en **Save Changes**

### ✅ Paso 1.3: Hacer Deploy del Backend

1. Si es la primera vez: El deploy se hará automáticamente
2. Si ya existe el servicio: Click en **Manual Deploy** → **Deploy latest commit**
3. Espera a que el deploy termine (5-10 minutos)
4. Verifica que el estado sea **Live** (círculo verde)

### ✅ Paso 1.4: Verificar que el Backend funciona

Abre en tu navegador:
```
https://crm2-backend.onrender.com
```

Deberías ver algo como:
```json
{
  "status": "ok",
  "message": "CRM2 Backend API - Versión: 2024-11-12",
  "environment": "production",
  "timestamp": "2025-11-12T..."
}
```

✅ Si ves esto, **el backend está funcionando correctamente**

---

## 📋 PARTE 2: CONFIGURAR FRONTEND EN VERCEL

### ✅ Paso 2.1: Verificar que el proyecto esté en Vercel

1. Ve a https://vercel.com/dashboard
2. Busca tu proyecto `crm2-produccion`
3. Si no existe, créalo:
   - Click **Add New** → **Project**
   - Importa tu repositorio de GitHub
   - Configure Project:
     - Framework Preset: **Other**
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

### ✅ Paso 2.2: Configurar Variables de Entorno en Vercel

Ve a tu proyecto → **Settings** → **Environment Variables**

Agrega las siguientes variables:

| Name | Value | Environment |
|------|-------|-------------|
| `REACT_APP_API_URL` | `https://crm2-backend.onrender.com/api` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

**IMPORTANTE**: Click en **Save** después de cada variable

### ✅ Paso 2.3: Redeploy del Frontend

**Opción A - Redeploy Manual:**
1. Ve a **Deployments**
2. Click en los 3 puntos del último deployment
3. Selecciona **Redeploy**
4. ✅ Marca **Use existing Build Cache** (opcional, para más rápido)

**Opción B - Trigger desde Git:**
```bash
cd /Users/mariolabbe/Desktop/TRABAJO\ IA/CRM2
git add .
git commit -m "Update production config for Render + Vercel"
git push origin main
```

### ✅ Paso 2.4: Verificar que el Frontend funciona

Abre en tu navegador:
```
https://crm2-produccion.vercel.app
```

Deberías ver tu aplicación CRM2 cargando correctamente.

---

## 📋 PARTE 3: VERIFICAR CONEXIÓN

### ✅ Paso 3.1: Verificar CORS

1. Abre tu frontend: `https://crm2-produccion.vercel.app`
2. Abre las **Herramientas de Desarrollador** (F12)
3. Ve a la pestaña **Console**
4. **No deberías ver errores de CORS** (como "blocked by CORS policy")

### ✅ Paso 3.2: Verificar peticiones API

1. En las Herramientas de Desarrollador, ve a la pestaña **Network**
2. Recarga la página (F5)
3. Busca peticiones que vayan a `crm2-backend.onrender.com`
4. Haz click en una de ellas
5. Verifica que el **Status** sea **200 OK** (o 401/403 si requiere autenticación)

### ✅ Paso 3.3: Ejecutar Script de Verificación Automática

Desde tu terminal local:

```bash
cd /Users/mariolabbe/Desktop/TRABAJO\ IA/CRM2
./verificar_conexion.sh
```

Deberías ver:
```
✅ Backend respondiendo correctamente
✅ API respondiendo con datos
✅ Frontend respondiendo correctamente
✅ Base de datos conectada
✅ CORS configurado correctamente
```

---

## 🐛 TROUBLESHOOTING

### ❌ El backend no responde o da timeout

**Causa**: El plan gratuito de Render hiberna después de 15 min de inactividad.

**Solución**: 
1. Espera 30-60 segundos en la primera carga
2. El servicio se "despertará" automáticamente
3. Las siguientes peticiones serán rápidas

**Solución permanente**: 
- Actualizar a plan Starter ($7/mes) para servicio 24/7

### ❌ Error de CORS en el navegador

**Síntoma**: 
```
Access to fetch at 'https://crm2-backend.onrender.com/api/...' 
from origin 'https://crm2-produccion.vercel.app' has been blocked by CORS policy
```

**Solución**:
1. Verifica que en Render tengas la variable `CORS_ORIGINS` correcta
2. Asegúrate de que no haya espacios extras
3. Verifica que la URL del frontend esté exacta (sin `/` al final)
4. Redeploy el backend en Render

### ❌ El frontend no conecta con el backend

**Solución**:
1. Verifica en Vercel → Settings → Environment Variables
2. Asegúrate de que `REACT_APP_API_URL` apunte a `https://crm2-backend.onrender.com/api`
3. Redeploy el frontend en Vercel
4. Limpia el cache del navegador (Ctrl+Shift+R o Cmd+Shift+R)

### ❌ Error de base de datos en el backend

**Solución**:
1. Ve a Render → Environment
2. Verifica que `DATABASE_URL` tenga el string completo
3. Debe incluir `?sslmode=require` al final
4. Redeploy el backend

### ❌ Las variables de entorno no se aplican

**Solución**:
1. Después de agregar/cambiar variables en Render o Vercel
2. **DEBES hacer un redeploy manual**
3. Los cambios no se aplican automáticamente

---

## 📊 VERIFICACIÓN FINAL

### Lista de Comprobación

- [ ] Backend en Render está **Live** (círculo verde)
- [ ] Backend responde en: `https://crm2-backend.onrender.com`
- [ ] Todas las variables de entorno están en Render
- [ ] Frontend en Vercel está **Ready**
- [ ] Frontend responde en: `https://crm2-produccion.vercel.app`
- [ ] Variable `REACT_APP_API_URL` configurada en Vercel
- [ ] No hay errores de CORS en la consola del navegador
- [ ] Las peticiones API llegan al backend (ver Network tab)
- [ ] La aplicación muestra datos de la base de datos
- [ ] Script `verificar_conexion.sh` pasa todos los tests

---

## 🎉 ¡LISTO!

Si todos los checks están ✅, tu sistema está **100% funcional en producción**.

### 🔗 URLs de Producción

- **Frontend**: https://crm2-produccion.vercel.app
- **Backend**: https://crm2-backend.onrender.com
- **API**: https://crm2-backend.onrender.com/api
- **Database**: Neon PostgreSQL (automático)

### 📱 Dashboards

- **Render**: https://dashboard.render.com
- **Vercel**: https://vercel.com/dashboard
- **Neon**: https://console.neon.tech

### 🔄 Para Futuros Deploys

Simplemente haz push a tu repositorio:
```bash
git add .
git commit -m "Nueva funcionalidad"
git push origin main
```

Tanto Render como Vercel detectarán el cambio y harán deploy automáticamente.

---

**Última actualización**: 12 de noviembre de 2025  
**Creado por**: GitHub Copilot + Mario Labbe
