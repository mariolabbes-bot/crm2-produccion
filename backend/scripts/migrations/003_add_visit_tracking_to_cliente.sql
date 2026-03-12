-- Migración: Agregar seguimiento de visitas a la tabla cliente
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS fecha_ultima_visita DATE;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS frecuencia_visita INTEGER DEFAULT 30;

-- Comentario para documentación
COMMENT ON COLUMN cliente.fecha_ultima_visita IS 'Fecha del último check-out exitoso de visita';
COMMENT ON COLUMN cliente.frecuencia_visita IS 'Frecuencia sugerida de visita en días';
