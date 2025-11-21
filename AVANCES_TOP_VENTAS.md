# Registro de Avances - Endpoint Top Ventas

**Fecha:** 21 de noviembre de 2025  
**Problema inicial:** Página Clientes no muestra datos, error 500 en `/api/clients/top-ventas` y `/facturas-impagas`

---

## DIAGNÓSTICO COMPLETADO

### Problema raíz identificado
1. **JOIN incorrecto:** Se usaba `c.rut = v.cliente` pero `venta.cliente` almacena NOMBRE, no RUT
2. **COUNT(v.id) obsoleto:** Generaba error "column id does not exist" en código antiguo cacheado
3. **Router montado pero endpoints debug internos inaccesibles:** 404 en `/api/clients/debug/*`

### Soluciones aplicadas
1. ✅ Cambio JOIN a: `UPPER(TRIM(c.nombre)) = UPPER(TRIM(v.cliente))`
2. ✅ Reemplazo `COUNT(v.id)` → `COUNT(*)`
3. ✅ Endpoints globales debug en `serverApp.js`:
   - `/api/debug/all-routes` - lista todas las rutas
   - `/api/debug/venta-columns` - columnas tabla venta
   - `/api/debug/top-query` - query mínima sin auth
   - `/api/debug/cliente-columns` - columnas tabla cliente
   - `/api/debug/top-ventas-direct` - top 20 sin auth
4. ✅ Refactor `/api/clients/top-ventas-v2` con:
   - Resolución robusta de `nombre_vendedor` (fallback a consulta DB)
   - Alias duales: `ventas`/`cantidad_ventas` y `total`/`total_ventas`
   - Logs exhaustivos para debugging

---

## VALIDACIONES EXITOSAS (via endpoints debug)

### Base de datos en producción
```json
// Columnas tabla venta (confirmadas)
["id", "sucursal", "tipo_documento", "folio", "fecha_emision", 
 "identificador", "cliente", "vendedor_cliente", "vendedor_documento",
 "estado_sistema", "estado_comercial", "estado_sii", "indice", "sku",
 "descripcion", "cantidad", "precio", "valor_total", "litros_vendidos", "created_at"]

// Columnas tabla cliente (confirmadas)
["rut", "nombre", "email", "telefono_principal", "sucursal", "categoria",
 "subcategoria", "comuna", "ciudad", "direccion", "numero", "nombre_vendedor"]
```

### Query top ventas funcional (comprobado)
```sql
SELECT UPPER(TRIM(c.nombre)) as nombre, c.rut, 
       COUNT(*) as ventas, SUM(v.valor_total) as total
FROM cliente c 
INNER JOIN venta v ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(v.cliente))
WHERE v.fecha_emision >= NOW() - INTERVAL '12 months'
GROUP BY c.rut, c.nombre
ORDER BY total DESC LIMIT 5
```
**Resultado:** 5 registros top con ventas coherentes (probado en `/api/debug/top-query`)

### Endpoint sin auth funcional
`/api/debug/top-ventas-direct` devuelve 20 registros correctamente:
- Top cliente: SERVICIOS SAN IGNACIO SPA (398 ventas, $155M)
- Datos coinciden con estructura esperada

---

## ESTADO ACTUAL

### Archivos modificados (último commit: d9e0929)
```
backend/src/routes/clients.js
  └─ /top-ventas-v2 (v2.1) - refactorizado
  └─ /facturas-impagas - actualizado JOIN
  └─ /debug/* endpoints (internos, 404 en producción)

backend/src/serverApp.js
  └─ /api/debug/all-routes - listado mejorado con sub-routers
  └─ /api/debug/venta-columns
  └─ /api/debug/top-query
  └─ /api/debug/cliente-columns
  └─ /api/debug/top-ventas-direct
  └─ /api/debug/dburl

backend/src/middleware/auth.js
  └─ Logs añadidos (🔐 inicio, token, rol, next)

backend/src/index.js
  └─ Mensaje versión 2.0.1 + FIX COUNT(*)
```

### Router clients montado
```javascript
app.use('/api/clients', require('./routes/clients'));
```
**Confirmado en línea 35 de serverApp.js**, antes del handler 404.

---

## PENDIENTE (SIGUIENTE SESIÓN)

### 1. Validación con autenticación (CRÍTICO)
**Usuario debe probar:**
```bash
# Paso 1: Login
POST https://crm2-backend.onrender.com/api/users/login
Body: { "email": "TU_CORREO", "password": "TU_PASSWORD" }
# Copiar token del response

# Paso 2: Llamar top-ventas-v2 con token
GET https://crm2-backend.onrender.com/api/clients/top-ventas-v2
Header: Authorization: Bearer TU_TOKEN_AQUI

# Paso 3: Comparar con debug
GET https://crm2-backend.onrender.com/api/debug/top-ventas-direct
```

