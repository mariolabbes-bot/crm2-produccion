-- ========================================
-- MIGRACIÓN COMPLETA: ALINEACIÓN SCHEMA Y GEOCODING
-- ========================================

BEGIN;

-- 1. Asegurar que tabla usuario tenga 'id' serial
-- Primero verificamos si ya existe para evitar errores
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuario' AND column_name='id') THEN
        ALTER TABLE usuario ADD COLUMN id SERIAL;
        -- Si queremos hacerlo PK, debemos asegurar que no haya otra o droppearla
        -- Por ahora solo lo agregamos como identificador numérico único
        ALTER TABLE usuario ADD CONSTRAINT usuario_id_unique UNIQUE (id);
    END IF;
END $$;

-- 2. Actualizar tabla cliente con todas las columnas necesarias
ALTER TABLE cliente 
ADD COLUMN IF NOT EXISTS id SERIAL,
ADD COLUMN IF NOT EXISTS vendedor_id INTEGER,
ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitud NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS last_visit_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS next_scheduled_visit TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Vincular vendedor_id en cliente basado en nombre_vendedor
-- Esto intenta poblar la nueva columna usando los datos actuales
UPDATE cliente c
SET vendedor_id = u.id
FROM usuario u
WHERE (UPPER(TRIM(c.nombre_vendedor)) = UPPER(TRIM(u.nombre_vendedor))
   OR UPPER(TRIM(c.nombre_vendedor)) = UPPER(TRIM(u.alias)))
AND c.vendedor_id IS NULL;

-- 4. Crear tabla para Planes de Visita (Itinerarios)
CREATE TABLE IF NOT EXISTS visit_plans (
  id SERIAL PRIMARY KEY,
  vendedor_id INTEGER REFERENCES usuario(id) ON DELETE CASCADE,
  fecha DATE DEFAULT CURRENT_DATE,
  clientes_json JSONB, -- Estructura: [{id: 1, status: 'pending'}, {id: 2, status: 'visited'}]
  notas TEXT,
  estado VARCHAR(50) DEFAULT 'active' CHECK (estado IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_cliente_vendedor_id ON cliente(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_cliente_lat_long ON cliente(latitud, longitud);
CREATE INDEX IF NOT EXISTS idx_visit_plans_vendedor_fecha ON visit_plans(vendedor_id, fecha);

-- 6. Trigger para updated_at en visit_plans
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_visit_plans_updated_at ON visit_plans;
CREATE TRIGGER update_visit_plans_updated_at
BEFORE UPDATE ON visit_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
