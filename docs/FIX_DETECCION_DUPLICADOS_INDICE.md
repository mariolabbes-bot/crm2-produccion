# 🔧 Fix: Detección de Duplicados - Ahora con Índice

**Problema detectado:** 11,827 registros marcados como "duplicados"  
**Causa raíz:** Detección de duplicados solo consideraba `folio` + `tipo_documento`  
**Solución:** Incluir también `indice` en la clave única

---

## 📋 Explicación del Problema

### Antes (❌ Incorrecto):

```
Clave única = tipo_documento + folio

Ejemplo:
- Folio: 12345, Tipo: FACTURA, Índice: 1 ← Guardado
- Folio: 12345, Tipo: FACTURA, Índice: 2 ← Rechazado como DUPLICADO (❌ Error!)
- Folio: 12345, Tipo: FACTURA, Índice: 3 ← Rechazado como DUPLICADO (❌ Error!)

Total rechazados: 11,827 registros (que en realidad son líneas diferentes del mismo folio)
```

**Por qué estaba mal:**
- Un folio (documento) puede tener múltiples líneas de items
- Cada línea tiene un `indice` diferente
- El sistema estaba considerando línea 2 y línea 3 como "duplicadas" de línea 1

---

### Después (✅ Correcto):

```
Clave única = tipo_documento + folio + indice

Ejemplo:
- Folio: 12345, Tipo: FACTURA, Índice: 1 ← Guardado (clave: "FACTURA|12345|1")
- Folio: 12345, Tipo: FACTURA, Índice: 2 ← Guardado (clave: "FACTURA|12345|2") ✅
- Folio: 12345, Tipo: FACTURA, Índice: 3 ← Guardado (clave: "FACTURA|12345|3") ✅

Total guardados: Todos los registros (como debería ser)
```

---

## 🎯 Cambios Técnicos

### Archivo: `backend/src/services/importJobs.js`

**Línea 205-210: Query de duplicados**
```javascript
// ANTES:
const existingSales = await client.query(
  "SELECT folio, tipo_documento FROM venta WHERE folio IS NOT NULL AND tipo_documento IS NOT NULL"
);

// DESPUÉS:
const existingSales = await client.query(
  "SELECT folio, tipo_documento, indice FROM venta WHERE folio IS NOT NULL AND tipo_documento IS NOT NULL"
);
```

**Línea 211-213: Clave única**
```javascript
// ANTES:
const existingKeys = new Set(
  existingSales.rows.map(s => `${norm(s.tipo_documento)}|${norm(s.folio)}`)
);

// DESPUÉS:
const existingKeys = new Set(
  existingSales.rows.map(s => `${norm(s.tipo_documento)}|${norm(s.folio)}|${norm(s.indice || '')}`)
);
```

**Línea 228-232: Detección en el loop**
```javascript
// ANTES:
const key = `${norm(tipoDoc)}|${norm(folio)}`;

// DESPUÉS:
const indice = colIndice && row[colIndice] ? String(row[colIndice]).trim() : '';
const key = `${norm(tipoDoc)}|${norm(folio)}|${norm(indice)}`;
```

---

## 📊 Impacto Esperado

### Antes de este fix:
- ✅ Importados: ~72,000 registros
- ❌ Rechazados como duplicados: ~11,827 registros
- ❌ Tasa de rechazo: 14%

### Después de este fix:
- ✅ Importados: ~83,000-84,000 registros (casi todos)
- ❌ Rechazados: Muy pocos (solo verdaderos duplicados dentro del archivo)
- ✅ Tasa de rechazo: <1%

---

## 🔄 Cómo Re-importar Correctamente

### Opción A: Limpiar y Re-importar (Recomendado)

**Paso 1: Limpiar tabla de ventas**
```bash
node backend/scripts/limpiar_ventas_2024_auto.js
```

**Paso 2: Re-importar el mismo archivo**
- Login en: https://crm2-produccion.vercel.app
- Ir a: Importación de Datos → Ventas
- Subir el mismo archivo Excel
- Click: "Importar y Procesar"

**Resultado esperado:**
- ✅ Casi todos los 83,000+ registros importados
- ✅ Solo ~100-200 verdaderos duplicados rechazados (si los hay)
- ✅ Mejor cobertura de datos

**Tiempo:** ~3-5 minutos

---

### Opción B: Solo Importar Nuevos Registros (Sin limpiar)

Si no quieres limpiar todo:

1. El sistema ahora detectará correctamente cuáles son verdaderos duplicados
2. Importará los ~11,827 registros que antes rechazaba
3. Rechazará solo registros exactamente iguales en folio+tipo+índice

**Tiempo:** ~3-5 minutos (adicionales a lo ya importado)

---

## ✅ Verificación Post-Fix

### Query para verificar:

```sql
-- Verificar registros por índice
SELECT 
  folio, 
  tipo_documento, 
  COUNT(DISTINCT indice) as indices,
  COUNT(*) as total
FROM venta
WHERE folio IS NOT NULL AND tipo_documento IS NOT NULL
GROUP BY folio, tipo_documento
HAVING COUNT(*) > 1
LIMIT 10;
```

**Resultado esperado:** Deberías ver folios con múltiples índices (1, 2, 3, etc.)

```
folio  | tipo_documento | indices | total
-------|----------------|---------|-------
12345  | FACTURA        |    3    |   3
12346  | FACTURA        |    2    |   2
12347  | FACTURA        |    1    |   1
```

---

## 🛡️ Seguridad & Integridad

✅ **No afecta datos existentes**
- Los 72,000 registros ya importados permanecen intactos
- Solo afecta la detección de duplicados en nuevas importaciones

✅ **Transacciones intactas**
- Sigue usando BEGIN/COMMIT/ROLLBACK
- Batch inserts optimizado se mantiene

✅ **Validaciones preservadas**
- Clientes faltantes
- Vendedores faltantes
- Estados y otros campos

---

## 📈 Impacto en KPIs

Después de re-importar correctamente:
- **Ventas totales:** +15-20% (porque recuperamos los ~11,827 registros)
- **Monto total:** +15-20% (más líneas = más ingresos registrados)
- **Representación por vendedor:** Más precisa
- **Análisis de tendencias:** Más completo

**Los valores en el Dashboard se actualizarán automáticamente** ✅

---

## 🔍 Debugging

### Si ves otros problemas:

**Pregunta:** ¿Cuántos "duplicados" se muestran ahora en la importación?

**Respuesta esperada:** <200 registros (verdaderos duplicados)

**Si sigue siendo >1000:**
1. Verifica que el archivo Excel no tenga duplicados reales
2. Ejecuta query de verificación arriba
3. Consulta los logs del backend en Render

---

## 📝 Próximos Pasos

### Opción A (Recomendada):
1. ✅ Ejecutar limpieza
2. ✅ Re-importar el archivo
3. ✅ Verificar con queries
4. ✅ Revisar Dashboard

### Opción B (Más conservadora):
1. ✅ Importar archivo de nuevo (sin limpiar)
2. ✅ Sistema detectará los 11,827 como "nuevos"
3. ✅ Se importarán correctamente
4. ✅ Revisar Dashboard

---

## 🚀 Deploy

✅ **Cambios deployados en:** Commit `ebb7be0` (incluye este fix)  
✅ **Status:** En producción (Render)  
✅ **Aplicable:** Inmediatamente en nuevas importaciones

---

**Actualización:** 4 de diciembre de 2025  
**Fix:** Detección de duplicados ahora incluye `indice`  
**Impacto:** +11,827 registros potencialmente recuperables
