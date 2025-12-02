# ✅ CHECKLIST VISUAL - RENDER + VERCEL

Marca cada paso conforme lo completes.

---

## 🔴 PARTE 1: RENDER (BACKEND)

### □ 1. Acceder a Render
- [ ] Abrir https://dashboard.render.com
- [ ] Iniciar sesión con GitHub

### □ 2. Abrir servicio Backend
- [ ] Buscar servicio: `crm2-backend`
- [ ] Hacer click para abrirlo

### □ 3. Ir a Environment
- [ ] En menú lateral izquierdo → Click en **"Environment"**

### □ 4. Agregar Variables (una por una)

- [ ] **Variable 1:** `NODE_ENV` = `production`
- [ ] **Variable 2:** `PORT` = `10000`
- [ ] **Variable 3:** `DATABASE_URL` = 
  ```
  postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
  ```
- [ ] **Variable 4:** `CORS_ORIGINS` = 
  ```
  https://crm2-produccion.vercel.app,http://localhost:3000
  ```
- [ ] **Variable 5:** `JWT_SECRET` = 
  ```
  baa20e848edf99dcdaa39ca95f0771af3e5a82d059061cbd8aa04e7410323d3e
  ```

### □ 5. Hacer Deploy
- [ ] Click en **"Manual Deploy"**
- [ ] Seleccionar **"Clear build cache & deploy"**
- [ ] Esperar 3-5 minutos hasta ver 🟢 **Live**

### □ 6. Verificar Backend
- [ ] Copiar URL: `https://crm2-backend.onrender.com`
- [ ] Abrir en navegador
- [ ] Verificar que muestre JSON con `"status": "ok"`

---

## 🟢 PARTE 2: VERCEL (FRONTEND)

### □ 1. Acceder a Vercel
- [ ] Abrir https://vercel.com/dashboard
- [ ] Iniciar sesión con GitHub

### □ 2. Abrir proyecto Frontend
- [ ] Buscar proyecto: `crm2-produccion`
- [ ] Hacer click para abrirlo

### □ 3. Ir a Settings
- [ ] En menú superior → Click en **"Settings"**

### □ 4. Ir a Environment Variables
- [ ] En menú lateral → Click en **"Environment Variables"**

### □ 5. Agregar Variables

- [ ] **Variable 1:** 
  - Name: `REACT_APP_API_URL`
  - Value: `https://crm2-backend.onrender.com/api`
  - Environment: ✅ Production, ✅ Preview, ✅ Development

- [ ] **Variable 2:**
  - Name: `NODE_ENV`
  - Value: `production`
  - Environment: ✅ Production

### □ 6. Redeploy Frontend
- [ ] Ir a **"Deployments"** (menú superior)
- [ ] Click en los 3 puntos (•••) del deployment más reciente
- [ ] Seleccionar **"Redeploy"**
- [ ] Esperar 1-2 minutos hasta ver 🟢 **Ready**

### □ 7. Verificar Frontend
- [ ] Copiar URL: `https://crm2-produccion.vercel.app`
- [ ] Abrir en navegador
- [ ] Verificar que cargue la aplicación CRM2

### □ 8. Verificar CORS (NO debe haber errores)
- [ ] Presionar F12 en el navegador
- [ ] Ir a pestaña **"Console"**
- [ ] NO debe haber errores rojos de CORS
- [ ] Ir a pestaña **"Network"**
- [ ] Recargar página (F5)
- [ ] Buscar peticiones a `crm2-backend.onrender.com`
- [ ] Verificar Status: 200 o 401 (ambos son correctos)

---

## 🔵 PARTE 3: VERIFICACIÓN FINAL

### □ Desde Terminal (opcional pero recomendado)

```bash
cd "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2"
./verificar_conexion.sh
```

- [ ] Ejecutar script
- [ ] Verificar que pasen 3/5 tests o más

### □ Probar la aplicación

- [ ] Abrir: https://crm2-produccion.vercel.app
- [ ] Intentar hacer login (si aplica)
- [ ] Verificar que los datos carguen
- [ ] Navegar entre páginas
- [ ] TODO funciona correctamente ✅

---

## 🎯 URLS FINALES (guardar)

```
Frontend: https://crm2-produccion.vercel.app
Backend:  https://crm2-backend.onrender.com
API:      https://crm2-backend.onrender.com/api
```

---

## 📝 NOTAS IMPORTANTES

⚠️ **En Render:**
- NO agregues espacios en las variables
- Copia TODO el DATABASE_URL (incluyendo `?sslmode=require`)
- El CORS_ORIGINS debe tener la URL EXACTA de Vercel

⚠️ **En Vercel:**
- La variable debe ser `REACT_APP_API_URL` (con `REACT_APP_` al inicio)
- Debe terminar en `/api`
- Selecciona las 3 opciones de Environment

⏰ **Primera carga:**
- El backend puede tardar 30-60 segundos si estaba hibernando
- Es normal en el plan gratuito de Render
- Las siguientes cargas serán instantáneas

---

## 🎉 ¿TODO LISTO?

Si marcaste todos los checkboxes y la aplicación funciona:

**¡FELICITACIONES! Tu sistema está en producción** 🚀

Si algo no funciona, revisa: `PASO_A_PASO_RENDER_VERCEL.md` para troubleshooting.

---

**Creado:** 12 de noviembre de 2025
