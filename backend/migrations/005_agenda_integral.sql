-- Migración: Agenda Integral y Bloqueo de Horarios
-- Habilitar cliente_rut como opcional para actividades de oficina/personales
ALTER TABLE visitas_registro ALTER COLUMN cliente_rut DROP NOT NULL;

-- Agregar columnas para descripción y tipo de evento
ALTER TABLE visitas_registro ADD COLUMN IF NOT EXISTS titulo VARCHAR(255);
ALTER TABLE visitas_registro ADD COLUMN IF NOT EXISTS tipo_evento VARCHAR(50) DEFAULT 'ruta';

-- Agregar columnas para bloqueo de horario
ALTER TABLE visitas_registro ADD COLUMN IF NOT EXISTS hora_inicio_plan TIME;
ALTER TABLE visitas_registro ADD COLUMN IF NOT EXISTS hora_fin_plan TIME;

-- Agregar soporte para participantes (reuniones grupales)
ALTER TABLE visitas_registro ADD COLUMN IF NOT EXISTS participantes JSONB DEFAULT '[]';

-- Comentario informativo
COMMENT ON COLUMN visitas_registro.tipo_evento IS 'Valores posibles: ruta, oficina, personal, reunion';
