# Fix Crítico: Detección de fecha_factura en KPIs

**Fecha**: 13 de noviembre de 2025  
**Commit**: ec794c5  
**Severidad**: CRÍTICA

## Problema Detectado

Al probar los endpoints de KPIs en producción, todos devolvían valores en 0:

```json
{
  "success": true,
  "data": {
    "monto_ventas_mes": 0,
    "monto_abonos_mes": 0,
    "variacion_vs_anio_anterior_pct": 0,
    "numero_clientes_con_venta_mes": 0
  }
}
```

Incluso forzando el parámetro `?mes=2024-09` devolvía 0.

## Causa Raíz

El código de auto-detección de columnas en `backend/src/routes/kpis.js` buscaba las siguientes columnas de fecha:

```javascript
// ❌ CÓDIGO ORIGINAL (INCORRECTO)
if (cols.has('invoice_date')) dateCol = 'invoice_date';
else if (cols.has('fecha_emision')) dateCol = 'fecha_emision';
else if (cols.has('fecha')) dateCol = 'fecha';
```

**Problema**: La tabla `venta` en la base de datos Neon PostgreSQL tiene una columna llamada `fecha_factura`, que NO estaba en la lista de detección.

**Resultado**: 
- `dateCol` quedaba como `null`
- Todas las queries SQL fallaban silenciosamente
- Los endpoints devolvían 0 en lugar de datos reales

## Solución Implementada

Se agregó `fecha_factura` como primera opción en la detección:

```javascript
// ✅ CÓDIGO CORREGIDO
if (cols.has('fecha_factura')) dateCol = 'fecha_factura';
else if (cols.has('invoice_date')) dateCol = 'invoice_date';
else if (cols.has('fecha_emision')) dateCol = 'fecha_emision';
else if (cols.has('fecha')) dateCol = 'fecha';
```

## Commit y Deploy

```bash
git add backend/src/routes/kpis.js
git commit -m "fix: agregar fecha_factura a detección de columnas en KPIs"
git push origin main
```

**Commit hash**: `ec794c5`  
**Deploy**: Render auto-deploy activado  
**Tiempo estimado**: 5-10 minutos

## Testing Post-Fix

### Endpoints Afectados

Todos los endpoints de KPIs que usan detección dinámica:

1. ✅ `GET /api/kpis/mes-actual`
2. ✅ `GET /api/kpis/evolucion-mensual`
3. ✅ `GET /api/kpis/ventas-por-familia`
4. ✅ `GET /api/kpis/top-clients`
5. ✅ `GET /api/kpis/sales-summary`

### Validación Requerida

Después del deploy, verificar con curl:

```bash
# Login
curl -X POST https://crm2-backend.onrender.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mario.labbe@lubricar-insa.cl","password":"manager123"}' \
  | jq -r '.token'

# Probar mes-actual
curl https://crm2-backend.onrender.com/api/kpis/mes-actual \
  -H "Authorization: Bearer <TOKEN>" | jq

# Valores esperados (septiembre 2024):
# - monto_ventas_mes: > 0
# - monto_abonos_mes: > 0
# - numero_clientes_con_venta_mes: > 0
```

## Lecciones Aprendidas

1. **Verificar nombres de columnas reales** antes de implementar auto-detección
2. **Testing en entorno de staging** antes de producción
3. **Logs detallados** para debugging de detección dinámica
4. **Documentar estructura de DB** en el proyecto

## Próximos Pasos

- [ ] Validar que el fix funciona en producción
- [ ] Probar los 5 endpoints afectados
- [ ] Actualizar documentación con estructura real de DB
- [ ] Considerar agregar validación explícita si `dateCol === null`
- [ ] Agregar tests unitarios para detección de columnas

## Columnas Reales en DB

Para referencia futura, las columnas correctas son:

**Tabla `venta`**:
- Monto: `valor_total`
- Fecha: `fecha_factura` ← **No detectada originalmente**
- Cliente FK: `cliente_id`

**Tabla `abono`**:
- Monto: `monto`
- Fecha: `fecha_abono`
- Vendedor: `vendedor_cliente`
