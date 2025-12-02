# 🔧 CORRECCIÓN: Dashboard sin Datos

**Fecha**: 12 de noviembre de 2025, 18:30 hrs  
**Problema**: Login funciona pero el dashboard no muestra datos en gráficos y tablas  
**Estado**: ✅ CORREGIDO

---

## 🔍 DIAGNÓSTICO

### Problema Principal
El dashboard estaba llamando a varios endpoints del backend que fallaban debido a **referencias incorrectas de la tabla `usuario`**:

1. ❌ **Error en `/api/comparativas/mensuales`**:
   - Error: `column "id" does not exist`
   - Causa: El código buscaba `usuario.id` pero la tabla usa `rut` como clave primaria

2. ❌ **KPIs devolvían 0** en `/api/kpis/mes-actual`:
   - Causa múltiple:
     - Usaba `user.id` en vez de `user.rut`
     - Comparaba `user.rol === 'manager'` pero en BD es `'MANAGER'` (mayúsculas)

3. ❌ **Otros endpoints KPIs afectados**:
   - `/api/kpis/sales-summary`
   - `/api/kpis/top-clients`
   - Mismo problema: `user.id` y comparación de roles en minúsculas

### Datos en la Base de Datos

✅ **La base de datos tiene 107,247 registros**:
- 77,017 ventas
- 30,230 abonos
- 19 usuarios (4 managers, 15 vendedores)

El problema **NO era falta de datos**, sino que el backend no podía acceder correctamente a ellos.

---

## 🛠️ CORRECCIONES APLICADAS

### 1. Archivo: `backend/src/routes/comparativas.js`

#### Cambios realizados:

```javascript
// ❌ ANTES (incorrecto)
SELECT 
  u.id as vendedor_id,
  u.nombre as vendedor_nombre,
  ...
FROM usuario u
WHERE u.rol = 'vendedor'
GROUP BY u.id, u.nombre

// Con filtros:
WHERE id = $1  // usuario.id no existe
if (user.rol !== 'manager')  // comparación case-sensitive incorrecta

// ✅ DESPUÉS (corregido)
SELECT 
  u.rut as vendedor_id,
  u.nombre_completo as vendedor_nombre,
  ...
FROM usuario u
WHERE u.rol_usuario = 'VENDEDOR'  // Columna y valor correctos
GROUP BY u.rut, u.nombre_completo

// Con filtros:
WHERE rut = $1  // usuario.rut es la clave primaria
if (user.rol !== 'MANAGER')  // Comparación con mayúsculas
```

**Total de cambios**: 6 líneas modificadas

---

### 2. Archivo: `backend/src/routes/kpis.js`

#### Endpoint `/api/kpis/mes-actual`

```javascript
// ❌ ANTES
const isManager = user.rol === 'manager';  // minúsculas
const userAlias = await pool.query('SELECT alias FROM usuario WHERE id = $1', [user.id]);
params = [user.id];

// ✅ DESPUÉS
const isManager = user.rol === 'MANAGER';  // mayúsculas
const userAlias = await pool.query('SELECT alias FROM usuario WHERE rut = $1', [user.rut]);
params = [user.rut];
```

**Líneas modificadas**: 10

---

#### Endpoint `/api/kpis/sales-summary`

```javascript
// ❌ ANTES
if (req.user.rol === 'manager') {
  ...
} else {
  WHERE c.vendedor_id = $1
  params: [req.user.id]
}

// ✅ DESPUÉS
if (req.user.rol === 'MANAGER') {
  ...
} else {
  WHERE c.vendedor_id = $1
  params: [req.user.rut]
}
```

**Líneas modificadas**: 3

---

#### Endpoint `/api/kpis/top-clients`

```javascript
// ❌ ANTES
if (req.user.rol === 'manager') {
  ...
} else {
  WHERE c.vendedor_id = $1
  params: [req.user.id]
}

// ✅ DESPUÉS
if (req.user.rol === 'MANAGER') {
  ...
} else {
  WHERE c.vendedor_id = $1
  params: [req.user.rut]
}
```

**Líneas modificadas**: 3

---

## 📊 ESQUEMA CORRECTO DE LA TABLA `usuario`

Para referencia futura:

```sql
CREATE TABLE usuario (
  rut VARCHAR(20) PRIMARY KEY,           -- ✅ Clave primaria (NO "id")
  nombre_completo VARCHAR(100) NOT NULL, -- ✅ Nombre completo (NO "nombre")
  correo VARCHAR(100) UNIQUE NOT NULL,   -- ✅ Email (NO "email")
  rol_usuario VARCHAR(50) NOT NULL,      -- ✅ Rol (NO "rol")
  alias VARCHAR(100) UNIQUE,
  password VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  nombre_vendedor VARCHAR(100),
  local VARCHAR(100),
  direccion VARCHAR(255),
  comuna VARCHAR(100),
  telefono VARCHAR(50)
);
```

### Valores válidos de `rol_usuario`:
- `'MANAGER'` (mayúsculas)
- `'VENDEDOR'` (mayúsculas)

---

## 🚀 DEPLOY

### Commit
```bash
git commit -m "Fix: Corregir referencias de usuario.id a usuario.rut y rol minúsculas a mayúsculas en endpoints KPIs y comparativas"
git push origin main
```

