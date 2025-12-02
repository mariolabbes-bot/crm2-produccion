# 🔍 ANÁLISIS PROFUNDO: Dashboard sin Datos

**Fecha**: 12 de noviembre de 2025, 19:00 hrs  
**Estado**: ⚠️ PROBLEMA IDENTIFICADO - SOLUCIÓN EN PROGRESO

---

## 📊 ESTRUCTURA REAL DE LA BASE DE DATOS

### Tabla `usuario`
```sql
CREATE TABLE usuario (
  id SERIAL PRIMARY KEY,              -- ⚠️ Existe id (autoincremental)
  rut VARCHAR(20) UNIQUE NOT NULL,    -- ✅ También tiene rut único
  nombre_completo VARCHAR(100),
  nombre_vendedor VARCHAR(100) UNIQUE, -- ✅ CLAVE: Alias del vendedor
  rol_usuario VARCHAR(50),             -- 'MANAGER' o 'VENDEDOR'
  ...
);
```

### Tabla `venta` (77,017 registros)
```sql
CREATE TABLE venta (
  id SERIAL PRIMARY KEY,
  fecha_emision DATE,
  identificador VARCHAR(20) REFERENCES cliente(rut),
  cliente VARCHAR(100),
  vendedor_cliente VARCHAR(100) REFERENCES usuario(nombre_vendedor), -- ⚠️ FK a nombre_vendedor
  vendedor_documento VARCHAR(100) REFERENCES usuario(nombre_vendedor),
  valor_total NUMERIC(12,2),
  ...
);
```

### Tabla `abono` (30,230 registros)
```sql
CREATE TABLE abono (
  id SERIAL PRIMARY KEY,
  fecha DATE,
  identificador VARCHAR(20) REFERENCES cliente(rut),
  cliente VARCHAR(100),
  vendedor_cliente VARCHAR(100) REFERENCES usuario(nombre_vendedor), -- ⚠️ FK a nombre_vendedor
  monto NUMERIC(12,2),
  ...
);
```

---

## 🚨 PROBLEMA PRINCIPAL IDENTIFICADO

### 1. Relación Vendedor → Ventas/Abonos

**El código actual asume**:
```javascript
// ❌ INCORRECTO - Busca por RUT
WHERE vendedor_id = user.rut
```

**La realidad en la BD**:
```sql
-- ✅ CORRECTO - Debe buscar por nombre_vendedor (alias)
WHERE vendedor_cliente = usuario.nombre_vendedor
```

### 2. Datos Reales en las Tablas

**Muestra de ventas**:
```sql
-- La mayoría de ventas tienen vendedor_cliente = NULL
vendedor_cliente: NULL  -- ⚠️ Cliente genérico/retail
vendedor_cliente: NULL  -- ⚠️ Sin vendedor asignado
```

**Esto explica por qué devuelve 0**:
- Los datos históricos importados NO tienen `vendedor_cliente` poblado
- Solo ventas con vendedor asignado mostrarán datos por vendedor
- Los totales generales (para managers) deberían funcionar

---

## 📋 ANÁLISIS DE LOS ENDPOINTS

### Endpoint 1: `/api/kpis/mes-actual`

**Código actual**:
```javascript
// Detecta la columna vendedor
const vendedorCol = vendedorColCheck.rows[0]?.column_name; // 'vendedor_cliente'

// Para vendedores, filtra por RUT
vendedorFilter = `AND ${vendedorCol} = $1`;
params = [user.rut]; // ❌ INCORRECTO
```

**Debería ser**:
```javascript
// Para vendedores, filtra por nombre_vendedor (alias)
vendedorFilter = `AND ${vendedorCol} = $1`;
params = [user.nombre_vendedor]; // ✅ CORRECTO
```

**Problema adicional**: El usuario en JWT no incluye `nombre_vendedor`:
```javascript
// Token actual
{
  user: {
    rut: "12.168.148-K",
    alias: null,  // ⚠️ Es NULL para este usuario
    nombre: "Mario Andres Labbe Silva",
    rol: "MANAGER"
  }
}
```

---

### Endpoint 2: `/api/comparativas/mensuales`

