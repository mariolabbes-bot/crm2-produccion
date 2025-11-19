# 🧪 Testing Importación Asíncrona

**Fecha:** 13 de Noviembre 2025  
**Commit:** d0297aa - fix: Agregar dependencia uuid para job tracking  
**Status:** ✅ **LISTO PARA TESTING**

---

## ✅ FIX COMPLETADO

**Problema encontrado:** Error `Cannot find module 'uuid'`  
**Causa:** Faltaba dependencia en `package.json`  
**Solución:** Agregada `"uuid": "^9.0.1"` en dependencies  
**Commit:** d0297aa  
**Estado:** ✅ **Deployado y verificado** (Backend online)

**🎯 SISTEMA LISTO - Procede con Fase 1 de testing**

---

## ✅ Estado del Deployment

### Backend (Render)
- **URL:** https://crm2-backend.onrender.com
- **Status:** ✅ Online (verificado /api/health)
- **Cambios deployados:**
  - ✅ Tabla `import_job` creada en Neon DB
  - ✅ Service `importJobs.js` con procesamiento async
  - ✅ Endpoint `POST /api/import/ventas` refactorizado (retorna 202 + jobId)
  - ✅ Endpoint `GET /api/import/status/:jobId` (nuevo)

### Frontend (Vercel)
- **URL:** https://crm2-produccion.vercel.app
- **Status:** ✅ Online
- **Cambios deployados:**
  - ✅ `api.js` con polling logic (cada 3s, timeout 15min)

---

## 🔬 Plan de Testing

### Fase 1: Test con Archivo Pequeño (RECOMENDADO PRIMERO)

**Objetivo:** Validar flujo async sin riesgo de datos

**Pasos:**
1. **Crear archivo de prueba pequeño:**
   - Abrir `Plantilla_Ventas_Importacion.xlsx`
   - Copiar 10-50 filas de datos válidos
   - Guardar como `test_ventas_pequeño.xlsx`

2. **Subir archivo:**
   - Ir a https://crm2-produccion.vercel.app/import-data
   - Click en "Seleccionar archivo de ventas"
   - Seleccionar `test_ventas_pequeño.xlsx`
   - Click en "Importar Ventas"

3. **Monitorear consola del navegador (F12):**
   ```
   📤 Iniciando upload de ventas: test_ventas_pequeño.xlsx
   ⏳ Importación iniciada (job: <UUID>) - Polling status...
   📊 [Job <UUID>] Status: processing | Progreso: 0/?
   📊 [Job <UUID>] Status: processing | Progreso: 10/50
   📊 [Job <UUID>] Status: completed | Progreso: 45/50
   ✅ Job completado: {...}
   ```

4. **Verificar resultado:**
   - ✅ Mensaje de éxito en UI
   - ✅ Información de filas importadas/duplicadas/errores
   - ✅ Links de descarga si hay reportes
   - ✅ No timeouts ni errores

**Resultado Esperado:**
- ⏱️ Respuesta inmediata (202) en <1s
- 🔄 Polling cada 3s hasta completion
- ✅ Completion exitoso en <30s para archivo pequeño
- 📊 UI muestra resultado final

---

### Fase 2: Test con Archivo Real (Oct-Nov 2025)

**Objetivo:** Importar datos de producción

**⚠️ IMPORTANTE:** Solo ejecutar después de validar Fase 1

**Archivos a importar:**
1. `VENTAS_OCT_NOV_2025.xlsx` (si existe)
2. `ABONOS_OCT_NOV_2025.xlsx` (si existe)

**Nota:** Si no tienes archivos específicos de Oct-Nov, usa los archivos completos que tengas.

**Pasos:**
1. **Backup preventivo (recomendado):**
   ```bash
   # Exportar datos actuales desde Neon DB
   # (Por si necesitas rollback)
   ```

2. **Importar ventas:**
   - Ir a https://crm2-produccion.vercel.app/import-data
   - Seleccionar archivo de ventas Oct-Nov
   - Click "Importar Ventas"
   - **Esperar hasta completion** (puede tomar 5-10 minutos)

3. **Monitorear progreso:**
   - Consola: Ver logs de progreso cada 100 filas
   - Backend logs (Render): Ver procesamiento en tiempo real
   - UI: Debería mostrar "Procesando..." o similar

4. **Al completar:**
   - Descargar reportes si hay faltantes
   - Verificar mensajes de duplicados
   - Anotar filas importadas vs total

5. **Repetir para abonos** (si aplica)

**Resultado Esperado:**
- ⏱️ Procesamiento completo en 5-15 minutos (según tamaño)
- ✅ No timeouts del navegador
- 📊 Datos importados correctamente
- 📋 Reportes generados si hay faltantes

---

