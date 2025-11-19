-- Desactivar Foreign Key de identificador en abono
-- Esto permite cargar abonos con clientes que no están en la tabla cliente

ALTER TABLE abono DROP CONSTRAINT IF EXISTS abono_identificador_fkey;

-- Verificar
SELECT COUNT(*) as abonos_actuales FROM abono;
