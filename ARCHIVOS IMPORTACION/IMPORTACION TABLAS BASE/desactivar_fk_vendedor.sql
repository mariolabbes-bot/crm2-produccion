-- Desactivar FK de vendedor_cliente para permitir asignación
-- Algunos vendedores en cliente no existen en usuario

-- VENTAS
ALTER TABLE venta DROP CONSTRAINT IF EXISTS venta_vendedor_cliente_fkey;

-- ABONOS
ALTER TABLE abono DROP CONSTRAINT IF EXISTS abono_vendedor_cliente_fkey;

-- Verificar
SELECT 'FK de vendedor desactivadas' as status;
