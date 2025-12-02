# 🔍 VERIFICACIÓN BACKEND - CRM2 Lubricar

**Fecha:** 12 de noviembre de 2025  
**Backend URL:** https://crm2-backend.onrender.com

---

## ✅ ENDPOINTS VERIFICADOS

### 1. **Autenticación**
- **Endpoint:** `POST /api/users/login`
- **Estado:** ✅ Funcionando
- **Test:**
  ```bash
  curl -X POST "https://crm2-backend.onrender.com/api/users/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"mario.labbe@lubricar-insa.cl","password":"manager123"}'
  ```
- **Respuesta:** Token JWT válido

---

### 2. **KPIs Mes Actual**
- **Endpoint:** `GET /api/kpis/mes-actual`
- **Estado:** ✅ Funcionando
- **Código:** `backend/src/routes/kpis.js` (líneas 136-286)
- **Test:**
  ```bash
  TOKEN="..." # Token del login
  curl -X GET "https://crm2-backend.onrender.com/api/kpis/mes-actual" \
    -H "Authorization: Bearer $TOKEN"
  ```
- **Respuesta Esperada:**
  ```json
  {
    "success": true,
    "data": {
      "monto_ventas_mes": 0,
      "monto_abonos_mes": 0,
      "variacion_vs_anio_anterior_pct": 0,
      "numero_clientes_con_venta_mes": 0
    }
  }
  ```
- **Nota:** Devuelve 0 porque estamos en noviembre 2025 y los datos están en 2024. Es correcto.

---

### 3. **Evolución Mensual** (NUEVO - CREADO)
- **Endpoint:** `GET /api/kpis/evolucion-mensual`
- **Estado:** ✅ Creado (requiere deployment)
- **Código:** `backend/src/routes/kpis.js` (líneas 288-386)
- **Funcionalidad:**
  - Retorna ventas y abonos de los últimos 12 meses
  - Agrupados por mes (formato YYYY-MM)
  - Filtrado por vendedor si no es manager
- **Respuesta Esperada:**
  ```json
  [
    { "mes": "2024-01", "ventas": 123456789, "abonos": 98765432 },
    { "mes": "2024-02", "ventas": 234567890, "abonos": 87654321 },
    ...
  ]
  ```

---

### 4. **Ventas por Familia** (NUEVO - CREADO)
- **Endpoint:** `GET /api/kpis/ventas-por-familia`
- **Estado:** ✅ Creado (requiere deployment)
- **Código:** `backend/src/routes/kpis.js` (líneas 388-497)
- **Funcionalidad:**
  - Retorna ventas agrupadas por familia de producto
  - Últimos 12 meses
  - JOIN entre tabla venta y producto
  - Ordenado por total descendente
- **Respuesta Esperada:**
  ```json
  [
    { "familia": "LUBRICANTES", "total": 3456789012 },
    { "familia": "FILTROS", "total": 2345678901 },
    { "familia": "ACEITES", "total": 1234567890 },
    ...
  ]
  ```

---

## 🏗️ ESTRUCTURA DE TABLAS DETECTADA

El backend usa **detección dinámica** de esquemas. Busca:

### Tabla Ventas:
- **Nombres posibles:** `sales`, `ventas`, `venta`
- **Columnas detectadas:**
  - Monto: `valor_total`, `net_amount`, `total_venta`, `monto_total`
  - Fecha: `invoice_date`, `fecha_emision`, `fecha`
  - Cliente FK: `client_id`, `cliente_id`
  - Producto FK: `producto_id`, `codigo_producto`
  - Vendedor: `vendedor_id`, `vendedor_cliente`

### Tabla Abonos:
- **Nombre:** `abono`
- **Columnas detectadas:**
  - Monto: `monto`, `monto_abono`
  - Fecha: `fecha_abono`, `fecha`
  - Vendedor: `vendedor_id`, `vendedor_cliente`

