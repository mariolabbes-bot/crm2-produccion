# Plan de Actualización del Sistema de Importación

## Cambios Necesarios

### 1. Determinar la tabla correcta
- ¿Usamos `sales` o `venta`?
- Necesito que me confirmes cuál es la tabla real en producción

### Opciones:

#### Opción A: Si la tabla es `sales` (como dice schema.sql)
```sql
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  net_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, invoice_number)
);
```
**Entonces la plantilla actual está OK** (solo necesita ajustes menores)

#### Opción B: Si la tabla es `venta` (como dice estructura_nueva.sql)
```sql
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
```
**Entonces necesitamos actualizar TODO** (plantillas + código de procesamiento)

## Pregunta Crítica

**¿Cuál de las dos tablas existe realmente en tu base de datos de producción?**

Puedo verificarlo ejecutando una query, o tú puedes decírmelo directamente.

### Cómo verificarlo:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales', 'venta', 'ventas');
```

## Impacto de cada opción

### Si es `sales`:
- ✅ Código de INSERT actual funciona
- ⚠️ Plantilla debe ajustarse a: `client_id, invoice_number, invoice_date, net_amount`
- ⚠️ Necesitamos validar por `client_id + invoice_number` (no por `tipo_documento + folio`)

### Si es `venta`:
- ❌ Código de INSERT actual NO funciona (tabla no existe)
- ✅ Plantilla debe incluir TODAS las columnas de `venta`
- ✅ Validación por `tipo_documento + folio` está OK

## Próximo paso

**ESPERO TU CONFIRMACIÓN** sobre cuál tabla usar antes de proceder con los cambios.

