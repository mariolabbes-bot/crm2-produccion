# 🚀 GUÍA DE CONEXIÓN RENDER + VERCEL + NEON

## 📋 RESUMEN DE SERVICIOS

| Servicio | URL | Estado |
|----------|-----|--------|
| **Backend** (Render) | `https://crm2-backend.onrender.com` | 🟢 A configurar |
| **Frontend** (Vercel) | `https://crm2-produccion.vercel.app` | 🟢 A configurar |
| **Database** (Neon) | `ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech` | ✅ Funcionando |

---

## 🔧 PASO 1: CONFIGURAR BACKEND EN RENDER

### 1.1 Variables de Entorno en Render

Ve a tu servicio en Render → **Environment** y agrega estas variables:

```env
NODE_ENV=production
PORT=10000

# Database Neon (PRODUCCIÓN)
DATABASE_URL=postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require

# CORS - URLs permitidas (separadas por coma)
CORS_ORIGINS=https://crm2-produccion.vercel.app,http://localhost:3000

# JWT Secret (genera uno nuevo para producción)
JWT_SECRET=tu_secret_key_super_seguro_aqui_cambiar_en_produccion

# Google Maps API (opcional)
GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

### 1.2 Configuración de Build en Render

- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Root Directory**: Dejar en blanco o `/`
- **Branch**: `main`
- **Auto-Deploy**: ✅ Activado

### 1.3 Verificar Deployment

Después del deploy, verifica que esté funcionando:

```bash
curl https://crm2-backend.onrender.com/
# Debería responder: {"status":"ok","message":"CRM2 Backend API - Versión ..."}

curl https://crm2-backend.onrender.com/api/users
# Debería responder con lista de usuarios (si tienes autenticación, necesitarás token)
```

---

## 🎨 PASO 2: CONFIGURAR FRONTEND EN VERCEL

### 2.1 Variables de Entorno en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables** y agrega:

```env
# URL del backend en Render
REACT_APP_API_URL=https://crm2-backend.onrender.com/api

