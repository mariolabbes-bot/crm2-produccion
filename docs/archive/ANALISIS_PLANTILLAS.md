# Actualización de Plantillas de Importación

## Problema Detectado

Las plantillas de importación actuales **NO coinciden** con la estructura real de las tablas en la base de datos.

### Tabla Real `venta` (estructura_nueva.sql)

```sql
CREATE TABLE IF NOT EXISTS venta (
  id SERIAL PRIMARY KEY,
  sucursal VARCHAR(100),                    -- ❌ NO ESTABA EN PLANTILLA
  tipo_documento VARCHAR(50),                -- ✅ Estaba como "Identificador"
  folio VARCHAR(50) NOT NULL,                -- ✅ Estaba
  fecha_emision DATE,                        -- ✅ Estaba como "Fecha"
  identificador VARCHAR(20),                 -- ❌ RUT del cliente, NO ESTABA
  cliente VARCHAR(100),                      -- ✅ Estaba
  vendedor_cliente VARCHAR(100),             -- ❌ Alias del vendedor, NO ESTABA
  vendedor_documento VARCHAR(100),           -- ✅ Estaba
  estado_sistema VARCHAR(50),                -- ❌ NO ESTABA
  estado_comercial VARCHAR(50),              -- ❌ NO ESTABA
  estado_sii VARCHAR(50),                    -- ❌ NO ESTABA
  indice VARCHAR(50),                        -- ❌ NO ESTABA
  sku VARCHAR(50),                           -- ❌ NO ESTABA
  descripcion VARCHAR(255),                  -- ❌ NO ESTABA
  cantidad NUMERIC(15,2),                    -- ✅ Estaba
  precio NUMERIC(15,2),                      -- ✅ Estaba
  valor_total NUMERIC(15,2),                 -- ❌ Se calculaba, pero no estaba explícito
  UNIQUE(tipo_documento, folio)
);
```

### Tabla Real `abono` (estructura_nueva.sql)

```sql
CREATE TABLE IF NOT EXISTS abono (
  sucursal VARCHAR(100),                     -- ❌ NO ESTABA EN PLANTILLA
  folio VARCHAR(50) PRIMARY KEY,             -- ✅ Estaba
  fecha DATE,                                -- ✅ Estaba
  identificador VARCHAR(20),                 -- ❌ RUT del cliente, NO ESTABA
  cliente VARCHAR(100),                      -- ✅ Estaba
  vendedor_cliente VARCHAR(100),             -- ❌ Alias del vendedor, NO ESTABA
  caja_operacion VARCHAR(100),               -- ❌ NO ESTABA
  usuario_ingreso VARCHAR(100),              -- ❌ NO ESTABA
  monto_total NUMERIC(15,2),                 -- ❌ NO ESTABA
  saldo_a_favor NUMERIC(15,2),               -- ❌ NO ESTABA
  saldo_a_favor_total NUMERIC(15,2),         -- ❌ NO ESTABA
  tipo_pago VARCHAR(50),                     -- ✅ Estaba
  estado_abono VARCHAR(50),                  -- ❌ NO ESTABA
  identificador_abono VARCHAR(100),          -- ❌ NO ESTABA
  fecha_vencimiento DATE,                    -- ❌ NO ESTABA
  monto NUMERIC(15,2),                       -- ✅ Estaba
  monto_neto NUMERIC(15,2)                   -- ❌ NO ESTABA
);
```

## Solución

Necesitamos actualizar:

1. **Plantillas Excel** (endpoints GET `/api/import/plantilla/ventas` y `/abonos`)
2. **Código de detección de columnas** (lógica de `findCol`)
3. **Código de procesamiento** (lógica de construcción de objetos)
4. **Código de INSERT** (queries SQL con todas las columnas)

## Nueva Plantilla de Ventas

Columnas en orden:

