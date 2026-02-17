-- DIAGNOSTICO: Ver columnas de tabla usuario
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuario';
