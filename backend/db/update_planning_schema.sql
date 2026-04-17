
-- Migración para añadir soporte a Objetivos y Comentarios de Planificación
BEGIN;

-- 1. Crear tabla Goal Types si no existe
CREATE TABLE IF NOT EXISTS goal_types (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL
);

-- 2. Asegurar columnas en visitas_registro
ALTER TABLE visitas_registro 
ADD COLUMN IF NOT EXISTS goal_type_id INTEGER REFERENCES goal_types(id),
ADD COLUMN IF NOT EXISTS comentario_plan TEXT;

-- 3. Poblar Activity Types (Acciones)
INSERT INTO activity_types (nombre)
VALUES ('Visita'), ('Llamado telefónico'), ('Mensaje')
ON CONFLICT (nombre) DO NOTHING;

-- 4. Poblar Goal Types (Objetivos)
INSERT INTO goal_types (nombre)
VALUES ('Cotización'), ('Cobranza'), ('Entrega'), ('Entrega de información'), ('Otro')
ON CONFLICT (nombre) DO NOTHING;

COMMIT;
