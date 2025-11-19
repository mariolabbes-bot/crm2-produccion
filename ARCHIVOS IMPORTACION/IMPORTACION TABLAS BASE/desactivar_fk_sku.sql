-- Script para desactivar constraints de FK en tabla VENTA
-- Esto permite cargar ventas con SKUs que no están en la tabla producto
-- IMPORTANTE: Ejecutar ANTES de cargar las ventas

-- 1. Eliminar constraint de FK con SKU
ALTER TABLE venta DROP CONSTRAINT IF EXISTS venta_sku_fkey;

-- 2. Verificar que se eliminó
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'venta'::regclass 
AND contype = 'f';

-- 3. Mensaje de confirmación
SELECT 'Constraint de SKU desactivado. Ahora puedes cargar las ventas.' as mensaje;
