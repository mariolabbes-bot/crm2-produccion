# RESUMEN DE CARGA MASIVA - CRM2
Fecha: 8 de noviembre de 2025

## 📊 ARCHIVOS GENERADOS

### Scripts SQL para carga en DBeaver:
1. **carga_usuarios.sql** (4.1 KB)
   - 19 usuarios
   - Sin duplicados

2. **carga_productos.sql** (519 KB)
   - 2,697 productos
   - 1 SKU duplicado resuelto

3. **carga_clientes.sql** (1.0 MB)
   - 2,919 clientes
   - 5 RUTs duplicados resueltos

4. **carga_ventas.sql** (28 MB) ⭐
   - 77,029 registros de ventas
   - 0 duplicados encontrados
   - Tiempo estimado de carga: 5-10 minutos

5. **carga_abonos.sql** (10 MB) ⭐
   - 40,932 registros de abonos
   - 698 duplicados omitidos
   - Tiempo estimado de carga: 3-5 minutos

### Reportes de duplicados para revisión:
6. **abonos_duplicados_reporte.csv** (61 KB)
   - 698 registros duplicados identificados
   - Columnas: linea, folio, identificador, fecha, rut_cliente, cliente, vendedor, monto, monto_neto

---

## 🚀 ORDEN DE EJECUCIÓN EN DBEAVER

### Paso 1: Actualizar constraint de ABONOS
```sql
-- Archivo: actualizar_constraint_abono.sql
-- Cambia UNIQUE(folio) a UNIQUE(folio, identificador_abono, fecha)
```

### Paso 2: Cargar datos base (si no están cargados)
```sql
1. carga_usuarios.sql     → 19 registros
2. carga_productos.sql    → 2,697 registros  
3. carga_clientes.sql     → 2,919 registros
```

### Paso 3: Cargar datos transaccionales (CARGA MASIVA)
```sql
4. carga_ventas.sql       → 77,029 registros (⏱️ ~5-10 min)
5. carga_abonos.sql       → 40,932 registros (⏱️ ~3-5 min)
```

---

## ⚠️ NOTAS IMPORTANTES

### Duplicados en ABONOS:
- **698 registros duplicados** encontrados con la misma combinación de (folio + identificador + fecha)
- Estos duplicados fueron **automáticamente omitidos** en el script SQL
- Revisar archivo `abonos_duplicados_reporte.csv` para análisis posterior
- Posibles causas:
  - Múltiples exportaciones del mismo período
  - Errores de sincronización en el sistema fuente
  - Abonos parciales registrados múltiples veces

### Constraint UNIQUE en ABONOS:
La tabla ABONOS ahora usa un constraint compuesto para garantizar unicidad:
```sql
UNIQUE (folio, identificador_abono, fecha)
```

Este constraint es **más robusto** que usar solo el folio, ya que:
- El mismo folio puede tener diferentes identificadores (distintos abonos)
- El mismo folio puede repetirse en diferentes fechas
- La combinación de los 3 campos garantiza unicidad real

### Foreign Keys:
Los scripts validan automáticamente:
- ✅ `venta.identificador` → `cliente.rut`
- ✅ `venta.vendedor_cliente` → `usuario.nombre_vendedor`
- ✅ `venta.sku` → `producto.sku`
- ✅ `abono.identificador` → `cliente.rut`
- ✅ `abono.vendedor_cliente` → `usuario.nombre_vendedor`

---

## 📈 ESTADÍSTICAS TOTALES

**Registros base:**
- Usuarios: 19
- Productos: 2,697
- Clientes: 2,919
- **Subtotal: 5,635 registros**

**Registros transaccionales:**
- Ventas: 77,029
- Abonos: 40,932
- **Subtotal: 117,961 registros**

**TOTAL GENERAL: 123,596 registros históricos**

---

## ✅ VALIDACIONES POST-CARGA

Después de ejecutar los scripts, ejecutar estas consultas para validar:

```sql
-- 1. Conteo general
SELECT 'usuario' as tabla, COUNT(*) as registros FROM usuario
UNION ALL
SELECT 'producto', COUNT(*) FROM producto
UNION ALL
SELECT 'cliente', COUNT(*) FROM cliente
UNION ALL
SELECT 'venta', COUNT(*) FROM venta
UNION ALL
SELECT 'abono', COUNT(*) FROM abono;

-- 2. Verificar ventas por vendedor
SELECT vendedor_cliente, COUNT(*) as num_ventas, SUM(valor_total) as total_vendido
FROM venta 
WHERE vendedor_cliente IS NOT NULL 
GROUP BY vendedor_cliente 
ORDER BY total_vendido DESC;

-- 3. Verificar abonos por vendedor
SELECT vendedor_cliente, COUNT(*) as num_abonos, SUM(monto) as total_abonado
FROM abono 
WHERE vendedor_cliente IS NOT NULL 
GROUP BY vendedor_cliente 
ORDER BY total_abonado DESC;

-- 4. Verificar integridad de FKs (no debe devolver resultados)
SELECT DISTINCT v.identificador 
FROM venta v 
WHERE v.identificador IS NOT NULL 
AND v.identificador NOT IN (SELECT rut FROM cliente);

-- 5. Verificar fechas de ventas
SELECT 
    DATE_TRUNC('month', fecha_emision) as mes,
    COUNT(*) as num_ventas,
    SUM(valor_total) as total_mes
FROM venta
GROUP BY mes
ORDER BY mes DESC
LIMIT 12;
```

---

## 📝 PRÓXIMOS PASOS

1. ✅ Ejecutar actualizar_constraint_abono.sql
2. ✅ Cargar carga_ventas.sql
3. ✅ Cargar carga_abonos.sql
4. ✅ Ejecutar validaciones post-carga
5. 📋 Revisar abonos_duplicados_reporte.csv
6. 🔄 Preparar proceso de actualización periódica (mensual)
