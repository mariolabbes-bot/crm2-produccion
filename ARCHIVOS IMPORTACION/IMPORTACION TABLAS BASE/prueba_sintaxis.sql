-- Script de PRUEBA para verificar sintaxis
-- Ejecuta este archivo PRIMERO para confirmar que todo funciona

-- 1. Verificar conexión
SELECT 'Conexión exitosa' as mensaje;

-- 2. Contar registros actuales
SELECT COUNT(*) as ventas_actuales FROM venta;

-- 3. Insertar 1 registro de prueba
INSERT INTO venta (sucursal, tipo_documento, folio, fecha_emision, identificador, cliente, vendedor_cliente, vendedor_documento, indice, sku, descripcion, cantidad, precio, valor_total) 
VALUES ('TEST', 'Boleta', 'TEST-001', '2024-12-31', '66666666-6', 'Cliente TEST', NULL, NULL, '1', 'TEST-SKU', 'PRODUCTO DE PRUEBA', 1, 1000, 1000);

-- 4. Verificar que se insertó
SELECT * FROM venta WHERE folio = 'TEST-001';

-- 5. Eliminar el registro de prueba
DELETE FROM venta WHERE folio = 'TEST-001';

-- 6. Confirmar eliminación
SELECT 'Prueba completada exitosamente. Ahora puedes ejecutar los archivos de carga.' as mensaje;
