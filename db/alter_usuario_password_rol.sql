-- Agrega campos de autenticación a la tabla usuario
ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS rol VARCHAR(50) NOT NULL DEFAULT 'vendedor';

-- El email será el nombre de usuario para login
-- El campo rol puede ser 'vendedor' o 'manager'
