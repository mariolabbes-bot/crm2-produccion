-- ========================================
-- SCRIPT SQL PARA SUPABASE - CRM2
-- ========================================
-- Copia y pega este script en Supabase SQL Editor
-- ========================================

-- Drop tables in reverse order of creation to avoid foreign key constraints
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS threats CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS goal_types CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS activity_types CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ========================================
-- CREAR TABLAS
-- ========================================

-- Tabla de usuarios
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('vendedor', 'manager')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de clientes
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  rut VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(255),
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  codigo_postal VARCHAR(20),
  pais VARCHAR(100) DEFAULT 'Chile',
  latitud NUMERIC(10, 7),
  longitud NUMERIC(10, 7),
  telefono VARCHAR(30),
  email VARCHAR(100),
  vendedor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tipos de actividad (parametrizable)
CREATE TABLE activity_types (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Actividades
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES users(id) NOT NULL,
  cliente_id INTEGER REFERENCES clients(id) NOT NULL,
  activity_type_id INTEGER REFERENCES activity_types(id) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  descripcion TEXT,
  resultado TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tipos de objetivos (parametrizable)
CREATE TABLE goal_types (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Objetivos
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES users(id) NOT NULL,
  cliente_id INTEGER REFERENCES clients(id),
  activity_id INTEGER REFERENCES activities(id),
  goal_type_id INTEGER REFERENCES goal_types(id) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_limite DATE,
  estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'cancelado')),
  valor_objetivo NUMERIC(15, 2),
  valor_alcanzado NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Oportunidades
CREATE TABLE opportunities (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clients(id) NOT NULL,
  usuario_id INTEGER REFERENCES users(id) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  valor_estimado NUMERIC(15, 2),
  probabilidad_exito INTEGER CHECK (probabilidad_exito >= 0 AND probabilidad_exito <= 100),
  fecha_cierre_estimada DATE,
  estado VARCHAR(50) DEFAULT 'abierta' CHECK (estado IN ('abierta', 'ganada', 'perdida', 'en_negociacion')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Amenazas
CREATE TABLE threats (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clients(id) NOT NULL,
  usuario_id INTEGER REFERENCES users(id) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  impacto_estimado NUMERIC(15, 2),
  probabilidad_ocurrencia INTEGER CHECK (probabilidad_ocurrencia >= 0 AND probabilidad_ocurrencia <= 100),
  fecha_evaluacion DATE DEFAULT CURRENT_DATE,
  estado VARCHAR(50) DEFAULT 'activa' CHECK (estado IN ('activa', 'mitigada', 'materializada', 'descartada')),
  plan_mitigacion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ventas
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clients(id),
  usuario_id INTEGER REFERENCES users(id),
  fecha DATE NOT NULL,
  producto VARCHAR(200),
  cantidad INTEGER DEFAULT 1,
  precio_unitario NUMERIC(15, 2),
  total NUMERIC(15, 2) NOT NULL,
  metodo_pago VARCHAR(100),
  estado VARCHAR(50) DEFAULT 'completada' CHECK (estado IN ('pendiente', 'completada', 'cancelada', 'reembolsada')),
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla legacy para compatibilidad (deprecated)
CREATE TABLE visits (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clients(id) NOT NULL,
  usuario_id INTEGER REFERENCES users(id) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  resultado TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INSERTAR DATOS INICIALES
-- ========================================

-- Tipos de actividad predefinidos
INSERT INTO activity_types (nombre, descripcion) VALUES
('Visita Comercial', 'Reunión presencial con cliente'),
('Llamada Telefónica', 'Contacto telefónico'),
('Email', 'Comunicación por correo electrónico'),
('Reunión Virtual', 'Videoconferencia o reunión online'),
('Presentación', 'Presentación de productos o servicios'),
('Seguimiento', 'Actividad de seguimiento post-venta'),
('Prospección', 'Búsqueda de nuevos clientes potenciales');

-- Tipos de objetivos predefinidos
INSERT INTO goal_types (nombre, descripcion) VALUES
('Ventas Mensuales', 'Objetivo de ventas para el mes'),
('Nuevos Clientes', 'Meta de captación de clientes'),
('Retención', 'Objetivo de retención de clientes'),
('Upselling', 'Meta de venta cruzada o ampliación'),
('Reuniones', 'Cantidad de reuniones objetivo'),
('Llamadas', 'Número de llamadas objetivo'),
('Propuestas', 'Cantidad de propuestas a entregar');

-- Usuario administrador por defecto
INSERT INTO users (nombre, email, password, rol) VALUES
('Administrador', 'admin@crm2.com', '$2b$10$D.ayFteHr57zk5qnxnB.sutiyhFXp5AO8rEVBYMKdxM8isw4vjJe6', 'manager');

-- ========================================
-- CREAR ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índices en foreign keys
CREATE INDEX idx_clients_vendedor ON clients(vendedor_id);
CREATE INDEX idx_activities_usuario ON activities(usuario_id);
CREATE INDEX idx_activities_cliente ON activities(cliente_id);
CREATE INDEX idx_activities_fecha ON activities(fecha);
CREATE INDEX idx_goals_usuario ON goals(usuario_id);
CREATE INDEX idx_goals_cliente ON goals(cliente_id);
CREATE INDEX idx_sales_cliente ON sales(cliente_id);
CREATE INDEX idx_sales_usuario ON sales(usuario_id);
CREATE INDEX idx_sales_fecha ON sales(fecha);

-- Índices en campos de búsqueda frecuente
CREATE INDEX idx_clients_rut ON clients(rut);
CREATE INDEX idx_clients_nombre ON clients(nombre);
CREATE INDEX idx_users_email ON users(email);

-- ========================================
-- CONFIGURAR RLS (ROW LEVEL SECURITY)
-- ========================================
-- Opcional: Descomentar si quieres seguridad a nivel de fila

-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- ========================================
-- FINALIZADO
-- ========================================
-- Script ejecutado exitosamente
-- Tu base de datos CRM2 está lista en Supabase!