### Fase 3: Validación en Dashboard

**Objetivo:** Confirmar que datos son correctos

**Pasos:**
1. **Ir al Dashboard:**
   - https://crm2-produccion.vercel.app/dashboard

2. **Verificar KPIs Mes Actual (Noviembre 2025):**
   - ✅ Ventas totales > 0
   - ✅ Litros vendidos > 0
   - ✅ Clientes activos > 0
   - ✅ Ticket promedio calculado correctamente

3. **Verificar Gráfico Evolución Mensual:**
   - ✅ Datos desde Enero 2024 hasta Noviembre 2025
   - ✅ Barras para todos los meses (incluye Oct y Nov 2025)
   - ✅ Valores coherentes con importaciones previas

4. **Verificar Gráfico Ventas por Familia:**
   - ✅ Todas las familias presentes
   - ✅ Valores actualizados con nuevos datos

5. **Verificar Top Clientes:**
   - ✅ Lista de clientes con ventas
   - ✅ Valores ordenados correctamente

---

## 🐛 Troubleshooting

### Problema: "Error 404 - Job no encontrado"
**Causa:** jobId no existe en DB  
**Solución:** Verificar que tabla `import_job` esté creada en Neon

### Problema: "Timeout: El job tardó más de 15 minutos"
**Causa:** Archivo demasiado grande o procesamiento muy lento  
**Solución:**
1. Verificar logs del backend (Render)
2. Aumentar timeout en `frontend/src/api.js` (línea ~170)
3. Considerar dividir archivo en partes más pequeñas

### Problema: Job queda en "processing" indefinidamente
**Causa:** Error en procesamiento pero no se actualizó status  
**Solución:**
1. Revisar logs de Render para ver el error
2. Consultar tabla `import_job` directamente en DB
3. Verificar que archivo no tenga datos corruptos

### Problema: "Access denied. Insufficient permissions"
**Causa:** Sesión expirada o rol incorrecto  
**Solución:**
1. Logout y login nuevamente
2. Verificar que usuario tenga rol "manager" en DB

---

## 📊 Monitoreo en Tiempo Real

### Ver logs del backend (Render):
1. Ir a https://dashboard.render.com
2. Seleccionar servicio `crm2-backend`
3. Click en "Logs"
4. Buscar mensajes como:
   ```
   ✅ Job <UUID> iniciado para <filename>
   📊 [Job <UUID>] Procesando fila 100/5000...
   📊 [Job <UUID>] Procesando fila 200/5000...
   ✅ [Job <UUID>] Completado exitosamente
   ```

### Ver logs del frontend (Browser):
1. Abrir DevTools (F12)
2. Tab "Console"
3. Buscar mensajes de polling:
   ```
   📊 [Job <UUID>] Status: processing | Progreso: 100/5000
   ```

---

## 📝 Checklist Final

Antes de considerar testing completo, verificar:

- [ ] ✅ Backend responde (GET /api/health)
- [ ] ✅ Tabla `import_job` existe en Neon DB
- [ ] ✅ Test con archivo pequeño (10-50 filas) exitoso
- [ ] ✅ Polling funciona (logs en consola cada 3s)
- [ ] ✅ Job completa sin timeouts
- [ ] ✅ UI muestra resultado final
- [ ] ✅ Reportes se descargan si hay faltantes
- [ ] ✅ Datos aparecen en dashboard
- [ ] ✅ KPIs actualizados correctamente
- [ ] ✅ Gráficos muestran Oct-Nov 2025

---

## 🎯 Siguiente Paso

**Una vez completado el testing:**
1. Importar archivos completos de Oct-Nov 2025 (si no se hizo en Fase 2)
2. Aplicar mismo patrón async a endpoint `/abonos` (si es necesario)
3. Considerar mejoras UX:
   - Progress bar visual en UI (además de logs)
   - Notificaciones cuando job completa
   - Historial de jobs en `/import-data`

---

## 💡 Notas Técnicas

**Arquitectura Async:**
- Cliente sube archivo → recibe 202 + jobId inmediatamente
- Backend procesa en background (fire-and-forget)
- Cliente hace polling GET /import/status/:jobId cada 3s
- Máximo 15min de polling (300 attempts × 3s)
- Job almacena resultado completo en JSONB

**Estados del Job:**
- `pending`: Creado pero no iniciado
- `processing`: En ejecución
- `completed`: Finalizado exitosamente
- `failed`: Error durante procesamiento

**Ventajas:**
- ✅ No más timeouts del navegador
- ✅ Escala para archivos de cualquier tamaño
- ✅ Usuario puede cerrar tab y volver después
- ✅ Historial completo de importaciones
- ✅ Progress tracking granular

---

**¡Listo para testing! 🚀**
