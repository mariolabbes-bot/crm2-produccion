SELECT nombre_vendedor, nombre_completo, rut 
FROM usuario 
WHERE nombre_vendedor ILIKE '%luis%' OR nombre_vendedor ILIKE '%joaquin%' OR nombre_vendedor ILIKE '%joaquín%'
ORDER BY nombre_vendedor;
