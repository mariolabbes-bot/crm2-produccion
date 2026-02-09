
-- Script para estandarizar nombres de vendedores segun archivo CLIENTES_19-01-2026.xlsx
-- Mantiene el alias corto para compatibilidad con archivos antiguos.

BEGIN;

-- 1. Eduardo
UPDATE usuario SET nombre_vendedor = 'Eduardo Enrique Ponce Castillo' WHERE nombre_vendedor = 'Eduardo';

-- 2. Luis
UPDATE usuario SET nombre_vendedor = 'Luis Ramon Esquivel Oyamadel' WHERE nombre_vendedor = 'Luis' OR nombre_vendedor = 'luis';

-- 3. Marisol
UPDATE usuario SET nombre_vendedor = 'Marisol De Lourdes Sanchez Roitman' WHERE nombre_vendedor = 'Marisol';

-- 4. Maiko
UPDATE usuario SET nombre_vendedor = 'Maiko Ricardo Flores Maldonado' WHERE nombre_vendedor = 'Maiko';

-- 5. Nataly
UPDATE usuario SET nombre_vendedor = 'Nataly Andrea Carrasco Rojas' WHERE nombre_vendedor = 'Nataly';

-- 6. Emilio
UPDATE usuario SET nombre_vendedor = 'Emilio Alberto Santos Castillo' WHERE nombre_vendedor = 'Emilio';

-- 7. Omar
UPDATE usuario SET nombre_vendedor = 'Omar Antonio Maldonado Castillo' WHERE nombre_vendedor = 'Omar';

-- 8. Alex
UPDATE usuario SET nombre_vendedor = 'Alex Mauricio Mondaca Cortes' WHERE nombre_vendedor = 'Alex';

-- 9. Nelson
UPDATE usuario SET nombre_vendedor = 'Nelson Antonio Muñoz Cortes' WHERE nombre_vendedor = 'Nelson';

-- 10. Matias Felipe
UPDATE usuario SET nombre_vendedor = 'Matias Felipe Felipe Tapia Valenzuela' WHERE nombre_vendedor = 'Matias Felipe';

-- 11. Eduardo Rojas
UPDATE usuario SET nombre_vendedor = 'Eduardo Rojas Andres Rojas Del Campo' WHERE nombre_vendedor = 'Eduardo Rojas';

-- 12. Roberto
UPDATE usuario SET nombre_vendedor = 'Roberto Otilio Oyarzun Alvarez' WHERE nombre_vendedor = 'Roberto';

COMMIT;