**Resultados esperados:**
- Si manager: 20 filas igual que debug
- Si vendedor: Filas filtradas por `nombre_vendedor` en `vendedor_cliente`
- Campos: `rut`, `nombre`, `direccion`, `ciudad`, `telefono`, `email`, `total_ventas`, `cantidad_ventas`, `ventas`, `total`

### 2. Verificar filtro vendedor (si usuario es vendedor)
- Si devuelve lista vacía o menos filas:
  1. Llamar `/api/users/vendedores` → buscar `nombre_vendedor` del usuario
  2. Revisar tabla `venta` campo `vendedor_cliente` → confirmar coincidencia exacta (case-insensitive ya contemplado)
  3. Si hay desajuste (espacios, acentos), ajustar a LIKE flexible

### 3. Endpoint facturas-impagas
- Mismo patrón de corrección aplicado
- Requiere validar tabla `abono` (campos: `rut_cliente`, `monto`/`monto_abono`)
- Prueba después de top-ventas-v2 validado

### 4. Integración frontend
- Actualizar `ClientesPage.jsx` para consumir `/api/clients/top-ventas-v2`
- DataGrid: columnas `total_ventas` (formatear moneda), `cantidad_ventas`
- Manejo error 401 → redirigir a login

---

## LOGS Y DEBUGGING

### Cómo revisar logs en Render
1. Ir a dashboard Render → servicio CRM2-backend → pestaña Logs
2. Buscar patrones:
   ```
   🔥🔥🔥 CARGANDO ROUTES/CLIENTS.JS - VERSIÓN 2.0.1
   📊 [TOP-VENTAS v2.1] Obteniendo top 20 clientes
   🧪 Filtro vendedor aplicado: ...
   📊 Query a ejecutar (top-ventas-v2): ...
   📌 Primer registro ejemplo: { ... }
   ```
3. Si error 500, copiar Stack completo

### Endpoints debug disponibles (sin auth)
```
GET /api/debug/all-routes          # Lista rutas app
GET /api/debug/venta-columns        # Columnas tabla venta
GET /api/debug/cliente-columns      # Columnas tabla cliente
GET /api/debug/top-query            # Top 5 clientes mínimo
GET /api/debug/top-ventas-direct    # Top 20 clientes sin auth
GET /api/debug/dburl                # Cadena conexión DB (CUIDADO en prod)
```

---

## COMMITS RELEVANTES

```
d9e0929 - TOP-VENTAS v2.1: filtro vendedor robusto + aliases ventas/total
fd971c0 - DEBUG: mejorar listado rutas + cliente-columns + top-ventas-direct
dd3a1c7 - DEBUG GLOBAL: /api/debug/all-routes + columnas y top-query
7bd730f - (commits previos de corrección JOIN y COUNT)
```

---

## CONTEXTO TÉCNICO

### Stack
- Backend: Node.js + Express + PostgreSQL (Neon)
- Frontend: React + Vercel
- Deploy: Render (backend), Vercel (frontend)
- Auth: JWT (exp: 24h)

### Tablas clave
```sql
-- cliente
rut (PK), nombre, email, telefono_principal, ciudad, direccion,
nombre_vendedor, categoria, subcategoria

-- venta
id, cliente (nombre, NO rut), vendedor_cliente, fecha_emision,
valor_total, folio, sucursal, tipo_documento

-- usuario
rut, correo, rol_usuario (manager/vendedor), nombre_vendedor, alias

-- abono
rut_cliente, monto/monto_abono, fecha
```

### Query pattern clave
```sql
-- JOIN correcto por nombre normalizado
INNER JOIN venta v ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(v.cliente))

-- Filtro vendedor (si no manager)
AND UPPER(v.vendedor_cliente) = UPPER($1)  -- param = nombre_vendedor

-- Agregaciones
COUNT(*) as cantidad_ventas
COALESCE(SUM(v.valor_total), 0) as total_ventas
```

---

## SIGUIENTE ACCIÓN INMEDIATA

**Cuando reanudemos:**
1. Usuario ejecuta pasos 1-4 de la guía (login + token + llamada)
2. Pega respuesta JSON de `/api/clients/top-ventas-v2`
3. Si hay error → copiar JSON error + logs Render con query
4. Si funciona → validar filas y columnas
5. Integrar en frontend

**Estado:** Backend listo para pruebas. Endpoint refactorizado, logs activos, queries validadas.

---

## NOTAS IMPORTANTES

- ⚠️ Endpoints `/api/clients/debug/*` no accesibles (404) pero no críticos; usar `/api/debug/*` globales
- ✅ Estructura DB confirmada, columnas verificadas
- ✅ Query funcional sin auth comprobada
- 🔄 Falta validar con middleware auth (requiere token real del usuario)
- 📌 No borrar endpoints debug hasta validación completa

---

**Última actualización:** 21/11/2025 - Sesión pausada para continuar mañana
**Próximo paso:** Prueba autenticada por parte del usuario