**Código actual**:
```javascript
// Opción 1: Si usa vendedor_cliente (texto)
SELECT 
  UPPER(TRIM(vendedor_cliente)) as vendedor_nombre,
  ...
FROM venta
...
LEFT JOIN ventas_mensuales vm ON UPPER(TRIM(u.alias)) = vm.vendedor_nombre
WHERE u.rol_usuario = 'VENDEDOR'
```

**Problema**: Asume que `usuario.alias = venta.vendedor_cliente`, pero:
- `usuario.alias` puede ser NULL
- `venta.vendedor_cliente` puede ser NULL
- Debería usar `usuario.nombre_vendedor`

---

## 🔍 CONSULTA DE VERIFICACIÓN

Probemos cuántas ventas tienen vendedor asignado:

```sql
-- Total de ventas
SELECT COUNT(*) as total FROM venta;
-- Resultado esperado: 77,017

-- Ventas con vendedor_cliente poblado
SELECT COUNT(*) as con_vendedor 
FROM venta 
WHERE vendedor_cliente IS NOT NULL;
-- Resultado esperado: probablemente bajo

-- Ventas por mes (sin filtro de vendedor)
SELECT 
  TO_CHAR(fecha_emision, 'YYYY-MM') as mes,
  COUNT(*) as cantidad,
  SUM(valor_total) as total_ventas
FROM venta
WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = '2025-11'
GROUP BY mes;
```

---

## 🛠️ SOLUCIONES PROPUESTAS

### Solución 1: Actualizar JWT para incluir `nombre_vendedor`

**Archivo**: `backend/src/routes/users.js` - endpoint `/login`

```javascript
// ❌ ACTUAL
const token = jwt.sign({
  user: {
    rut: user.rows[0].rut,
    alias: user.rows[0].alias,
    nombre: user.rows[0].nombre_completo,
    rol: user.rows[0].rol_usuario
  }
}, ...);

// ✅ CORREGIDO
const token = jwt.sign({
  user: {
    rut: user.rows[0].rut,
    alias: user.rows[0].alias,
    nombre: user.rows[0].nombre_completo,
    nombre_vendedor: user.rows[0].nombre_vendedor, // ✅ Agregar esto
    rol: user.rows[0].rol_usuario
  }
}, ...);
```

---

### Solución 2: Actualizar filtros en endpoints para usar `nombre_vendedor`

**Archivos a modificar**:
1. `backend/src/routes/kpis.js`
2. `backend/src/routes/comparativas.js`
3. `backend/src/routes/abonos.js`

**Cambio necesario**:
```javascript
// ❌ ANTES
if (!isManager) {
  vendedorFilter = `AND ${vendedorCol} = $1`;
  params = [user.rut]; // Busca por RUT
}

// ✅ DESPUÉS
if (!isManager) {
  vendedorFilter = `AND ${vendedorCol} = $1`;
  params = [user.nombre_vendedor]; // Busca por nombre_vendedor
}
```

---

### Solución 3: Manejo de ventas sin vendedor asignado

Para managers, mostrar **todas** las ventas (incluyendo las que tienen `vendedor_cliente = NULL`):

```javascript
// Para managers - sin filtro
if (isManager) {
  // No agregar filtro vendedorFilter
  vendedorFilter = '';
}

// Para vendedores - solo sus ventas
if (!isManager) {
  vendedorFilter = `AND ${vendedorCol} = $1`;
  params = [user.nombre_vendedor];
}
```

---

## 📊 DATOS ESPERADOS DESPUÉS DE LA CORRECCIÓN

### Para Managers (acceso total)

**KPIs Mes Actual (Nov 2025)**:
```json
{
  "monto_ventas_mes": [SUMA DE TODAS LAS VENTAS DE NOV 2025],
  "monto_abonos_mes": [SUMA DE TODOS LOS ABONOS DE NOV 2025],
  "numero_clientes_con_venta_mes": [CLIENTES ÚNICOS CON VENTA]
}
```

**Comparativas Mensuales**:
- Mostrará los 15 vendedores
- Solo tendrán datos los vendedores con `vendedor_cliente` poblado
- Vendedores sin ventas asignadas mostrarán 0

---

### Para Vendedores (solo sus datos)

**Si el vendedor tiene `nombre_vendedor` configurado**:
- Mostrará solo ventas donde `venta.vendedor_cliente = usuario.nombre_vendedor`
- Si no hay ventas con su nombre asignado → mostrará 0