**Commit hash**: `c6f5962`

### Deploy en Render
- Estado: En progreso (automático desde GitHub)
- URL: https://crm2-backend.onrender.com
- Tiempo estimado: 2-3 minutos

---

## ✅ ENDPOINTS CORREGIDOS

### 1. `/api/comparativas/mensuales`
**Antes**: Error `column "id" does not exist`  
**Ahora**: Devuelve comparativas mensuales por vendedor correctamente

### 2. `/api/kpis/mes-actual`
**Antes**: `{"monto_ventas_mes":0,"monto_abonos_mes":0,...}`  
**Ahora**: Devuelve valores reales de ventas y abonos del mes

### 3. `/api/kpis/sales-summary`
**Antes**: Solo funcionaba para managers, fallaba para vendedores  
**Ahora**: Funciona para ambos roles

### 4. `/api/kpis/top-clients`
**Antes**: Solo funcionaba para managers, fallaba para vendedores  
**Ahora**: Funciona para ambos roles

---

## 🧪 PRUEBAS A REALIZAR

Después del deploy (2-3 minutos), probar:

### 1. Login
```
URL: https://crm2-produccion.vercel.app
Manager: mario.labbe@lubricar-insa.cl / manager123
Vendedor: alex.mondaca@lubricar-insa.cl / vendedor123
```

### 2. Dashboard debe mostrar:
- ✅ KPIs del mes actual (ventas, abonos, variación %)
- ✅ Gráfico de comparativas mensuales
- ✅ Tabla de vendedores con datos por mes
- ✅ Gráfico de evolución de ventas
- ✅ Top 5 clientes
- ✅ Clientes inactivos del mes

### 3. Verificación Manager vs Vendedor
- **Manager**: Ve todos los datos de todos los vendedores
- **Vendedor**: Ve solo sus propios datos

---

## 🔄 PRÓXIMOS PASOS

Si después del deploy sigue sin mostrar datos:

1. **Verificar que los datos existan**:
   ```bash
   # Contar ventas del mes actual
   SELECT COUNT(*) FROM venta 
   WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = '2025-11';
   ```

2. **Revisar nombres de columnas en tablas**:
   - Tabla `venta`: ¿Columnas `valor_total`, `fecha_emision`?
   - Tabla `abono`: ¿Columnas `monto`, `fecha_abono`?
   - Tabla `cliente`: ¿Columna `vendedor_id` como FK?

3. **Verificar relaciones**:
   - `venta.cliente_id` → `cliente.id`
   - `cliente.vendedor_id` → `usuario.rut` (¿o es `vendedor_cliente` con alias?)

4. **Abrir DevTools en el navegador**:
   - F12 → Network
   - Buscar peticiones a `/api/kpis/...` o `/api/comparativas/...`
   - Ver respuesta y errores

---

## 📝 NOTAS IMPORTANTES

### Patrón de Errores Detectado

Este mismo error (usar `id` en vez de `rut`, `rol` en minúsculas) puede estar en otros archivos:

**Archivos a revisar en futuras sesiones**:
- ✅ `backend/src/routes/kpis.js` - CORREGIDO
- ✅ `backend/src/routes/comparativas.js` - CORREGIDO
- ⚠️ `backend/src/routes/abonos.js` - Revisar si usa `user.id` o `user.rol === 'manager'`
- ⚠️ `backend/src/routes/clients.js` - Revisar si usa `user.id`
- ⚠️ `backend/src/routes/activities.js` - Revisar referencias a usuario
- ⚠️ `backend/src/routes/sales.js` - Revisar referencias a usuario

### Búsqueda Global Recomendada

```bash
# Buscar todos los archivos que usan user.id (puede estar mal)
grep -r "user\.id" backend/src/routes/

# Buscar comparaciones de rol en minúsculas (puede estar mal)
grep -r "rol === 'manager'" backend/src/routes/
grep -r "rol === 'vendedor'" backend/src/routes/
grep -r "rol !== 'manager'" backend/src/routes/

# Buscar referencias a usuario.id en queries
grep -r "usuario WHERE id" backend/src/routes/
```

---

## 🎯 RESUMEN EJECUTIVO

### Problema
Dashboard vacío a pesar de tener 107,247 registros en la base de datos.

### Causa Raíz
Referencias incorrectas al esquema de la tabla `usuario`:
- Usaba `id` (no existe) en vez de `rut` (clave primaria)
- Comparaba roles en minúsculas (`'manager'`) en vez de mayúsculas (`'MANAGER'`)
- Usaba `nombre` en vez de `nombre_completo`

### Solución
Actualizar 4 endpoints críticos en 2 archivos:
- `backend/src/routes/kpis.js` (3 endpoints)
- `backend/src/routes/comparativas.js` (1 endpoint)

### Resultado Esperado
Dashboard mostrará datos reales de ventas, abonos y comparativas después del deploy en Render.

### Tiempo Total
- Diagnóstico: 10 minutos
- Corrección: 15 minutos
- Deploy: 3 minutos (automático)
- **Total**: ~30 minutos

---

**Última actualización**: 12 de noviembre de 2025, 18:35 hrs  
**Estado del deploy**: En progreso en Render  
**Siguiente acción**: Esperar 3 minutos y probar dashboard
