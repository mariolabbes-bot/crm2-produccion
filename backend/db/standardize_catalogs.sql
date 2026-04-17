
-- Estandarización de Catálogos de Acciones (Tareas) y Objetivos
BEGIN;

-- 1. Desvincular registros actuales para evitar errores de integridad
UPDATE visitas_registro SET activity_type_id = NULL, goal_type_id = NULL;

-- 2. Limpiar catálogos
TRUNCATE TABLE activity_types CASCADE;
TRUNCATE TABLE goal_types CASCADE;

-- 3. Insertar Actividades (Acciones) estandarizadas
-- Usamos IDs específicos para mayor control si fuera necesario
INSERT INTO activity_types (nombre) VALUES 
('Visita'), 
('Llamada'), 
('Contacto');

-- 4. Insertar Objetivos estandarizados
INSERT INTO goal_types (nombre) VALUES 
('Cotización'), 
('Cobranza'), 
('Entrega'), 
('Entrega de información'), 
('Otro');

COMMIT;
