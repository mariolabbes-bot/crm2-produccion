-- DIAGNOSTICO: Listar tablas existentes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- DIAGNOSTICO: Verificar si existe 'users' o 'usuarios'
SELECT * FROM information_schema.tables WHERE table_name IN ('users', 'usuarios', 'vendedores');
