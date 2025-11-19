-- Script para limpiar datos de las tablas (mantiene la estructura)
-- Ejecuta esto ANTES de volver a cargar los datos

-- Primero eliminar las tablas con foreign keys (hijas)
TRUNCATE TABLE venta CASCADE;
TRUNCATE TABLE abono CASCADE;

-- Luego las tablas principales
TRUNCATE TABLE cliente CASCADE;
TRUNCATE TABLE producto CASCADE;
TRUNCATE TABLE usuario CASCADE;

-- Verificar que estén vacías
SELECT 'usuario' as tabla, COUNT(*) as registros FROM usuario
UNION ALL
SELECT 'producto', COUNT(*) FROM producto
UNION ALL
SELECT 'cliente', COUNT(*) FROM cliente
UNION ALL
SELECT 'venta', COUNT(*) FROM venta
UNION ALL
SELECT 'abono', COUNT(*) FROM abono;
