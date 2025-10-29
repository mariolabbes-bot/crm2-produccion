-- Estructura nueva para CRM2 (Neon/Postgres)

-- 1. TABLA USUARIO
CREATE TABLE IF NOT EXISTS usuario (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  rut VARCHAR(20) UNIQUE NOT NULL,
  alias VARCHAR(100) UNIQUE NOT NULL,
  telefono VARCHAR(30),
  email VARCHAR(100) UNIQUE,
  cargo VARCHAR(50)
);

-- 2. TABLA PRODUCTOS
CREATE TABLE IF NOT EXISTS producto (
  sku VARCHAR(50) PRIMARY KEY,
  descripcion VARCHAR(255) NOT NULL,
  familia VARCHAR(100),
  subfamilia VARCHAR(100),
  marca VARCHAR(100)
);

-- 3. TABLA CLIENTES
CREATE TABLE IF NOT EXISTS cliente (
  rut VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  telefono VARCHAR(30),
  sucursal VARCHAR(100),
  comuna VARCHAR(100),
  ciudad VARCHAR(100),
  direccion VARCHAR(255),
  vendedor_alias VARCHAR(100) REFERENCES usuario(alias)
);

-- 4. TABLA VENTAS
CREATE TABLE IF NOT EXISTS venta (
  id SERIAL PRIMARY KEY,
  sucursal VARCHAR(100),
  tipo_documento VARCHAR(50),
  folio VARCHAR(50) NOT NULL,
  fecha_emision DATE,
  identificador VARCHAR(20) REFERENCES cliente(rut),
  cliente VARCHAR(100),
  vendedor_cliente VARCHAR(100) REFERENCES usuario(alias),
  vendedor_documento VARCHAR(100),
  estado_sistema VARCHAR(50),
  estado_comercial VARCHAR(50),
  estado_sii VARCHAR(50),
  indice VARCHAR(50),
  sku VARCHAR(50) REFERENCES producto(sku),
  descripcion VARCHAR(255),
  cantidad NUMERIC(15,2),
  precio NUMERIC(15,2),
  valor_total NUMERIC(15,2),
  UNIQUE(tipo_documento, folio)
);

-- 5. TABLA ABONOS
CREATE TABLE IF NOT EXISTS abono (
  sucursal VARCHAR(100),
  folio VARCHAR(50) PRIMARY KEY,
  fecha DATE,
  identificador VARCHAR(20) REFERENCES cliente(rut),
  cliente VARCHAR(100),
  vendedor_cliente VARCHAR(100) REFERENCES usuario(alias),
  caja_operacion VARCHAR(100),
  usuario_ingreso VARCHAR(100),
  monto_total NUMERIC(15,2),
  saldo_a_favor NUMERIC(15,2),
  saldo_a_favor_total NUMERIC(15,2),
  tipo_pago VARCHAR(50),
  estado_abono VARCHAR(50),
  identificador_abono VARCHAR(100),
  fecha_vencimiento DATE,
  monto NUMERIC(15,2),
  monto_neto NUMERIC(15,2)
);

-- 6. TABLA SIGNACION LITROS
CREATE TABLE IF NOT EXISTS signacion_litros (
  descripcion VARCHAR(255) PRIMARY KEY,
  litros_x_unidad NUMERIC(15,2)
);
