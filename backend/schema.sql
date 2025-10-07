-- Esquema inicial para CRM2

-- Drop tables in reverse order of creation to avoid foreign key constraints
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS threats;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS goal_types;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS activity_types;
DROP TABLE IF EXISTS visits;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL -- e.g., 'vendedor', 'manager'
);

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  rut VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(255),
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  codigo_postal VARCHAR(20),
  pais VARCHAR(100),
  latitud NUMERIC(10, 7),
  longitud NUMERIC(10, 7),
  telefono VARCHAR(30),
  email VARCHAR(100),
  vendedor_id INTEGER REFERENCES users(id)
);

-- Tabla para parametrizar los tipos de actividad
CREATE TABLE activity_types (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL
);

-- Nueva tabla de actividades generalizada
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES users(id) NOT NULL,
  cliente_id INTEGER REFERENCES clients(id) NOT NULL,
  activity_type_id INTEGER REFERENCES activity_types(id) NOT NULL,
  fecha TIMESTAMP NOT NULL,
  notas TEXT, -- Comentarios iniciales
  estado VARCHAR(50) NOT NULL DEFAULT 'abierto', -- e.g., 'abierto', 'cerrado'
  
  -- Campos para el cierre de la actividad
  resultado_objetivos TEXT, -- Comentarios sobre el cumplimiento de objetivos
  tareas_seguimiento TEXT, -- Tareas a realizar post-actividad
  
  -- Foreign key to link to a follow-up activity
  siguiente_actividad_id INTEGER REFERENCES activities(id) DEFAULT NULL
);

-- Tabla para parametrizar los tipos de objetivo
CREATE TABLE goal_types (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL
);

-- Tabla de objetivos, ahora ligada a una actividad
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  goal_type_id INTEGER REFERENCES goal_types(id) NOT NULL,
  descripcion TEXT, -- Campo para detalles adicionales del objetivo
  estado VARCHAR(50) NOT NULL -- e.g., 'pendiente', 'cumplido', 'no cumplido'
);

CREATE TABLE opportunities (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clients(id),
  descripcion TEXT NOT NULL,
  probabilidad_exito NUMERIC(5,2),
  estado VARCHAR(50) NOT NULL
);

CREATE TABLE threats (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clients(id),
  descripcion TEXT NOT NULL,
  nivel VARCHAR(50)
);

CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  net_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, invoice_number)
);

-- Datos iniciales para los tipos parametrizados
INSERT INTO activity_types (nombre) VALUES ('Reunión'), ('Llamada'), ('Email'), ('Presentación'), ('Visita');
INSERT INTO goal_types (nombre) VALUES ('Venta de Producto X'), ('Renovación de Contrato'), ('Aumentar Facturación'), ('Agendar Seguimiento');
