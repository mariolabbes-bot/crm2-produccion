-- Script para agregar vendedores faltantes en la tabla USUARIO
-- Estos vendedores aparecen en VENTAS/ABONOS pero no están en la tabla usuario

-- Vendedores que aparecen en los CSVs pero no están registrados
INSERT INTO usuario (rut, nombre_completo, cargo, nombre_vendedor, local, correo, rol_usuario, password) VALUES
('99.999.991-1', 'Alejandra (Vendedor por identificar)', 'VENDEDOR', 'ALEJANDRA', NULL, 'alejandra@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR999'),
('99.999.992-2', 'Alejandro (Vendedor por identificar)', 'VENDEDOR', 'ALEJANDRO', NULL, 'alejandro@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR999'),
('99.999.993-3', 'Matias Ignacio (Vendedor por identificar)', 'VENDEDOR', 'MATIAS IGNACIO', NULL, 'matias.ignacio@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR999'),
('99.999.994-4', 'Octavio (Vendedor por identificar)', 'VENDEDOR', 'OCTAVIO', NULL, 'octavio@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR999');

-- Verificar
SELECT nombre_vendedor, nombre_completo, cargo FROM usuario WHERE rut LIKE '99.999%' ORDER BY nombre_vendedor;
