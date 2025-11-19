-- Script de creación de tablas base CRM2
-- Mejores prácticas: claves primarias, foráneas, índices, tipos de datos, integridad referencial

-- 1. USUARIOS
CREATE TABLE usuario (
  id SERIAL PRIMARY KEY,
  rut VARCHAR(20) UNIQUE NOT NULL,
  nombre_completo VARCHAR(100) NOT NULL,
  cargo VARCHAR(50),
  nombre_vendedor VARCHAR(100) UNIQUE,
  local VARCHAR(100),
  direccion VARCHAR(255),
  comuna VARCHAR(100),
  telefono VARCHAR(30),
  correo VARCHAR(100) UNIQUE,
  rol_usuario VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL
);
CREATE INDEX idx_usuario_rol ON usuario(rol_usuario);
CREATE INDEX idx_usuario_vendedor ON usuario(nombre_vendedor);

-- 2. PRODUCTOS
CREATE TABLE producto (
  sku VARCHAR(50) PRIMARY KEY,
  descripcion VARCHAR(255) NOT NULL,
  familia VARCHAR(100),
  subfamilia VARCHAR(100),
  marca VARCHAR(100),
  litros_por_unidad NUMERIC(10,2),
  unidad_medida VARCHAR(20),
  activo BOOLEAN DEFAULT true
);
CREATE INDEX idx_producto_familia ON producto(familia);
CREATE INDEX idx_producto_marca ON producto(marca);

-- 3. CLIENTES
CREATE TABLE cliente (
  rut VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  telefono_principal VARCHAR(30),
  sucursal VARCHAR(100),
  categoria VARCHAR(50),
  subcategoria VARCHAR(50),
  comuna VARCHAR(100),
  ciudad VARCHAR(100),
  direccion VARCHAR(255),
  numero VARCHAR(20),
  nombre_vendedor VARCHAR(100)
);
CREATE INDEX idx_cliente_categoria ON cliente(categoria);
CREATE INDEX idx_cliente_vendedor ON cliente(nombre_vendedor);

-- 4. VENTAS
CREATE TABLE venta (
  id SERIAL PRIMARY KEY,
  sucursal VARCHAR(100),
  tipo_documento VARCHAR(50),
  folio VARCHAR(50) NOT NULL,
  fecha_emision DATE,
  identificador VARCHAR(20) REFERENCES cliente(rut),
  cliente VARCHAR(100),
  vendedor_cliente VARCHAR(100) REFERENCES usuario(nombre_vendedor),
  vendedor_documento VARCHAR(100) REFERENCES usuario(nombre_vendedor),
  estado_sistema VARCHAR(50),
  estado_comercial VARCHAR(50),
  estado_sii VARCHAR(50),
  indice VARCHAR(20),
  sku VARCHAR(50) REFERENCES producto(sku),
  descripcion VARCHAR(255),
  cantidad NUMERIC(10,2),
  precio NUMERIC(12,2),
  valor_total NUMERIC(12,2),
  litros_vendidos NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tipo_documento, folio, indice)
);
CREATE INDEX idx_venta_fecha ON venta(fecha_emision);
CREATE INDEX idx_venta_cliente ON venta(identificador);
CREATE INDEX idx_venta_vendedor ON venta(vendedor_cliente);
CREATE INDEX idx_venta_sku ON venta(sku);

-- 5. ABONOS
CREATE TABLE abono (
  id SERIAL PRIMARY KEY,
  sucursal VARCHAR(100),
  folio VARCHAR(50) NOT NULL UNIQUE,
  fecha DATE,
  identificador VARCHAR(20) REFERENCES cliente(rut),
  cliente VARCHAR(100),
  vendedor_cliente VARCHAR(100) REFERENCES usuario(nombre_vendedor),
  caja_operacion VARCHAR(50),
  usuario_ingreso VARCHAR(100),
  tipo_pago VARCHAR(50),
  monto NUMERIC(12,2) NOT NULL,
  monto_total NUMERIC(12,2),
  monto_neto NUMERIC(12,2),
  saldo_a_favor NUMERIC(12,2),
  saldo_a_favor_total NUMERIC(12,2),
  estado_abono VARCHAR(50),
  identificador_abono VARCHAR(50),
  fecha_vencimiento DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_abono_fecha ON abono(fecha);
CREATE INDEX idx_abono_cliente ON abono(identificador);
CREATE INDEX idx_abono_vendedor ON abono(vendedor_cliente);

-- Fin de script
-- Ejemplo de truncado de tabla transaccional
TRUNCATE TABLE abono CASCADE;
