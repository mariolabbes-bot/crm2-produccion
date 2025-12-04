# 🗑️ Guía de Limpieza de Tabla Ventas

**Fecha:** 4 de diciembre de 2025  
**Motivo:** Discrepancias en datos de ventas desde 2024 requieren re-importación

---

## 📋 Situación Actual

- Se detectaron discrepancias en los datos de la tabla `venta` desde 2024
- Necesitas limpiar todos los registros desde 2024-01-01 hasta la fecha
- Luego re-importar con los datos corregidos

---

## 🎯 Opciones para Limpiar

### Opción 1: Script de Terminal (Recomendado para esta vez) ✅

**Ventajas:**
- Proceso interactivo con confirmación
- Muestra estadísticas detalladas antes y después
- Seguro (usa transacciones)
- Ideal para operaciones puntuales

**Cómo ejecutar:**

```bash
# 1. Navegar a la carpeta del proyecto
cd /Users/mariolabbe/Desktop/TRABAJO\ IA/CRM2

# 2. Ejecutar el script
node backend/scripts/limpiar_ventas_desde_2024.js
```

**El script te mostrará:**
```
🗑️  LIMPIEZA DE TABLA VENTAS - DESDE 2024
────────────────────────────────────────────────────────────

📊 Estadísticas actuales:
   Total de registros: 77,017
   Rango de fechas: 2023-01-01 → 2025-12-03
   Registros desde 2024-01-01: 52,340
   Registros antes de 2024 (serán preservados): 24,677

⚠️  ADVERTENCIA:
   Se eliminarán TODOS los registros desde 2024-01-01 en adelante.
   Total a eliminar: 52,340 registros
   Total a preservar: 24,677 registros

   Esta acción NO se puede deshacer.

¿Deseas continuar? (escribe "SI" para confirmar):
```

**Después de escribir "SI":**
```
✅ Eliminados: 52,340 registros
✅ Transacción confirmada (COMMIT)

📊 Estadísticas después de la limpieza:
   Total de registros: 24,677
   Rango de fechas: 2023-01-01 → 2023-12-31

✅ Limpieza completada exitosamente.

💡 Ahora puedes importar los nuevos datos de ventas desde 2024.
```

---

### Opción 2: Endpoint API (Para operaciones futuras desde Postman)

**Ventajas:**
- Se puede ejecutar desde Postman
- Permite especificar rango de fechas exacto
- Útil para limpiezas específicas en el futuro

**Cómo usar:**

```http
DELETE https://crm2-backend.onrender.com/api/import/ventas/limpiar?desde=2024-01-01
Authorization: Bearer <tu-token-manager>
```

**Con rango específico (opcional):**
```http
DELETE https://crm2-backend.onrender.com/api/import/ventas/limpiar?desde=2024-01-01&hasta=2024-12-31
Authorization: Bearer <tu-token-manager>
```

**Response:**
```json
{
  "success": true,
  "msg": "Limpieza completada. 52,340 registros eliminados",
  "registrosEliminados": 52340,
  "totalRestante": 24677,
  "rango": {
    "desde": "2024-01-01",
    "hasta": "sin límite"
  }
}
```

---

## 🔄 Proceso Completo de Re-importación

### Paso 1: Limpieza ✅

```bash
# Ejecutar script de limpieza
node backend/scripts/limpiar_ventas_desde_2024.js

# Escribir "SI" cuando se solicite confirmación
```

### Paso 2: Verificación ✅

```bash
# Opcional: Verificar que la limpieza fue exitosa
psql $DATABASE_URL -c "
SELECT 
  COUNT(*) as total,
  MIN(fecha_emision) as fecha_min,
  MAX(fecha_emision) as fecha_max
FROM venta;
"
```

**Resultado esperado:**
- Total: ~24,677 (solo registros antes de 2024)
- fecha_min: 2023-01-01 (o anterior)
- fecha_max: 2023-12-31 (o anterior a 2024)

### Paso 3: Re-importación 📥

1. **Preparar archivo Excel:**
   - Asegúrate de que el archivo `VENTAS.xlsx` contiene los datos corregidos desde 2024

2. **Importar desde el panel web:**
   - Login como manager en: https://crm2-produccion.vercel.app
   - Ir a "Importación de Datos"
   - Seleccionar "📊 Ventas"
   - Subir archivo `VENTAS.xlsx`
   - Click en "Importar y Procesar"