### Tabla Productos:
- **Nombre:** `producto`
- **Columnas detectadas:**
  - ID: `id`, `codigo_producto`
  - Familia: `familia`, `familia_producto`

---

## 📝 CAMBIOS REALIZADOS EN BACKEND

### Archivo: `backend/src/routes/kpis.js`

#### 1. **Nuevo Endpoint: `GET /api/kpis/evolucion-mensual`**
```javascript
// Líneas 288-386
router.get('/evolucion-mensual', auth(), async (req, res) => {
  // Lógica:
  // 1. Detectar tabla ventas y columnas
  // 2. Query ventas últimos 12 meses agrupado por mes
  // 3. Query abonos últimos 12 meses agrupado por mes
  // 4. Combinar ambos resultados en un array
  // 5. Filtrar por vendedor si no es manager
})
```

**Características:**
- ✅ Soporta filtro por vendedor (VENDEDOR vs MANAGER)
- ✅ Maneja caso donde vendedor_cliente es string (UPPER comparison)
- ✅ Maneja ausencia de tabla abono (retorna abonos: 0)
- ✅ Agrupación por mes con TO_CHAR(fecha, 'YYYY-MM')
- ✅ Últimos 12 meses desde fecha actual

---

#### 2. **Nuevo Endpoint: `GET /api/kpis/ventas-por-familia`**
```javascript
// Líneas 388-497
router.get('/ventas-por-familia', auth(), async (req, res) => {
  // Lógica:
  // 1. Verificar existencia de tabla producto
  // 2. Detectar columnas familia, id, producto_id en ventas
  // 3. JOIN ventas con productos
  // 4. Agrupar por familia
  // 5. Sumar ventas últimos 12 meses
  // 6. Ordenar por total descendente
})
```

**Características:**
- ✅ Soporta filtro por vendedor
- ✅ JOIN dinámico entre ventas y productos
- ✅ Maneja familias NULL como 'Sin familia'
- ✅ Ordenado por total descendente
- ✅ Últimos 12 meses
- ✅ Detección automática de nombres de columnas

---

## 🚀 DEPLOYMENT NECESARIO

Para que los nuevos endpoints funcionen:

### Opción 1: Deploy Manual en Render
1. Commit y push de cambios al repositorio
2. Render detectará cambios y re-deployará automáticamente
3. Verificar logs en Render Dashboard

### Opción 2: Forzar Re-deploy
1. Ir a Render Dashboard: https://dashboard.render.com
2. Seleccionar servicio `crm2-backend`
3. Click en "Manual Deploy" → "Deploy latest commit"