| Columna | Tipo | Requerido | Descripción |
|---------|------|-----------|-------------|
| Sucursal | TEXT | Opcional | Nombre de la sucursal |
| Tipo documento | TEXT | **Requerido** | Factura, Boleta, etc. |
| Folio | TEXT | **Requerido** | Número de documento |
| Fecha | DATE | **Requerido** | Fecha de emisión (YYYY-MM-DD o DD-MM-YYYY) |
| Identificador | TEXT | Opcional | RUT del cliente (12345678-9) |
| Cliente | TEXT | **Requerido** | Nombre del cliente |
| Vendedor cliente | TEXT | Opcional | Alias del vendedor (referencia usuario.alias) |
| Vendedor documento | TEXT | Opcional | Nombre completo del vendedor |
| Estado sistema | TEXT | Opcional | Estado del sistema |
| Estado comercial | TEXT | Opcional | Estado comercial |
| Estado SII | TEXT | Opcional | Estado en SII |
| Indice | TEXT | Opcional | Índice de la línea |
| SKU | TEXT | Opcional | Código del producto |
| Descripcion | TEXT | Opcional | Descripción del producto |
| Cantidad | NUMBER | Opcional | Cantidad vendida |
| Precio | NUMBER | Opcional | Precio unitario |
| Valor total | NUMBER | Opcional | Valor total de la línea |

## Nueva Plantilla de Abonos

Columnas en orden:

| Columna | Tipo | Requerido | Descripción |
|---------|------|-----------|-------------|
| Sucursal | TEXT | Opcional | Nombre de la sucursal |
| Folio | TEXT | **Requerido** | Número del abono |
| Fecha | DATE | **Requerido** | Fecha del abono |
| Identificador | TEXT | Opcional | RUT del cliente |
| Cliente | TEXT | Opcional | Nombre del cliente |
| Vendedor cliente | TEXT | Opcional | Alias del vendedor |
| Caja operacion | TEXT | Opcional | Caja de operación |
| Usuario ingreso | TEXT | Opcional | Usuario que ingresa |
| Monto total | NUMBER | Opcional | Monto total |
| Saldo a favor | NUMBER | Opcional | Saldo a favor |
| Saldo a favor total | NUMBER | Opcional | Saldo a favor total |
| Tipo pago | TEXT | Opcional | Tipo de pago |
| Estado abono | TEXT | Opcional | Estado del abono |
| Identificador abono | TEXT | Opcional | Identificador del abono |
| Fecha vencimiento | DATE | Opcional | Fecha de vencimiento |
| Monto | NUMBER | **Requerido** | Monto del abono |
| Monto neto | NUMBER | Opcional | Monto neto |

## Cambios en el Código

### 1. Detección de Columnas (Ventas)

```javascript
const colSucursal = findCol([/^Sucursal$/i]);
const colTipoDoc = findCol([/^Tipo.*documento$/i, /^Identificador$/i]);
const colFolio = findCol([/^Folio$/i]);
const colFecha = findCol([/^Fecha$/i, /^Fecha.*emision$/i]);
const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i]);
const colCliente = findCol([/^Cliente$/i]);
const colVendedorCliente = findCol([/^Vendedor.*cliente$/i]);
const colVendedorDoc = findCol([/^Vendedor.*documento$/i, /^Vendedor$/i]);
const colEstadoSistema = findCol([/^Estado.*sistema$/i]);
const colEstadoComercial = findCol([/^Estado.*comercial$/i]);
const colEstadoSII = findCol([/^Estado.*SII$/i]);
const colIndice = findCol([/^Indice$/i, /^Index$/i]);
const colSKU = findCol([/^SKU$/i, /^Codigo$/i]);
const colDescripcion = findCol([/^Descripcion$/i, /^Descripción$/i]);
const colCantidad = findCol([/^Cantidad$/i]);
const colPrecio = findCol([/^Precio$/i]);
const colValorTotal = findCol([/^Valor.*total$/i, /^Total$/i]);
```

### 2. INSERT Dinámico (Ventas)

```javascript
INSERT INTO venta (
  sucursal, tipo_documento, folio, fecha_emision,
  identificador, cliente, vendedor_cliente, vendedor_documento,
  estado_sistema, estado_comercial, estado_sii, indice,
  sku, descripcion, cantidad, precio, valor_total
) VALUES (...)
```
