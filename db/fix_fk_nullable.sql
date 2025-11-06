-- Hacer las FKs opcionales en venta y abono para permitir importación sin bloqueos

-- 1. Venta: hacer identificador, vendedor_cliente y sku opcionales (permitir NULL)
ALTER TABLE venta ALTER COLUMN identificador DROP NOT NULL;
ALTER TABLE venta ALTER COLUMN vendedor_cliente DROP NOT NULL;
ALTER TABLE venta ALTER COLUMN sku DROP NOT NULL;

-- 2. Abono: hacer identificador y vendedor_cliente opcionales
ALTER TABLE abono ALTER COLUMN identificador DROP NOT NULL;
ALTER TABLE abono ALTER COLUMN vendedor_cliente DROP NOT NULL;

-- Nota: Las columnas ya permiten NULL por defecto si no se especificó NOT NULL en CREATE TABLE
-- Estas sentencias son por si acaso se agregó NOT NULL manualmente