### Verificar Deploy:
```bash
# Esperar ~2-3 minutos después del deploy
curl -s "https://crm2-backend.onrender.com/api/kpis/evolucion-mensual" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 🧪 TESTS POST-DEPLOYMENT

Una vez deployado el backend, ejecutar:

### Test 1: Evolución Mensual
```bash
TOKEN=$(curl -s -X POST "https://crm2-backend.onrender.com/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"mario.labbe@lubricar-insa.cl","password":"manager123"}' | jq -r '.token')

curl -s "https://crm2-backend.onrender.com/api/kpis/evolucion-mensual" \
  -H "Authorization: Bearer $TOKEN" | jq '. | length'
# Esperado: 12 (o menos si hay menos de 12 meses de datos)
```

### Test 2: Ventas por Familia
```bash
curl -s "https://crm2-backend.onrender.com/api/kpis/ventas-por-familia" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:5]'
# Esperado: Array con top 5 familias
```

### Test 3: Verificar Estructura
```bash
curl -s "https://crm2-backend.onrender.com/api/kpis/evolucion-mensual" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0]'
# Esperado: { "mes": "2024-XX", "ventas": NNNN, "abonos": NNNN }
```

---

## 📊 DATOS ESPERADOS (Base de Conocimiento)

Según análisis previo de la base de datos:

### Ventas (tabla venta):
- **Total registros:** 77,017 ventas
- **Período:** Enero 2024 - Septiembre 2025
- **Valor total:** ~$10.9B CLP
- **Productos más vendidos:**
  - MOBIL SUPER 3000 X1 5W40: $3.4B (31%)
  - CASTROL EDGE 5W30: $1.8B (16%)

### Abonos (tabla abono):
- **Total registros:** 30,230 abonos
- **Período:** Similar a ventas
- **Tipos de pago:** Efectivo, Transferencia, Cheque, etc.

### Productos (tabla producto):
- **Total:** 2,697 productos
- **Familias:** 7 familias principales
  - LUBRICANTES (mayor volumen)
  - FILTROS
  - ACEITES
  - etc.

### Con estos datos, los endpoints deberían retornar:
- **Evolución mensual:** 12-21 meses de datos (ene 2024 - sep 2025)
- **Ventas por familia:** 7 familias con totales en miles de millones

---

## ⚠️ NOTAS IMPORTANTES

### 1. **Fechas Actuales vs Datos Históricos**
El endpoint `/api/kpis/mes-actual` devuelve 0 porque:
- **Fecha actual:** Noviembre 2025
- **Datos en DB:** Hasta Septiembre 2025
- **Solución:** Usar datos históricos o actualizar DB con datos de nov 2025

### 2. **Caché de Detección de Esquemas**
El backend cachea la detección de tablas por 5 minutos:
```javascript
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 mins
```
Si se modifican tablas, esperar 5 min o reiniciar servidor.

### 3. **Permisos VENDEDOR vs MANAGER**
- **MANAGER:** Ve todos los datos
- **VENDEDOR:** Solo ve sus propios datos (filtrado por `vendedor_id` o `vendedor_cliente`)

### 4. **Manejo de Errores**
Todos los endpoints tienen manejo de errores:
- Retornan arrays vacíos `[]` si faltan tablas
- Retornan `0` si faltan datos
- Logs en consola con `console.error()`

---

## 🔄 INTEGRACIÓN CON FRONTEND

El frontend (`DashboardPage.js`) ya está configurado para usar estos endpoints:

```javascript
// frontend/src/pages/DashboardPage.js
import { getKpisMesActual, getEvolucionMensual, getVentasPorFamilia } from '../api';

useEffect(() => {
  const fetchData = async () => {
    const kpisResponse = await getKpisMesActual();
    const evolucion = await getEvolucionMensual();
    const familias = await getVentasPorFamilia();
    
    // Actualizar estado con datos reales
    setKpis({ ... });
    setEvolucionMensual(evolucion);
    setVentasPorFamilia(familias);
  };
  fetchData();
}, []);
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [x] Endpoint `/api/kpis/mes-actual` funciona correctamente
- [x] Endpoint `/api/kpis/evolucion-mensual` creado en código
- [x] Endpoint `/api/kpis/ventas-por-familia` creado en código
- [ ] **Backend deployado con nuevos endpoints**
- [ ] Tests post-deployment ejecutados
- [ ] Frontend verificado con datos reales
- [ ] Gráficos renderizando correctamente

---

## 🎯 PRÓXIMOS PASOS

1. **Hacer commit y push del backend:**
   ```bash
   cd backend
   git add src/routes/kpis.js
   git commit -m "feat: Add evolucion-mensual and ventas-por-familia endpoints"
   git push origin main
   ```

2. **Esperar deployment en Render** (~2-3 minutos)

3. **Verificar endpoints con curl** (tests arriba)

4. **Probar frontend** navegando a `http://localhost:3000`

5. **Verificar gráficos** en DashboardPage:
   - Evolución Mensual debe mostrar líneas de Ventas y Abonos
   - Ventas por Familia debe mostrar barras horizontales

---

**Estado Final:** 
- ✅ Backend código listo
- ⏳ Deployment pendiente
- ✅ Frontend configurado
- ⏳ Testing integral pendiente