# Ambiente
NODE_ENV=production
```

### 2.2 Configuración de Build en Vercel

- **Framework Preset**: Other
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Root Directory**: `frontend`

### 2.3 Actualizar vercel.json

El archivo `frontend/vercel.json` debe tener:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "env": {
    "REACT_APP_API_URL": "https://crm2-backend.onrender.com/api"
  },
  "build": {
    "env": {
      "REACT_APP_API_URL": "https://crm2-backend.onrender.com/api"
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 2.4 Redeploy Frontend

Después de configurar las variables:

1. En Vercel → **Deployments** → Haz clic en los 3 puntos del último deployment
2. Selecciona **Redeploy**
3. ✅ Marca **Use existing Build Cache**

---

## 🔐 PASO 3: CONFIGURAR CORS EN BACKEND

Verifica que el archivo `backend/src/serverApp.js` tenga la configuración correcta de CORS:

```javascript
// Configuración de CORS para producción
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://crm2-produccion.vercel.app',  // Frontend en Vercel
      'http://localhost:3000',                // Desarrollo local
      'http://127.0.0.1:3000'                 // Desarrollo local alternativo
    ];
    
    const normalize = o => (o || '').replace(/\/$/, '').toLowerCase();
    
    if (!origin || allowedOrigins.some(o => normalize(o) === normalize(origin))) {
      callback(null, true);
    } else {
      console.log('⛔ CORS bloqueado para origen:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
```

---

## 🧪 PASO 4: TESTING DE CONEXIÓN

### Test 1: Backend Health Check

```bash
curl https://crm2-backend.onrender.com/
```

**Respuesta esperada**:
```json
{
  "status": "ok",
  "message": "CRM2 Backend API - Versión: ..."
}
```

### Test 2: Database Connection

```bash
curl https://crm2-backend.onrender.com/api/clients
```

**Respuesta esperada**: JSON con lista de clientes o error de autenticación

### Test 3: Frontend CORS

Abre el navegador en `https://crm2-produccion.vercel.app` y verifica:

1. **Consola del navegador** (F12) → No debe haber errores de CORS
2. **Network tab** → Las peticiones a `/api/*` deben ir a Render
3. **Status 200** en las respuestas

---

## 🐛 TROUBLESHOOTING

### ❌ Error: "CORS policy blocked"

**Solución**:
1. Verifica que la URL del frontend esté en `allowedOrigins` del backend
2. Asegúrate de que no haya slash `/` al final de las URLs
3. Redeploy el backend en Render

### ❌ Error: "Failed to fetch" o "Network Error"

**Solución**:
1. Verifica que `REACT_APP_API_URL` en Vercel apunte a Render
2. Asegúrate de que el backend esté corriendo (visita la URL directamente)
3. Revisa los logs en Render → **Logs**

### ❌ Error: "Service Unavailable" en Render

**Solución**:
1. El plan gratuito de Render hiberna después de 15 minutos de inactividad
2. La primera petición puede tardar 30-60 segundos en "despertar"
3. Considera actualizar al plan Starter ($7/mes) para servicio 24/7

### ❌ Error: "connect ECONNREFUSED" en Backend

**Solución**:
1. Verifica que `DATABASE_URL` en Render tenga el string completo de Neon
2. Asegúrate de que incluya `?sslmode=require` al final
3. Verifica que la IP de Render esté permitida en Neon (usualmente no es necesario)

---

## 📊 VERIFICACIÓN FINAL

### Checklist de Producción

- [ ] Backend deployado en Render y respondiendo
- [ ] Variables de entorno configuradas en Render (DATABASE_URL, CORS_ORIGINS, JWT_SECRET)
- [ ] Frontend deployado en Vercel
- [ ] Variable REACT_APP_API_URL configurada en Vercel
- [ ] CORS configurado correctamente en backend
- [ ] No hay errores de CORS en la consola del navegador
- [ ] Las peticiones API llegan al backend de Render
- [ ] La base de datos Neon está conectada y respondiendo
- [ ] Login funciona (si aplica)
- [ ] Datos se muestran correctamente en el frontend

### Script de Verificación Automática

```bash
#!/bin/bash

echo "🧪 Verificando conexión Render + Vercel + Neon"
echo ""

# Test Backend
echo "1️⃣ Testing Backend (Render)..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://crm2-backend.onrender.com/)
if [ "$BACKEND_STATUS" -eq 200 ]; then
  echo "✅ Backend respondiendo (HTTP $BACKEND_STATUS)"
else
  echo "❌ Backend error (HTTP $BACKEND_STATUS)"
fi

# Test Frontend
echo ""
echo "2️⃣ Testing Frontend (Vercel)..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://crm2-produccion.vercel.app/)
if [ "$FRONTEND_STATUS" -eq 200 ]; then
  echo "✅ Frontend respondiendo (HTTP $FRONTEND_STATUS)"
else
  echo "❌ Frontend error (HTTP $FRONTEND_STATUS)"
fi

# Test API Endpoint
echo ""
echo "3️⃣ Testing API Endpoint..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://crm2-backend.onrender.com/api/clients)
if [ "$API_STATUS" -eq 200 ] || [ "$API_STATUS" -eq 401 ]; then
  echo "✅ API respondiendo (HTTP $API_STATUS)"
else
  echo "❌ API error (HTTP $API_STATUS)"
fi

echo ""
echo "🎉 Verificación completada"
```

---

## 🔄 REDEPLOY RÁPIDO

### Backend (Render)

**Opción 1**: Push a GitHub
```bash
git add .
git commit -m "Update backend config"
git push origin main
# Render detectará el cambio y redeploy automáticamente
```

**Opción 2**: Manual Deploy en Render
1. Ve a tu servicio en Render
2. Haz clic en **Manual Deploy** → **Deploy latest commit**

### Frontend (Vercel)

**Opción 1**: Push a GitHub
```bash
git add .
git commit -m "Update frontend config"
git push origin main
# Vercel detectará el cambio y redeploy automáticamente
```

**Opción 2**: Manual Deploy en Vercel
1. Ve a tu proyecto en Vercel
2. **Deployments** → 3 puntos → **Redeploy**

**Opción 3**: CLI de Vercel
```bash
cd frontend
npx vercel --prod
```

---

## 📱 MONITOREO

### Logs de Backend (Render)

```
https://dashboard.render.com/web/srv-xxxxx/logs
```

Busca líneas como:
- ✅ `Servidor backend escuchando en puerto 10000`
- ✅ `Conexión a base de datos exitosa`
- ❌ `CORS bloqueado para origen: ...`
- ❌ `Error connecting to database`

### Logs de Frontend (Vercel)

```
https://vercel.com/tu-usuario/crm2-produccion/logs
```

### Analytics

Activa **Vercel Analytics** para monitorear:
- Visitas
- Rendimiento
- Errores en producción
- Tiempo de carga

---

## 🎯 PRÓXIMOS PASOS

1. **Activar SSL**: Ambos servicios ya tienen HTTPS automático ✅
2. **Custom Domain**: Configurar dominio personalizado (opcional)
3. **Monitoring**: Configurar Sentry o similar para tracking de errores
4. **CI/CD**: Automatizar tests antes de deploy
5. **Environment Variables**: Rotar JWT_SECRET periódicamente
6. **Backups**: Configurar backups automáticos en Neon (ya incluido)

---

**🎉 ¡Sistema listo para producción!**

*Última actualización: 12 de noviembre de 2025*
