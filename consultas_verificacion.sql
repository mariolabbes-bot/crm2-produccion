-- CONSULTAS DE VERIFICACIÓN PARA CONFIGURAR nombre_vendedor
-- Ejecutar estas consultas en Neon PostgreSQL para entender los datos

-- =====================================================
-- 1. VER USUARIOS ACTUALES (vendedores)
-- =====================================================
SELECT 
  rut,
  nombre_completo,
  nombre_vendedor,
  alias,
  correo,
  rol_usuario
FROM usuario
WHERE rol_usuario = 'VENDEDOR'
ORDER BY nombre_completo;

-- =====================================================
-- 2. VER QUÉ NOMBRES HAY EN LAS VENTAS
-- =====================================================
SELECT 
  vendedor_cliente,
  COUNT(*) as cantidad_ventas,
  SUM(valor_total) as monto_total,
  MIN(fecha_emision) as primera_venta,
  MAX(fecha_emision) as ultima_venta
FROM venta
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY cantidad_ventas DESC;

-- =====================================================
-- 3. VER QUÉ NOMBRES HAY EN LOS ABONOS
-- =====================================================
SELECT 
  vendedor_cliente,
  COUNT(*) as cantidad_abonos,
  SUM(monto) as monto_total,
  MIN(fecha) as primer_abono,
  MAX(fecha) as ultimo_abono
FROM abono
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY cantidad_abonos DESC;

-- =====================================================
-- 4. VENTAS TOTALES DEL MES ACTUAL (Nov 2025)
-- =====================================================
SELECT 
  COUNT(*) as ventas_nov_2025,
  SUM(valor_total) as total_monto,
  COUNT(DISTINCT vendedor_cliente) as vendedores_distintos
FROM venta
WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = '2025-11';

-- =====================================================
-- 5. ABONOS TOTALES DEL MES ACTUAL (Nov 2025)
-- =====================================================
SELECT 
  COUNT(*) as abonos_nov_2025,
  SUM(monto) as total_monto,
  COUNT(DISTINCT vendedor_cliente) as vendedores_distintos
FROM abono
WHERE TO_CHAR(fecha, 'YYYY-MM') = '2025-11';

-- =====================================================
-- 6. MUESTRA DE VENTAS RECIENTES
-- =====================================================
SELECT 
  fecha_emision,
  vendedor_cliente,
  vendedor_documento,
  cliente,
  valor_total
FROM venta
WHERE fecha_emision >= '2025-11-01'
ORDER BY fecha_emision DESC
LIMIT 20;

-- =====================================================
-- RESULTADOS ESPERADOS:
-- =====================================================
-- Consulta 1: Mostrará los 15 vendedores con nombre_vendedor NULL
-- Consulta 2: Mostrará los nombres que aparecen en ventas (si hay)
-- Consulta 3: Mostrará los nombres que aparecen en abonos (si hay)
-- 
-- Con estos resultados podremos hacer el MATCH entre usuarios y datos
