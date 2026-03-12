-- Migración: Mejora del Flujo de Trabajo (Vendedor)
-- Implementa tipos de actividad adicionales y mejora de registro de visitas

-- 1. Asegurar que existe la tabla de tipos de actividad (ya debería existir pero por seguridad)
CREATE TABLE IF NOT EXISTS activity_types (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insertar los nuevos tipos de actividad si no existen
INSERT INTO activity_types (nombre, descripcion, icon)
VALUES 
    ('VISITA', 'Visita presencial a local de cliente', 'directions_walk'),
    ('LLAMADA', 'Contacto telefónico comercial', 'phone'),
    ('COTIZACION', 'Generación o revisión de cotización', 'request_quote'),
    ('MENSAJE', 'Contacto vía WhatsApp o Mensajería', 'message')
ON CONFLICT (nombre) DO UPDATE SET 
    descripcion = EXCLUDED.descripcion,
    icon = EXCLUDED.icon;

-- 3. Mejorar la tabla visitas_registro para soportar el flujo persistente
-- Verificar si ya existen las columnas necesarias, si no, agregarlas
DO $$ 
BEGIN 
    -- Agregar columna de comentarios/notas si no existe (ya debería estar pero aseguramos)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='notas') THEN
        ALTER TABLE visitas_registro ADD COLUMN notas TEXT;
    END IF;

    -- Agregar columna de tipo de actividad si queremos relacionalidad
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='activity_type_id') THEN
        ALTER TABLE visitas_registro ADD COLUMN activity_type_id INTEGER REFERENCES activity_types(id);
    END IF;
END $$;

-- 4. Actualizar las visitas existentes de tipo presencial con el ID correcto
UPDATE visitas_registro 
SET activity_type_id = (SELECT id FROM activity_types WHERE nombre = 'VISITA')
WHERE activity_type_id IS NULL;

-- 5. Asegurar que cliente_actividad tenga referencia al tipo de actividad
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cliente_actividad' AND column_name='activity_type_id') THEN
        ALTER TABLE cliente_actividad ADD COLUMN activity_type_id INTEGER REFERENCES activity_types(id);
    END IF;
END $$;