**Si el vendedor tiene `nombre_vendedor = NULL`**:
- No verá ninguna venta (filtro no coincidirá)
- Todos los valores en 0

---

## 🎯 MAPEO USUARIO → NOMBRE_VENDEDOR

Verificar en la tabla `usuario`:

```sql
SELECT 
  rut,
  nombre_completo,
  nombre_vendedor,
  rol_usuario
FROM usuario
ORDER BY rol_usuario, nombre_completo;
```

**Resultado esperado**:
```
rut             | nombre_completo              | nombre_vendedor | rol_usuario
----------------|------------------------------|-----------------|------------
12.168.148-K    | Mario Andres Labbe Silva     | NULL o valor?   | MANAGER
11.599.857-9    | Alex Mauricio Mondaca Cortes | NULL o valor?   | VENDEDOR
...
```

**Pregunta crítica**: ¿Los vendedores tienen `nombre_vendedor` poblado o es NULL?

---

## 🔄 PLAN DE ACCIÓN

### Paso 1: Verificar `nombre_vendedor` en usuarios
```sql
SELECT COUNT(*) as total,
       COUNT(nombre_vendedor) as con_nombre_vendedor,
       rol_usuario
FROM usuario
GROUP BY rol_usuario;
```

### Paso 2: Verificar ventas con vendedor asignado
```sql
SELECT COUNT(*) as total,
       COUNT(DISTINCT vendedor_cliente) as vendedores_unicos
FROM venta
WHERE vendedor_cliente IS NOT NULL;
```

### Paso 3: Actualizar código backend
1. ✅ Incluir `nombre_vendedor` en JWT
2. ✅ Cambiar filtros para usar `nombre_vendedor` en vez de `rut`
3. ✅ Manejar casos NULL apropiadamente

### Paso 4: Deploy y verificación
1. Commit y push
2. Esperar deploy en Render
3. Probar dashboard

---

## 🧪 CONSULTAS DE PRUEBA

### Test 1: Ventas totales mes actual (managers)
```sql
SELECT 
  TO_CHAR(fecha_emision, 'YYYY-MM') as mes,
  COUNT(*) as cantidad,
  SUM(valor_total) as monto_total
FROM venta
WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = '2025-11'
GROUP BY mes;
```

### Test 2: Ventas por vendedor mes actual
```sql
SELECT 
  vendedor_cliente,
  COUNT(*) as cantidad,
  SUM(valor_total) as monto_total
FROM venta
WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = '2025-11'
AND vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY monto_total DESC;
```

### Test 3: Abonos totales mes actual
```sql
SELECT 
  TO_CHAR(fecha, 'YYYY-MM') as mes,
  COUNT(*) as cantidad,
  SUM(monto) as monto_total
FROM abono
WHERE TO_CHAR(fecha, 'YYYY-MM') = '2025-11'
GROUP BY mes;
```

---

## 📝 RESUMEN EJECUTIVO

### Problema Real
1. ❌ **Código busca por `rut`** → Debe buscar por `nombre_vendedor`
2. ❌ **JWT no incluye `nombre_vendedor`** → Debe agregarse
3. ⚠️ **Muchas ventas tienen `vendedor_cliente = NULL`** → Solo ventas asignadas mostrarán datos por vendedor
4. ❌ **`usuario.alias` es NULL** → No se puede usar como clave de búsqueda

### Causa Raíz
El sistema importó datos históricos donde la relación vendedor→venta se hace por **nombre** (`vendedor_cliente`), no por ID o RUT. El código actual asume una relación por ID/RUT que no existe en la estructura de datos.

### Solución
1. Modificar JWT para incluir `nombre_vendedor`
2. Cambiar todos los filtros de `user.rut` → `user.nombre_vendedor`
3. Asegurar que el código maneje correctamente `NULL` en `vendedor_cliente`

### Impacto
- **Managers**: Verán todos los datos (incluyendo ventas sin vendedor)
- **Vendedores**: Solo verán sus ventas SI tienen `nombre_vendedor` configurado y ventas asignadas con ese nombre

---

**Próximo paso**: Ejecutar las consultas de verificación para confirmar la estructura de datos y luego aplicar las correcciones.
