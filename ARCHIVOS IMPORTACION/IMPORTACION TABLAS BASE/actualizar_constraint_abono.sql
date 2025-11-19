-- Script de actualización de constraint UNIQUE en tabla ABONOS
-- Cambia de UNIQUE(folio) a UNIQUE(folio, identificador_abono, fecha)

-- Primero eliminar el constraint anterior si existe
ALTER TABLE abono DROP CONSTRAINT IF EXISTS abono_folio_key;

-- Agregar el nuevo constraint compuesto
-- Usa identificador_abono que es el campo del CSV "Identificador"
ALTER TABLE abono ADD CONSTRAINT abono_unique_key UNIQUE (folio, identificador_abono, fecha);

-- Verificar
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'abono'::regclass 
AND contype = 'u';
