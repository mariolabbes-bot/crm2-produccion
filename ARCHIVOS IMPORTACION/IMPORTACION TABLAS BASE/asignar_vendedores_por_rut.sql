-- Asignación de vendedores por RUT
-- Este script actualiza vendedor_cliente en ventas y abonos
-- usando la relación RUT desde la tabla cliente

-- ==================================================
-- PASO 1: Actualizar vendedores en VENTAS
-- ==================================================

UPDATE venta v
SET vendedor_cliente = c.nombre_vendedor
FROM cliente c
WHERE v.identificador = c.rut;

-- Verificar resultado
SELECT 
    COUNT(*) as total_ventas,
    COUNT(vendedor_cliente) as ventas_con_vendedor,
    COUNT(*) - COUNT(vendedor_cliente) as ventas_sin_vendedor,
    ROUND(COUNT(vendedor_cliente) * 100.0 / COUNT(*), 2) as porcentaje_con_vendedor
FROM venta;

-- Ver distribución por vendedor
SELECT 
    vendedor_cliente,
    COUNT(*) as num_ventas,
    ROUND(SUM(valor_total), 2) as total_vendido
FROM venta
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY num_ventas DESC;

-- ==================================================
-- PASO 2: Actualizar vendedores en ABONOS
-- ==================================================

UPDATE abono a
SET vendedor_cliente = c.nombre_vendedor
FROM cliente c
WHERE a.identificador = c.rut;

-- Verificar resultado
SELECT 
    COUNT(*) as total_abonos,
    COUNT(vendedor_cliente) as abonos_con_vendedor,
    COUNT(*) - COUNT(vendedor_cliente) as abonos_sin_vendedor,
    ROUND(COUNT(vendedor_cliente) * 100.0 / COUNT(*), 2) as porcentaje_con_vendedor
FROM abono;

-- Ver distribución por vendedor
SELECT 
    vendedor_cliente,
    COUNT(*) as num_abonos,
    ROUND(SUM(monto), 2) as total_abonado
FROM abono
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY num_abonos DESC;

-- ==================================================
-- RESUMEN FINAL
-- ==================================================

SELECT 
    'VENTAS' as tabla,
    COUNT(*) as total_registros,
    COUNT(vendedor_cliente) as con_vendedor,
    ROUND(COUNT(vendedor_cliente) * 100.0 / COUNT(*), 1) as porcentaje
FROM venta

UNION ALL

SELECT 
    'ABONOS' as tabla,
    COUNT(*) as total_registros,
    COUNT(vendedor_cliente) as con_vendedor,
    ROUND(COUNT(vendedor_cliente) * 100.0 / COUNT(*), 1) as porcentaje
FROM abono;
