-- Script para limpiar y reiniciar la carga desde cero
-- Ejecuta esto ANTES de comenzar la carga de ventas

-- 1. Limpiar tabla de ventas
TRUNCATE TABLE venta CASCADE;

-- 2. Verificar que quedó vacía
SELECT COUNT(*) as registros_en_venta FROM venta;
-- Debe mostrar: 0

-- 3. Desactivar FK de SKU (permite cargar ventas con SKUs faltantes)
ALTER TABLE venta DROP CONSTRAINT IF EXISTS venta_sku_fkey;

-- Ahora puedes comenzar a cargar desde carga_ventas_lote_001.sql
