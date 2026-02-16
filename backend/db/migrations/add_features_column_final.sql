-- MIGRATION: Add features column to USUARIO table
-- Date: 2026-02-16
-- Description: Agrega columna JSONB 'features' a la tabla 'usuario' (singular) para controlar módulos.

DO $$ 
BEGIN 
    -- 1. Agregar columna a tabla USUARIO si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuario' AND column_name='features') THEN
        ALTER TABLE usuario ADD COLUMN features JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- 2. Crear índice GIN para búsquedas eficientes en JSONB
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usuario_features') THEN
        CREATE INDEX idx_usuario_features ON usuario USING gin (features);
    END IF;
END $$;
