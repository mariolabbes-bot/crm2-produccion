# 🎯 PASO A PASO - CONFIGURACIÓN RENDER + VERCEL

## 📍 PARTE 1: CONFIGURAR BACKEND EN RENDER

### PASO 1: Acceder a Render
1. Abre tu navegador
2. Ve a: **https://dashboard.render.com**
3. Inicia sesión con tu cuenta de GitHub

---

### PASO 2: Localizar tu servicio Backend
1. En el dashboard, busca el servicio llamado: **`crm2-backend`**
2. Haz click en él para abrirlo

**Si NO existe el servicio**, créalo:
- Click en **"New +"** (arriba a la derecha)
- Selecciona **"Web Service"**
- Conecta tu repositorio: `mariolabbes-bot/crm2-produccion`
- Configura:
  - **Name**: `crm2-backend`
  - **Environment**: `Node`
  - **Region**: `Oregon` (o el más cercano)
  - **Branch**: `main`
  - **Root Directory**: Dejar vacío
  - **Build Command**: `cd backend && npm install`
  - **Start Command**: `cd backend && npm start`
  - **Plan**: `Free`

---

### PASO 3: Configurar Variables de Entorno

1. En tu servicio `crm2-backend`, busca en el menú lateral izquierdo:
   ```
   Dashboard
   Events
   Logs
   Shell
   Metrics
   → Environment    ← HAZ CLICK AQUÍ
   Settings
   ```

2. Click en **"Environment"**

3. Verás una sección que dice: **"Environment Variables"**

4. Click en el botón **"Add Environment Variable"**

---

### PASO 4: Agregar cada variable (una por una)

**Variable 1:**
```
Key:   NODE_ENV
Value: production
```
Click **"Save"**

---

**Variable 2:**
```
Key:   PORT
Value: 10000
```
Click **"Save"**

---

**Variable 3:**
```
Key:   DATABASE_URL
Value: postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
```
⚠️ **IMPORTANTE**: Copia TODO el valor completo, incluyendo `?sslmode=require` al final

Click **"Save"**

---

**Variable 4:**
```
Key:   CORS_ORIGINS
Value: https://crm2-produccion.vercel.app,http://localhost:3000
```
⚠️ **IMPORTANTE**: Sin espacios después de la coma

Click **"Save"**

---

**Variable 5:**
```
Key:   JWT_SECRET
Value: baa20e848edf99dcdaa39ca95f0771af3e5a82d059061cbd8aa04e7410323d3e
```
Click **"Save"**

---

**Variable 6 (opcional):**
```
Key:   GOOGLE_MAPS_API_KEY
Value: tu_api_key_aqui
```
(Déjala en blanco por ahora si no tienes una)

Click **"Save"**

---

### PASO 5: Guardar y Redeploy

1. Después de agregar todas las variables, verás un botón arriba que dice:
   **"Save Changes"** o **"Manual Deploy"**

2. Click en **"Manual Deploy"**

3. Selecciona **"Clear build cache & deploy"**

4. Espera 3-5 minutos mientras hace el deploy

5. En la parte superior verás el estado:
   - 🟡 **Building...** (esperando)
   - 🟡 **Deploying...** (esperando)
   - 🟢 **Live** (¡LISTO!)

---

### PASO 6: Verificar que funciona

1. En la parte superior del dashboard verás una URL como:
   ```
   https://crm2-backend.onrender.com
   ```

2. Copia esa URL

3. Ábrela en una nueva pestaña del navegador

4. **Deberías ver algo como:**
   ```json
   {
     "status": "ok",
     "message": "CRM2 Backend API - Versión: 2024-11-12",
     "environment": "production",
     "timestamp": "2025-11-12T..."
   }
   ```

✅ **Si ves esto, el backend está funcionando correctamente**

---

## 📍 PARTE 2: CONFIGURAR FRONTEND EN VERCEL

### PASO 1: Acceder a Vercel
1. Abre tu navegador
2. Ve a: **https://vercel.com/dashboard**
3. Inicia sesión con tu cuenta de GitHub

---

### PASO 2: Localizar tu proyecto Frontend
1. En el dashboard, busca el proyecto: **`crm2-produccion`** o similar
2. Haz click en él

**Si NO existe el proyecto**, créalo:
- Click en **"Add New..."** → **"Project"**
- Click en **"Import Git Repository"**
- Busca: `mariolabbes-bot/crm2-produccion`
- Click **"Import"**
- Configura:
  - **Framework Preset**: `Other`
  - **Root Directory**: `frontend` ← Click en **"Edit"** y escribe `frontend`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Install Command**: `npm install`
- Click **"Deploy"** (hará el primer deploy, tardará 1-2 minutos)

---

### PASO 3: Ir a Settings

1. En tu proyecto, busca en el menú superior:
   ```
   Deployments   Overview   Analytics   Logs   
   Settings    ← HAZ CLICK AQUÍ
   ```

2. Click en **"Settings"**

---

### PASO 4: Configurar Variables de Entorno

1. En el menú lateral izquierdo de Settings, busca:
   ```
   General
   Domains
   Git
   → Environment Variables    ← HAZ CLICK AQUÍ
   Functions
   ...
   ```

