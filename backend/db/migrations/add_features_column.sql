-- MIGRATION: Add features column for Feature Flags (CORREGIDO)
-- Date: 2026-02-16
-- Description: Agrega columna JSONB 'features' a la tabla 'usuario' real

-- 1. Agregar columna a tabla USUARIO
ALTER TABLE usuario 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuario_features ON usuario USING gin (features);

-- 3. Ejemplo de activación
-- UPDATE usuario 
-- SET features = '{"ai_module": {"enabled": true, "plan": "pro"}}'
-- WHERE email = 'tu_email@ejemplo.com';
