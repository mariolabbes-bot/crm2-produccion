-- Script para identificar SKUs faltantes después de cargar ventas
-- Ejecutar DESPUÉS de cargar todas las ventas

-- 1. SKUs vendidos que NO están en la tabla producto
SELECT DISTINCT 
    v.sku,
    v.descripcion,
    COUNT(*) as veces_vendido,
    SUM(v.cantidad) as cantidad_total,
    SUM(v.valor_total) as valor_total
FROM venta v
WHERE v.sku IS NOT NULL
AND v.sku NOT IN (SELECT sku FROM producto)
GROUP BY v.sku, v.descripcion
ORDER BY veces_vendido DESC;

-- 2. Resumen de productos faltantes
SELECT 
    COUNT(DISTINCT v.sku) as skus_faltantes,
    COUNT(*) as ventas_afectadas,
    SUM(v.valor_total) as valor_total_afectado
FROM venta v
WHERE v.sku IS NOT NULL
AND v.sku NOT IN (SELECT sku FROM producto);

-- 3. Generar script para agregar productos faltantes (solo estructura)
SELECT 
    'INSERT INTO producto (sku, descripcion, activo) VALUES ' ||
    '(''' || v.sku || ''', ''' || REPLACE(v.descripcion, '''', '''''') || ''', true);'
FROM (
    SELECT DISTINCT sku, descripcion
    FROM venta
    WHERE sku IS NOT NULL
    AND sku NOT IN (SELECT sku FROM producto)
    ORDER BY sku
) v;
