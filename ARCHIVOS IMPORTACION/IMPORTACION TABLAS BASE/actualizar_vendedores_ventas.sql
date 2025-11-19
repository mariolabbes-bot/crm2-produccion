-- PASO 1: Actualizar vendedores en VENTAS
-- Problema: Hay un FK constraint que requiere que el vendedor exista en tabla usuario
-- Solución temporal: Desactivar el constraint, hacer UPDATE, reactivar

-- Ver qué vendedores están en cliente pero no en usuario
SELECT DISTINCT c.nombre_vendedor
FROM cliente c
WHERE c.nombre_vendedor NOT IN (SELECT nombre FROM usuario)
ORDER BY c.nombre_vendedor;

-- Estos vendedores necesitan ser agregados a la tabla usuario
-- O podemos hacer el UPDATE solo para los vendedores que SÍ existen

-- OPCIÓN 1: Actualizar solo vendedores que existen en usuario
UPDATE venta v
SET vendedor_cliente = c.nombre_vendedor,
    vendedor_documento = c.nombre_vendedor
FROM cliente c
WHERE v.identificador = c.rut
  AND c.nombre_vendedor IN (SELECT nombre FROM usuario);

-- Ver cuántos se actualizaron
SELECT 
    COUNT(*) as total_ventas,
    COUNT(vendedor_cliente) as con_vendedor,
    COUNT(*) - COUNT(vendedor_cliente) as sin_vendedor
FROM venta;

-- Ver distribución de vendedores
SELECT vendedor_cliente, COUNT(*) as num_ventas
FROM venta
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY num_ventas DESC;
