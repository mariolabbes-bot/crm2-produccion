-- MIGRATION: Add features column for Feature Flags
-- Date: 2026-02-16
-- Description: Agrega columna JSONB 'features' para controlar activación de módulos (IA, etc.)

-- 1. Agregar columna a tabla USERS (para permisos de staff/vendedores)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- 2. Agregar columna a tabla CLIENTS (si se requiere activar features por cliente final en el futuro)
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- 3. Crear índice para búsquedas rápidas si escalamos
CREATE INDEX IF NOT EXISTS idx_users_features ON users USING gin (features);

-- 4. Ejemplo de activación para un usuario (comentado)
-- UPDATE users 
-- SET features = jsonb_set(features, '{ai_module}', '{"enabled": true, "plan": "pro"}', true)
-- WHERE email = 'vendedor@ejemplo.com';
