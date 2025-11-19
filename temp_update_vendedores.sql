-- Actualizar Alejandra → Luis Ramon Esquivel Oyamadel
UPDATE abono 
SET vendedor_cliente = 'Luis Ramon Esquivel Oyamadel'
WHERE vendedor_cliente = 'Alejandra';

-- Actualizar Octavio → JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA  
UPDATE abono 
SET vendedor_cliente = 'JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA'
WHERE vendedor_cliente = 'Octavio';

-- Verificar
SELECT vendedor_cliente, COUNT(*) 
FROM abono 
WHERE vendedor_cliente IN ('Alejandra', 'Octavio', 'Luis Ramon Esquivel Oyamadel', 'JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA')
GROUP BY vendedor_cliente;
