-- Script para verificar el estado actual de la carga
-- Ejecuta esto en DBeaver o terminal para ver qué pasó

-- 1. Total de registros en venta
SELECT COUNT(*) as total_registros FROM venta;

-- 2. Ver los últimos registros insertados (por folio)
SELECT folio, tipo_documento, fecha_emision, cliente, sku 
FROM venta 
ORDER BY id DESC 
LIMIT 20;

-- 3. Ver distribución por fecha
SELECT fecha_emision, COUNT(*) as num_ventas
FROM venta
GROUP BY fecha_emision
ORDER BY fecha_emision DESC
LIMIT 10;

-- 4. Ver qué folios están cargados
SELECT MIN(folio::int) as folio_minimo, 
       MAX(folio::int) as folio_maximo,
       COUNT(DISTINCT folio) as folios_diferentes
FROM venta
WHERE folio ~ '^[0-9]+$';
