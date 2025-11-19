# GUÍA DE CARGA EN LOTES - FORMATO MULTI-LÍNEA

## 📋 RESUMEN

Se han generado archivos SQL con formato multi-línea para facilitar la ejecución en DBeaver:

- **VENTAS**: 78 archivos de ~1000 registros cada uno (77,029 registros totales)
- **ABONOS**: 42 archivos de ~1000 registros cada uno (41,540 registros totales, 90 duplicados omitidos)

## 🔑 VENTAJAS DEL FORMATO MULTI-LÍNEA

- ✅ Cada INSERT dividido en líneas cortas (~80 caracteres máximo)
- ✅ DBeaver puede parsear correctamente sin errores de sintaxis
- ✅ Archivos de ~390 KB (ventas) y ~300 KB (abonos)
- ✅ Mejor legibilidad y debugging

## 📂 UBICACIÓN DE ARCHIVOS

```
ARCHIVOS IMPORTACION/IMPORTACION TABLAS BASE/
├── ventas_lotes/
│   ├── carga_ventas_lote_001.sql  (tiene TRUNCATE TABLE)
│   ├── carga_ventas_lote_002.sql
│   ├── ...
│   └── carga_ventas_lote_078.sql  (tiene UPDATE vendedores)
│
└── abonos_lotes/
    ├── carga_abonos_lote_001.sql  (tiene TRUNCATE TABLE)
    ├── carga_abonos_lote_002.sql
    ├── ...
    └── carga_abonos_lote_042.sql  (tiene UPDATE vendedores)
```

## 🚀 PROCESO DE CARGA

### PASO 1: Desactivar Foreign Key de SKU

Ejecutar primero (antes de cargar ventas):

```sql
-- desactivar_fk_sku.sql
ALTER TABLE venta DROP CONSTRAINT IF EXISTS venta_sku_fkey;
```

**¿Por qué?** Hay 225 SKUs en las ventas que no existen en la tabla `producto`.

### PASO 2: Cargar VENTAS (78 archivos)

Ejecutar EN ORDEN desde DBeaver:

1. `ventas_lotes/carga_ventas_lote_001.sql` - Hace TRUNCATE TABLE, carga primeros 1000
2. `ventas_lotes/carga_ventas_lote_002.sql` - Añade siguientes 1000
3. ... (continuar en orden)
4. `ventas_lotes/carga_ventas_lote_078.sql` - Carga últimos 29 + UPDATE vendedores

**Tiempo estimado**: ~30 segundos por archivo = **39 minutos total**

### PASO 3: Cargar ABONOS (42 archivos)

Ejecutar EN ORDEN desde DBeaver:

1. `abonos_lotes/carga_abonos_lote_001.sql` - Hace TRUNCATE TABLE, carga primeros 1000
2. `abonos_lotes/carga_abonos_lote_002.sql` - Añade siguientes 1000
3. ... (continuar en orden)
4. `abonos_lotes/carga_abonos_lote_042.sql` - Carga últimos 540 + UPDATE vendedores

**Tiempo estimado**: ~30 segundos por archivo = **21 minutos total**

### PASO 4: Verificar Carga

Después de cargar todos los archivos:

```sql
-- Verificar totales
SELECT COUNT(*) as total_ventas FROM venta;  -- Debe ser 77,029

SELECT COUNT(*) as total_abonos FROM abono;  -- Debe ser 41,540

-- Verificar vendedores asignados
SELECT COUNT(*) as ventas_sin_vendedor 
FROM venta 
WHERE vendedor_cliente IS NULL;

SELECT COUNT(*) as abonos_sin_vendedor 
FROM abono 
WHERE vendedor_cliente IS NULL;

-- Ver distribución por vendedor
SELECT vendedor_cliente, COUNT(*) as num_ventas
FROM venta
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY num_ventas DESC;
```

### PASO 5: Identificar SKUs Faltantes

```sql
-- identificar_skus_faltantes.sql
SELECT 
    v.sku,
    v.descripcion,
    COUNT(*) as num_ventas,
    SUM(v.valor_total) as valor_total_ventas
FROM venta v
LEFT JOIN producto p ON v.sku = p.codigo
WHERE p.codigo IS NULL
GROUP BY v.sku, v.descripcion
ORDER BY num_ventas DESC;
```

Esto mostrará los 225 SKUs que se vendieron pero no están en el catálogo.

## ⚠️ NOTAS IMPORTANTES

1. **Orden de ejecución**: Los archivos DEBEN ejecutarse en orden numérico (001, 002, 003...)
2. **Primer archivo**: Solo el `lote_001` hace TRUNCATE TABLE (limpia la tabla)
3. **Último archivo**: Solo el último lote tiene el UPDATE de vendedores desde tabla CLIENTES
4. **Formato multi-línea**: Cada INSERT ocupa ~10 líneas, hace el archivo más legible
5. **Duplicados**: Los duplicados ya fueron filtrados durante la generación

## 📊 ESTADÍSTICAS DE CARGA

- **Ventas únicas**: 77,029 registros
- **Abonos únicos**: 41,540 registros (90 duplicados omitidos)
- **Tiempo total estimado**: ~60 minutos (1 hora)
- **Tamaño total**: 
  - Ventas: 78 archivos × 390 KB = ~30 MB
  - Abonos: 42 archivos × 300 KB = ~13 MB

## 🔄 ACTUALIZACIONES MENSUALES

Para cargas mensuales futuras, solo crear archivos del mes nuevo (sin TRUNCATE):

```python
# Ejemplo: generar_ventas_mes.py
# Similar a generar_inserts_ventas_multilinea.py pero:
# - Sin TRUNCATE TABLE
# - Solo registros del mes nuevo
# - ON CONFLICT DO NOTHING para evitar duplicados
```

## 🐛 TROUBLESHOOTING

### Error: "syntax error at or near..."
- **Causa**: Archivo con formato de línea única
- **Solución**: Usar archivos de `ventas_lotes/` y `abonos_lotes/` (formato multi-línea)

### Error: "violates foreign key constraint venta_sku_fkey"
- **Causa**: No se desactivó la FK de SKU
- **Solución**: Ejecutar `desactivar_fk_sku.sql` antes de cargar ventas

### Vendedores aparecen NULL
- **Causa**: No se ejecutó el último archivo (que tiene el UPDATE)
- **Solución**: Ejecutar el UPDATE manualmente o ejecutar el último lote nuevamente

### Tiempo de ejecución muy largo
- **Normal**: Cada archivo tarda ~30 segundos
- **Si es mucho más**: Revisar índices en la base de datos

## ✅ CHECKLIST DE CARGA

- [ ] Backup de base de datos (por si acaso)
- [ ] Ejecutar `desactivar_fk_sku.sql`
- [ ] Cargar 78 archivos de ventas en orden
- [ ] Verificar COUNT(*) = 77,029 en tabla venta
- [ ] Cargar 42 archivos de abonos en orden
- [ ] Verificar COUNT(*) = 41,540 en tabla abono
- [ ] Ejecutar verificaciones de vendedores
- [ ] Ejecutar `identificar_skus_faltantes.sql`
- [ ] Decidir qué hacer con los 225 SKUs faltantes

---

**Generado**: 2024-11-09
**Versión**: 1.0 (formato multi-línea)