3. **Monitorear progreso:**
   - El sistema procesará en segundo plano
   - Puedes consultar el estado con el `jobId` que te devuelve:
   ```http
   GET https://crm2-backend.onrender.com/api/import/jobs/:jobId
   ```

4. **Verificar resultado:**
   - Ir al Dashboard
   - Verificar KPIs de ventas
   - Revisar que los valores sean correctos

---

## ⚠️ Consideraciones Importantes

### Seguridad

- ✅ **Transacciones:** Todas las operaciones usan `BEGIN`/`COMMIT`/`ROLLBACK`
- ✅ **Confirmación:** El script requiere escribir "SI" explícitamente
- ✅ **Solo managers:** El endpoint requiere autenticación con rol manager
- ✅ **Sin CASCADE:** La limpieza solo afecta la tabla `venta`, no afecta otras tablas

### Integridad de Datos

**Preservado:**
- ✅ Clientes (tabla `cliente` no se toca)
- ✅ Usuarios/Vendedores (tabla `usuario` no se toca)
- ✅ Abonos (tabla `abono` no se toca)
- ✅ Saldo Crédito (tabla `saldo_credito` no se toca)
- ✅ Ventas antes de 2024 (solo se eliminan desde 2024-01-01)

**Eliminado:**
- ❌ Todas las ventas con `fecha_emision >= '2024-01-01'`

### Performance

- **Tiempo estimado:** ~5-10 segundos para eliminar ~50,000 registros
- **Importación:** Depende del tamaño del archivo (procesa en background)
- **Sin downtime:** La API sigue funcionando durante el proceso

---

## 🔍 Verificación Post-Limpieza

### Query SQL para verificar:

```sql
-- 1. Total de ventas y rango de fechas
SELECT 
  COUNT(*) as total_ventas,
  MIN(fecha_emision) as primera_fecha,
  MAX(fecha_emision) as ultima_fecha
FROM venta;

-- 2. Distribución por año (debería mostrar 0 para 2024 y 2025)
SELECT 
  EXTRACT(YEAR FROM fecha_emision) as anio,
  COUNT(*) as total
FROM venta
WHERE fecha_emision IS NOT NULL
GROUP BY anio
ORDER BY anio DESC;

-- 3. Verificar que no hay registros desde 2024
SELECT COUNT(*) as registros_2024_en_adelante
FROM venta
WHERE fecha_emision >= '2024-01-01';
-- Resultado esperado: 0
```

---

## 📝 Log de Ejecución (Para tu referencia)

**Fecha de limpieza:** _________  
**Hora de inicio:** _________  
**Registros eliminados:** _________  
**Registros preservados:** _________  
**Hora de finalización:** _________  
**Duración total:** _________  

**Importación nueva:**  
**Fecha:** _________  
**Archivo:** _________  
**Registros importados:** _________  
**Errores:** _________  

---

## 🆘 Troubleshooting

### Error: "Cannot find module '../src/db'"

**Solución:**
```bash
# Asegúrate de estar en la raíz del proyecto
pwd
# Debe mostrar: /Users/mariolabbe/Desktop/TRABAJO IA/CRM2

# Ejecutar desde raíz:
node backend/scripts/limpiar_ventas_desde_2024.js
```

### Error: "Connection timeout"

**Causa:** La base de datos en Neon puede estar hibernando

**Solución:**
```bash
# 1. Hacer una query simple para despertar la DB
curl https://crm2-backend.onrender.com/api/health

# 2. Esperar 5 segundos

# 3. Volver a ejecutar el script
node backend/scripts/limpiar_ventas_desde_2024.js
```

### Error: "Operation cancelled by the user"

**Causa:** No escribiste "SI" exactamente (con mayúsculas)

**Solución:** Ejecutar de nuevo y escribir `SI` (no `si`, `yes`, `sí`, etc.)

---

## 📞 Contacto

Si tienes algún problema durante el proceso:

1. **Revisar logs del script:** El script muestra información detallada
2. **Verificar estado de la DB:** Usar los queries de verificación
3. **Consultar este documento:** Busca en la sección de Troubleshooting

---

**Última actualización:** 4 de diciembre de 2025  
**Autor:** GitHub Copilot
