-- Script de carga de USUARIOS
-- Ejecuta este script en el editor SQL de Neon

INSERT INTO usuario (rut, nombre_completo, cargo, nombre_vendedor, local, direccion, comuna, telefono, correo, rol_usuario, password) VALUES
('7.775.897-6', 'JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA', 'VENDEDOR', 'JOAQUIN', 'ANTILLANCA', 'ANTILLANCA 565', 'PUDAHUEL', '985497963', 'joaquin.mariquez@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR123'),
('14.138.537-2', 'Matias Felipe Felipe Tapia Valenzuela', 'VENDEDOR', 'MATIAS FELIPE', 'ANTILLANCA', 'ANTILLANCA 565', 'PUDAHUEL', '976186957', 'matias.tapia@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR124'),
('16.082.310-0', 'Nataly Andrea Carrasco Rojas', 'SOPORTE DE VENTAS', 'NATALY', 'ANTILLANCA', 'ANTILLANCA 565', 'PUDAHUEL', '968452271', 'ventas.pudahuel@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR125'),
('13.018.313-1', 'Maiko Ricardo Flores Maldonado', 'JEFE DE SUCURSAL', 'MAIKO', 'GERONIMO MENDEZ', 'GERONIMO MENDEZ 1700, BARRIO INDUSTRIAL', 'COQUIMBO', '968399992', 'lubricar.matriz@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR126'),
('11.599.857-9', 'Alex Mauricio Mondaca Cortes', 'VENDEDOR', 'ALEX', 'GERONIMO MENDEZ', 'GERONIMO MENDEZ 1700, BARRIO INDUSTRIAL', 'COQUIMBO', '985487589', 'alex.mondaca@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR127'),
('12.168.148-K', 'Mario Andres Labbe Silva', 'GERENTE COMERCIAL', NULL, NULL, NULL, NULL, '985058752', 'mario.labbe@lubricar-insa.cl', 'MANAGER', 'MANAGER123'),
('09.338.644-2', 'Nelson Antonio Muñoz Cortes', 'VENDEDOR', 'NELSON', 'GERONIMO MENDEZ', 'GERONIMO MENDEZ 1700, BARRIO INDUSTRIAL', 'COQUIMBO', '985487586', 'nelson.munoz@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR129'),
('10.913.019-2', 'Omar Antonio Maldonado Castillo', 'VENDEDOR', 'OMAR', 'GERONIMO MENDEZ', 'GERONIMO MENDEZ 1700, BARRIO INDUSTRIAL', 'COQUIMBO', '985487590', 'omar.maldonado@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR130'),
('12.570.853-6', 'Milton Marin Blanco', 'GERENTE', 'MILTON', 'ANTILLANCA', 'ANTILLANCA 565', NULL, '992993150', 'milton.marin@lubricar-insa.cl', 'MANAGER', 'MANAGER123'),
('16.412.525-4', 'Marcelo Hernan Troncoso Molina', 'VENDEDOR', 'MARCELO', 'GERONIMO MENDEZ', 'GERONIMO MENDEZ 1700, BARRIO INDUSTRIAL', 'COQUIMBO', '968783531', 'marcelo.troncoso@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR132'),
('12.569.531-0', 'Emilio Alberto Santos Castillo', 'JEFE DE SUCURSAL', 'EMILIO', 'OVALLE', 'ARISTIA ORIENTE 911', 'OVALLE', '985487592', 'emilio.santos@lubricar-insa.cl', 'MANAGER', 'MANAGER123'),
('13.087.134-8', 'Marisol De Lourdes Sanchez Roitman', 'JEFE DE SUCURSAL', 'MARISOL', 'ROJAS MAGALLANES', 'ROJAS MAGALLANES 1853', 'LA FLORIDA', '942795951', 'ventas.laflorida@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR134'),
('05.715.101-3', 'Jorge Heriberto Gutierrez Silva', 'VENDEDOR', 'JORGE', 'ROJAS MAGALLANES', 'ROJAS MAGALLANES 1853', 'LA FLORIDA', '940024029', 'jorge.gutierrez@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR135'),
('07.107.100-6', 'Roberto Otilio Oyarzun Alvarez', 'VENDEDOR', 'ROBERTO', 'ROJAS MAGALLANES', 'ROJAS MAGALLANES 1853', 'LA FLORIDA', '968783530', 'roberto.oyarzun@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR136'),
('12.051.321-4', 'Victoria Andrea Hurtado Olivares', 'VENDEDOR', 'VICTORIA', 'ROJAS MAGALLANES', 'ROJAS MAGALLANES 1853', 'LA FLORIDA', '973151078', 'victoria.hurtado@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR137'),
('09.262.987-2', 'Eduardo Enrique Ponce Castillo', 'JEFE DE SUCURSAL', 'EDUARDO', 'TIERRAS BLANCAS', 'LINARES 890, TIERRAS BLANCAS', 'COQUIMBO', '976200163', 'lubricar.tb@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR138'),
('13.830.417-5', 'Eduardo Rojas Andres Rojas Del Campo', 'VENDEDOR', 'EDUARDO ROJAS', 'ROJAS MAGALLANES', 'ROJAS MAGALLANES 1853', 'LA FLORIDA', '973793597', 'eduardo.rojas@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR139'),
('12.425.152-4', 'Luis Alberto Marin Blanco', 'GERENTE GENERAL', NULL, NULL, NULL, NULL, '993456570', 'luis.marin@lubricar-insa.cl', 'MANAGER', 'MANAGER123'),
('11.823.790-0', 'Luis Ramon Esquivel Oyamadel', 'SOPORTE DE VENTAS', 'LUIS', 'GERONIMO MENDEZ', 'GERONIMO MENDEZ 1700, BARRIO INDUSTRIAL', 'COQUIMBO', '968399992', 'soporteventas.norte@lubricar-insa.cl', 'VENDEDOR', 'VENDEDOR141');

-- Verifica la carga
SELECT COUNT(*) as total_usuarios FROM usuario;
