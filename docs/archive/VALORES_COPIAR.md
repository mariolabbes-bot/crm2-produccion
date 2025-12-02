# 📋 HOJA DE REFERENCIA RÁPIDA - VALORES A COPIAR

Usa esta hoja para copiar y pegar los valores exactos.

---

## 🔴 VARIABLES PARA RENDER

### Acceso
```
URL: https://dashboard.render.com
Servicio: crm2-backend
Ubicación: Environment → Add Environment Variable
```

### Variables a agregar

**1. NODE_ENV**
```
production
```

**2. PORT**
```
10000
```

**3. DATABASE_URL**
```
postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

**4. CORS_ORIGINS**
```
https://crm2-produccion.vercel.app,http://localhost:3000
```

**5. JWT_SECRET**
```
baa20e848edf99dcdaa39ca95f0771af3e5a82d059061cbd8aa04e7410323d3e
```

---

## 🟢 VARIABLES PARA VERCEL

### Acceso
```
URL: https://vercel.com/dashboard
Proyecto: crm2-produccion
Ubicación: Settings → Environment Variables
```

### Variables a agregar

**1. REACT_APP_API_URL**
```
https://crm2-backend.onrender.com/api
```
Environments: ✅ Production, ✅ Preview, ✅ Development

**2. NODE_ENV**
```
production
```
Environments: ✅ Production

---

## 🔵 COMANDOS DE VERIFICACIÓN

### Desde Terminal
```bash
cd "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2"
./verificar_conexion.sh
```

### Verificación Manual
```
Backend:  https://crm2-backend.onrender.com
Frontend: https://crm2-produccion.vercel.app
```

---

## ⚠️ RECORDATORIOS

1. **En Render**: Después de agregar variables → Manual Deploy
2. **En Vercel**: Después de agregar variables → Redeploy
3. **Primera carga**: Puede tardar 30-60 segundos (hibernación)
4. **Sin espacios**: En CORS_ORIGINS no debe haber espacios después de la coma

---

## 📞 DASHBOARDS

```
Render:  https://dashboard.render.com
Vercel:  https://vercel.com/dashboard
Neon:    https://console.neon.tech
GitHub:  https://github.com/mariolabbes-bot/crm2-produccion
```

---

## ✅ RESULTADO ESPERADO

**Backend debe mostrar:**
```json
{
  "status": "ok",
  "message": "CRM2 Backend API - Versión: 2024-11-12",
  "environment": "production",
  "timestamp": "2025-11-12T..."
}
```

**Frontend debe:**
- Cargar la aplicación sin errores
- NO mostrar errores de CORS en consola (F12)
- Conectarse al backend correctamente

---

**Última actualización:** 12 de noviembre de 2025

**Tip:** Guarda este archivo o mantenlo abierto mientras configuras.
