-- ASIGNACIÓN DE VENDEDORES POR RUT
-- Paso 1: Desactivar FK temporal
-- Paso 2: Asignar vendedores
-- Paso 3: Verificar resultados

-- PASO 1: Desactivar Foreign Keys temporalmente
ALTER TABLE venta DROP CONSTRAINT IF EXISTS venta_vendedor_cliente_fkey;
ALTER TABLE abono DROP CONSTRAINT IF EXISTS abono_vendedor_cliente_fkey;

-- PASO 2: Asignar vendedores a VENTAS desde tabla cliente
UPDATE venta v
SET vendedor_cliente = c.nombre_vendedor
FROM cliente c
WHERE v.identificador = c.rut;

-- PASO 3: Asignar vendedores a ABONOS desde tabla cliente
UPDATE abono a
SET vendedor_cliente = c.nombre_vendedor
FROM cliente c
WHERE a.identificador = c.rut;

-- PASO 4: Verificación de resultados
SELECT 
    'VENTAS' as tabla,
    COUNT(*) as total_registros,
    COUNT(vendedor_cliente) as con_vendedor,
    COUNT(*) - COUNT(vendedor_cliente) as sin_vendedor,
    ROUND(COUNT(vendedor_cliente) * 100.0 / COUNT(*), 2) as porcentaje_asignado
FROM venta

UNION ALL

SELECT 
    'ABONOS' as tabla,
    COUNT(*) as total_registros,
    COUNT(vendedor_cliente) as con_vendedor,
    COUNT(*) - COUNT(vendedor_cliente) as sin_vendedor,
    ROUND(COUNT(vendedor_cliente) * 100.0 / COUNT(*), 2) as porcentaje_asignado
FROM abono;

-- PASO 5: Ver distribución por vendedor en VENTAS
SELECT 
    vendedor_cliente,
    COUNT(*) as num_ventas,
    SUM(valor_total) as total_ventas
FROM venta
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY num_ventas DESC;

-- PASO 6: Ver distribución por vendedor en ABONOS
SELECT 
    vendedor_cliente,
    COUNT(*) as num_abonos,
    SUM(monto) as total_abonos
FROM abono
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY num_abonos DESC;
