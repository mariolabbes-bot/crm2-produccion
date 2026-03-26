-- Limpieza y Homologación de RUTs al formato XXXXXXXX-X

BEGIN;

-- 1. CLIENTE
UPDATE cliente 
SET rut = s.nuevo_rut
FROM (
    SELECT rut, 
           SUBSTRING(UPPER(REGEXP_REPLACE(rut, '[^a-zA-Z0-9]', '', 'g')), 1, LENGTH(UPPER(REGEXP_REPLACE(rut, '[^a-zA-Z0-9]', '', 'g')))-1) || '-' || RIGHT(UPPER(REGEXP_REPLACE(rut, '[^a-zA-Z0-9]', '', 'g')), 1) as nuevo_rut
    FROM cliente
    WHERE rut IS NOT NULL 
    AND (rut NOT LIKE '%-%' OR rut LIKE '%.%' OR rut != UPPER(rut))
) s
WHERE cliente.rut = s.rut;

-- 2. VENTA (identificador)
UPDATE venta 
SET identificador = s.nuevo_rut
FROM (
    SELECT DISTINCT identificador, 
           SUBSTRING(UPPER(REGEXP_REPLACE(identificador, '[^a-zA-Z0-9]', '', 'g')), 1, LENGTH(UPPER(REGEXP_REPLACE(identificador, '[^a-zA-Z0-9]', '', 'g')))-1) || '-' || RIGHT(UPPER(REGEXP_REPLACE(identificador, '[^a-zA-Z0-9]', '', 'g')), 1) as nuevo_rut
    FROM venta
    WHERE identificador IS NOT NULL 
    AND (identificador NOT LIKE '%-%' OR identificador LIKE '%.%' OR identificador != UPPER(identificador))
) s
WHERE venta.identificador = s.identificador;

-- 3. ABONO (identificador)
UPDATE abono 
SET identificador = s.nuevo_rut
FROM (
    SELECT DISTINCT identificador, 
           SUBSTRING(UPPER(REGEXP_REPLACE(identificador, '[^a-zA-Z0-9]', '', 'g')), 1, LENGTH(UPPER(REGEXP_REPLACE(identificador, '[^a-zA-Z0-9]', '', 'g')))-1) || '-' || RIGHT(UPPER(REGEXP_REPLACE(identificador, '[^a-zA-Z0-9]', '', 'g')), 1) as nuevo_rut
    FROM abono
    WHERE identificador IS NOT NULL 
    AND (identificador NOT LIKE '%-%' OR identificador LIKE '%.%' OR identificador != UPPER(identificador))
) s
WHERE abono.identificador = s.identificador;

-- 4. SALDO_CREDITO
-- Aquí manejamos el caso de rut + dv separados si existen, o simplemente normalizamos el campo rut
UPDATE saldo_credito
SET rut = s.nuevo_rut
FROM (
    SELECT id, 
           SUBSTRING(UPPER(REGEXP_REPLACE(rut || COALESCE(dv, ''), '[^a-zA-Z0-9]', '', 'g')), 1, LENGTH(UPPER(REGEXP_REPLACE(rut || COALESCE(dv, ''), '[^a-zA-Z0-9]', '', 'g')))-1) || '-' || RIGHT(UPPER(REGEXP_REPLACE(rut || COALESCE(dv, ''), '[^a-zA-Z0-9]', '', 'g')), 1) as nuevo_rut
    FROM saldo_credito
    WHERE rut IS NOT NULL
    AND (rut NOT LIKE '%-%' OR rut LIKE '%.%' OR dv IS NOT NULL OR rut != UPPER(rut))
) s
WHERE saldo_credito.id = s.id;

COMMIT;
