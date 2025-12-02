-- Script para insertar alias de vendedores
-- Mapeo de nombres en Saldo Crédito a nombres oficiales en tabla usuario

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS usuario_alias (
  id SERIAL PRIMARY KEY,
  alias VARCHAR(255) NOT NULL,
  nombre_vendedor_oficial VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Limpiar aliases existentes (opcional - comentar si quieres mantener datos previos)
TRUNCATE TABLE usuario_alias;

-- Insertar mapeos de nombres
INSERT INTO usuario_alias (alias, nombre_vendedor_oficial) VALUES
('Alex Mondaca', 'Alex Mauricio Mondaca Cortes'),
('Eduardo Ponce', 'Eduardo Enrique Ponce Castillo'),
('Eduardo Rojas Rojas', 'Eduardo Rojas Andres Rojas Del Campo'),
('Emilio Santos', 'Emilio Alberto Santos Castillo'),
('JOAQUIN MANRIQUEZ', 'JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA'),
('Jorge Gutierrez', 'Jorge Heriberto Gutierrez Silva'),
('Luis Esquivel', 'Luis Ramon Esquivel Oyamadel'),
('Maiko Flores', 'Maiko Ricardo Flores Maldonado'),
('Marcelo Troncoso', 'Marcelo Hernan Troncoso Molina'),
('Marisol Sanchez', 'Marisol De Lourdes Sanchez Roitman'),
('Matias Felipe Tapia', 'Matias Felipe Felipe Tapia Valenzuela'),
('Milton Marin', 'Milton Marin Blanco'),
('Nataly Carrasco', 'Nataly Andrea Carrasco Rojas'),
('Nelson Muñoz', 'Nelson Antonio Muñoz Cortes'),
('Nelson Mu√±oz', 'Nelson Antonio Muñoz Cortes'),
('Omar Maldonado', 'Omar Antonio Maldonado Castillo'),
('Roberto Oyarzun', 'Roberto Otilio Oyarzun Alvarez'),
('Victoria Hurtado', 'Victoria Andrea Hurtado Olivares');

-- Verificar aliases insertados
SELECT * FROM usuario_alias ORDER BY alias;
