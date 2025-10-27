# Guía de Deploy a Producción

## 📋 Variables de Entorno

### Backend (Render)
Configura estas variables en el dashboard de Render:

```
NODE_ENV=production
DATABASE_URL=postgresql://[tu-usuario]:[tu-password]@[host]/[database]?sslmode=require
PORT=10000
```

**Importante:** La `DATABASE_URL` debe apuntar a tu base de datos Neon en producción.

---

### Frontend (Vercel)
Configura estas variables en el dashboard de Vercel:

```
REACT_APP_API_URL=https://[tu-backend-render].onrender.com/api
```

**Importante:** Reemplaza `[tu-backend-render]` con la URL real de tu backend en Render.

---

## 🚀 Pasos para Deploy

### 1. Hacer commit y push de los cambios

```bash
cd "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2"
git add .
git commit -m "Deploy: nuevas funcionalidades de importación y mejoras"
git push origin main
```

### 2. Deploy del Backend (Render)

1. Ve a tu dashboard de Render: https://dashboard.render.com
2. Selecciona tu servicio de backend
3. El deploy debería iniciarse automáticamente al detectar el push
4. Si no, presiona el botón "Manual Deploy"
5. Monitorea los logs para verificar que todo esté correcto

### 3. Deploy del Frontend (Vercel)

1. Ve a tu dashboard de Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. El deploy debería iniciarse automáticamente
4. Verifica que las variables de entorno estén configuradas correctamente
5. Espera a que termine el build

### 4. Verificación Post-Deploy

1. Accede a la URL de producción de tu frontend
2. Abre las DevTools del navegador (F12) → Console
3. Verifica que no haya errores de CORS o conexión
4. Prueba las nuevas funcionalidades:
   - Panel de importación
   - Descarga de plantillas
   - Importación de ventas y abonos
   - Tablas comparativas
   - Exportación XLSX

---

## ⚠️ Troubleshooting

### Error de CORS
- Verifica que la URL del frontend esté en la lista de orígenes permitidos en `backend/src/serverApp.js`
- Asegúrate de que `REACT_APP_API_URL` en Vercel apunte a la URL correcta de Render

### Error 500 en importación
- Revisa los logs en Render para ver detalles del error
- Verifica que la conexión a la base de datos Neon esté funcionando

### Frontend no conecta con Backend
- Verifica que `REACT_APP_API_URL` esté correctamente configurada en Vercel
- Asegúrate de que el backend esté corriendo en Render (status: "Running")

---

## 📝 Notas Importantes

1. **Archivos grandes:** La carpeta `uploads/` no se sube a git (está en `.gitignore`). Los archivos subidos en producción se almacenan en el sistema de archivos temporal de Render.

2. **Logs de importación:** Para implementar persistencia de logs, considera usar un servicio de almacenamiento como AWS S3 o Cloudflare R2.

3. **Base de datos:** Asegúrate de que tu plan de Neon soporte las conexiones concurrentes necesarias.

4. **Monitoreo:** Revisa regularmente los logs en Render y Vercel para detectar errores tempranos.