2. Click en **"Environment Variables"**

3. Verás un formulario con 3 campos:
   - Name (or Paste .env)
   - Value
   - Environment (Production, Preview, Development)

---

### PASO 5: Agregar Variables

**Variable 1:**

1. En **"Name"**, escribe:
   ```
   REACT_APP_API_URL
   ```

2. En **"Value"**, escribe:
   ```
   https://crm2-backend.onrender.com/api
   ```
   ⚠️ **IMPORTANTE**: Usa la URL exacta de tu backend de Render + `/api` al final

3. En **"Environment"**, selecciona las 3 opciones:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. Click **"Save"**

---

**Variable 2:**

1. En **"Name"**, escribe:
   ```
   NODE_ENV
   ```

2. En **"Value"**, escribe:
   ```
   production
   ```

3. En **"Environment"**, selecciona solo:
   - ✅ Production

4. Click **"Save"**

---

### PASO 6: Redeploy del Frontend

1. Ve a la pestaña **"Deployments"** (en el menú superior)

2. Verás una lista de deployments. El primero (más reciente) dirá **"Ready"** o **"Building"**

3. Click en los **3 puntos** (•••) a la derecha del deployment más reciente

4. En el menú, selecciona **"Redeploy"**

5. Aparecerá un modal, asegúrate de marcar:
   - ✅ **"Use existing Build Cache"** (opcional, para más rápido)

6. Click en **"Redeploy"**

7. Espera 1-2 minutos

8. Cuando termine, verás el estado:
   - 🟢 **Ready** (¡LISTO!)

---

### PASO 7: Verificar que funciona

1. En la parte superior verás una URL como:
   ```
   https://crm2-produccion.vercel.app
   ```
   o
   ```
   https://crm2-produccion-tu-usuario.vercel.app
   ```

2. Click en **"Visit"** o copia la URL y ábrela en el navegador

3. **Deberías ver tu aplicación CRM2 cargando**

---

### PASO 8: Verificar que NO hay errores de CORS

1. Con tu aplicación abierta en el navegador, presiona **F12** (o clic derecho → Inspeccionar)

2. Ve a la pestaña **"Console"**

3. **NO debe haber errores rojos** que digan:
   ```
   Access to fetch ... has been blocked by CORS policy
   ```

4. Si hay errores de CORS:
   - Ve a la pestaña **"Network"**
   - Recarga la página (F5)
   - Busca peticiones que vayan a `crm2-backend.onrender.com`
   - Click en una
   - Verifica que tenga **Status: 200** (o 401 si requiere login)

---

## ✅ VERIFICACIÓN FINAL

### Desde tu Terminal (Mac)

Abre Terminal y ejecuta:

```bash
cd "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2"
./verificar_conexion.sh
```

**Deberías ver:**
```
✅ Backend respondiendo correctamente (HTTP 200)
✅ API funcionando - requiere autenticación (HTTP 401)
✅ Frontend respondiendo correctamente (HTTP 200)
✅ Base de datos conectada (HTTP 401)
✅ CORS configurado correctamente
```

---

## 🎯 RESUMEN DE URLS

Copia estas URLs para tener a mano:

**Frontend (Vercel):**
```
https://crm2-produccion.vercel.app
```

**Backend (Render):**
```
https://crm2-backend.onrender.com
```

**API (Render):**
```
https://crm2-backend.onrender.com/api
```

**Dashboards:**
- Render: https://dashboard.render.com
- Vercel: https://vercel.com/dashboard
- Neon DB: https://console.neon.tech

---

## 🐛 SI ALGO FALLA

### El backend no responde (timeout)

**Causa:** Plan gratuito de Render hiberna tras 15 min sin uso

**Solución:** 
1. Espera 30-60 segundos
2. Recarga la página
3. El servicio se "despertará" automáticamente

---

### Error de CORS en el navegador

**Solución:**
1. Ve a Render → Environment
2. Verifica que `CORS_ORIGINS` tenga exactamente:
   ```
   https://crm2-produccion.vercel.app,http://localhost:3000
   ```
3. Asegúrate de que NO haya espacios
4. Asegúrate de que la URL de Vercel esté correcta
5. Click en **"Manual Deploy"** → **"Clear build cache & deploy"**

---

### El frontend no se conecta al backend

**Solución:**
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que `REACT_APP_API_URL` sea exactamente:
   ```
   https://crm2-backend.onrender.com/api
   ```
3. Ve a Deployments → Redeploy

---

## 📞 NECESITAS AYUDA?

Si algo no funciona:

1. **Verifica logs en Render:**
   - Dashboard → Tu servicio → Logs
   - Busca errores en rojo

2. **Verifica logs en Vercel:**
   - Dashboard → Tu proyecto → Deployments → Function Logs
   - Busca errores

3. **Ejecuta el script de verificación:**
   ```bash
   ./verificar_conexion.sh
   ```

---

## 🎉 ¡LISTO!

Siguiendo estos pasos, tu sistema estará **100% funcional** en producción.

**Última actualización:** 12 de noviembre de 2025
