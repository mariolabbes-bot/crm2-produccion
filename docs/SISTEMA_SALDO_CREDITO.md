# Sistema de Saldo Crédito - Documentación Oficial

**Fecha de implementación:** 2 de diciembre de 2025  
**Versión:** 1.0  
**Estado:** ✅ Producción

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Base de Datos](#base-de-datos)
4. [Backend - API Endpoints](#backend---api-endpoints)
5. [Frontend - Dashboard](#frontend---dashboard)
6. [Sistema de Aliases](#sistema-de-aliases)
7. [Proceso de Importación](#proceso-de-importación)
8. [Mantenimiento](#mantenimiento)
9. [Troubleshooting](#troubleshooting)

---

## 📖 Descripción General

El sistema de Saldo Crédito permite:
- Importar datos de facturas pendientes desde archivo Excel
- Visualizar el saldo total de crédito por vendedor
- Filtrar por vendedor específico (managers)
- Actualización periódica mediante importación con reemplazo completo

### Características principales:
- ✅ Importación masiva desde Excel (DELETE completo + INSERT)
- ✅ Normalización automática de nombres de vendedores
- ✅ Sistema de aliases para mapear variantes de nombres
- ✅ KPI en dashboard con filtros por rol
- ✅ Sincronización con tabla de usuarios

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ DashboardPage.js                                       │ │
│  │ - Tarjeta "Saldo Crédito Total"                       │ │
│  │ - Filtro por vendedor (managers)                      │ │
│  │ - Llamada a getSaldoCreditoTotal()                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ api.js                                                 │ │
│  │ - getSaldoCreditoTotal(params)                        │ │
│  │ - uploadSaldoCreditoFile(file)                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ /api/kpis/saldo-credito-total                         │ │
│  │ - GET: Suma saldo_factura con filtro por vendedor    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ /api/import/saldo-credito                             │ │
│  │ - POST: Importa Excel con DELETE + INSERT            │ │
│  │ - Usa resolveVendorName() para normalización         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ /api/vendor-aliases                                    │ │
│  │ - GET/POST/PUT/DELETE: CRUD de aliases               │ │
│  │ - POST /seed: Carga masiva de aliases                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ utils/vendorAlias.js                                   │ │
│  │ - resolveVendorName(): Mapea alias → oficial         │ │
│  │ - Caché en memoria (TTL: 5 min)                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS                             │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ saldo_credito  │  │ usuario_alias  │  │   usuario     │ │
│  │ - 13 columnas  │  │ - alias        │  │ - nombre_ven- │ │
│  │ - saldo_fact.. │  │ - oficial      │  │   dedor       │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Base de Datos

### Tabla: `saldo_credito`

Almacena las facturas pendientes con su saldo.

```sql
CREATE TABLE saldo_credito (
  id SERIAL PRIMARY KEY,
  rut VARCHAR(20),
  tipo_documento VARCHAR(50),
  cliente VARCHAR(255),
  folio INTEGER,
  fecha_emision DATE,
  total_factura NUMERIC(15,2),
  deuda_cancelada NUMERIC(15,2) DEFAULT 0,
  saldo_factura NUMERIC(15,2),
  saldo_favor_disponible NUMERIC(15,2) DEFAULT 0,
  nombre_vendedor VARCHAR(255),
  idvendedor INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Registros típicos:** ~1560 facturas

### Tabla: `usuario_alias`

Mapea variantes de nombres a nombres oficiales de vendedores.

```sql
CREATE TABLE usuario_alias (
  id SERIAL PRIMARY KEY,
  alias VARCHAR(255) NOT NULL,
  nombre_vendedor_oficial VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Ejemplos de registros:**
```
| alias              | nombre_vendedor_oficial                  |
|--------------------|------------------------------------------|
| Maiko Flores       | Maiko Ricardo Flores Maldonado          |
| Eduardo Ponce      | Eduardo Enrique Ponce Castillo          |
| Nelson Muñoz       | Nelson Antonio Muñoz Cortes             |
| Nelson Mu√±oz      | Nelson Antonio Muñoz Cortes             |
```

**Registros actuales:** 18 aliases

---

## 🔌 Backend - API Endpoints

### 1. GET `/api/kpis/saldo-credito-total`

Devuelve el total del saldo de crédito con filtro por vendedor según rol.

**Autenticación:** Bearer token (JWT)

**Query Parameters:**
- `vendedor_id` (opcional): RUT del vendedor para filtrar (solo managers)

**Lógica:**
- **Manager sin filtro:** Suma global de `saldo_factura`
- **Manager con filtro:** Suma solo del vendedor especificado (mapea RUT → nombre_vendedor)
- **Vendedor:** Suma solo de su cartera (usa `nombre_vendedor` del token)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_saldo_credito": 45782350.50
  }
}
```

**Archivos:**
- `backend/src/routes/kpis.js` (línea ~592)

---

### 2. POST `/api/import/saldo-credito`

Importa archivo Excel de Saldo Crédito con reemplazo completo.

**Autenticación:** Bearer token (solo `manager`)

**Body:** FormData con archivo Excel
- Key: `file`
- Value: archivo `.xlsx` / `.xls` / `.xlsm`

**Proceso:**
1. Lee archivo Excel
2. Valida columnas requeridas
3. `BEGIN` transacción
4. Crea tabla si no existe
5. `DELETE FROM saldo_credito` (borra TODO)
6. Loop por cada fila:
   - Parsea `fecha_emision` (Excel date)
   - Parsea valores numéricos
   - **Resuelve `nombre_vendedor`** con `resolveVendorName()`
   - `INSERT` en `saldo_credito`
7. `COMMIT` transacción

**Response:**
```json
{
  "success": true,
  "msg": "Importación completada exitosamente",
  "registrosEliminados": 1560,
  "registrosInsertados": 1560,
  "errores": 0
}
```

**Archivos:**
- `backend/src/routes/import.js` (línea ~1050)

---

### 3. GET `/api/vendor-aliases`

Lista todos los aliases de vendedores.

**Autenticación:** Bearer token (solo `manager`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "alias": "Maiko Flores",
      "nombre_vendedor_oficial": "Maiko Ricardo Flores Maldonado",
      "created_at": "2025-12-02T10:30:00.000Z"
    },
    ...
  ]
}
```

---

### 4. POST `/api/vendor-aliases`

Crea un nuevo alias.

**Autenticación:** Bearer token (solo `manager`)

**Body:**
```json
{
  "alias": "MAIKO",
  "nombre_vendedor_oficial": "Maiko Ricardo Flores Maldonado"
}
```

---

### 5. POST `/api/vendor-aliases/seed`

Carga masiva de 18 aliases predefinidos (borra los existentes).

**Autenticación:** Bearer token (solo `manager`)

**Body:** Vacío

**Response:**
```json
{
  "success": true,
  "msg": "Aliases cargados exitosamente",
  "count": 18
}
```

**Uso típico:** Setup inicial después de deployment

**Archivos:**
- `backend/src/routes/vendorAliases.js`

---

### 6. Utilidad: `resolveVendorName(rawName)`

Función interna para normalizar nombres de vendedores.

**Lógica:**
1. Normaliza texto (sin acentos, uppercase, espacios únicos)
2. Busca en tabla `usuario_alias` (consulta caché 5 min)
3. Si no hay alias, busca en `usuario.nombre_vendedor`
4. Aplica coincidencia "suave" (sin palabras comunes: SR., SRA., VENDEDOR, etc.)
5. Intenta coincidencia parcial (substring)
6. Fallback: devuelve nombre original

**Archivos:**
- `backend/src/utils/vendorAlias.js`

---

## 🖥️ Frontend - Dashboard

### Componente: `DashboardPage.js`

**Ubicación:** `frontend/src/pages/DashboardPage.js`

#### Tarjeta #4: "Saldo Crédito Total"

**Props de KPICard:**
```jsx
<KPICard
  title="Saldo Crédito Total"
  value={formatCurrency(kpis.saldoCreditoTotal)}
  subtitle={
    isManager() && vendedorSeleccionado !== 'todos' 
      ? 'del vendedor' 
      : (isManager() ? 'global' : 'tu cartera')
  }
  color="#E57A2D"
  icon={<ProductosIcon />}
  loading={loading}
/>
```

**Estado:**
```javascript
const [kpis, setKpis] = useState({
  ventasMes: 0,
  abonosMes: 0,
  promedioTrimestre: 0,
  clientesActivos: 0,
  saldoCreditoTotal: 0,  // ← Nuevo
  trendVentas: 0,
  trendAbonos: 0,
  trendPromedioTrimestre: 0,
});
```

**Fetch:**
```javascript
// En useEffect cuando cambia vendedorSeleccionado
const params = {};
if (isManager() && vendedorSeleccionado !== 'todos') {
  params.vendedor_id = vendedorSeleccionado;
}

const saldoCreditoResponse = await getSaldoCreditoTotal(params);
const saldoCreditoData = saldoCreditoResponse.data || saldoCreditoResponse;

setKpis({
  ...otrosKpis,
  saldoCreditoTotal: saldoCreditoData.total_saldo_credito || 0
});
```

---

### API Client: `api.js`

**Función:**
```javascript
export const getSaldoCreditoTotal = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_URL}/kpis/saldo-credito-total${qs ? `?${qs}` : ''}`;
  return apiFetch(url);
};
```

**Ubicación:** `frontend/src/api.js` (después de línea 88)

---

## 🔄 Sistema de Aliases

### ¿Por qué son necesarios?

El archivo Excel de Saldo Crédito contiene nombres de vendedores en formato **corto o con variantes**:
- "Maiko Flores" en lugar de "Maiko Ricardo Flores Maldonado"
- "Nelson Mu√±oz" (encoding corrupto) en lugar de "Nelson Antonio Muñoz Cortes"

La tabla `usuario` tiene nombres **oficiales completos**.

Sin aliases, el filtro por vendedor devolvería **$0** porque no coinciden exactamente.

### Normalización automática

La función `resolveVendorName()` aplica:

1. **Normalización básica:**
   - Quita acentos: "José" → "JOSE"
   - Uppercase: "maiko" → "MAIKO"
   - Colapsa espacios: "Maiko  Flores" → "MAIKO FLORES"

2. **Búsqueda en aliases:**
   - Compara normalizado con tabla `usuario_alias`
   - Si hay match, devuelve `nombre_vendedor_oficial`

3. **Normalización suave:**
   - Quita palabras comunes: "SR. MAIKO FLORES VENDEDOR" → "MAIKO FLORES"
   - Reintenta búsqueda

4. **Búsqueda en usuarios:**
   - Compara contra `usuario.nombre_vendedor`
   - Intenta coincidencia parcial (substring)

5. **Fallback:**
   - Si nada funciona, devuelve nombre original

### Aliases actuales (18 registros)

| Alias Excel           | Nombre Oficial en Usuario                  |
|-----------------------|--------------------------------------------|
| Alex Mondaca          | Alex Mauricio Mondaca Cortes              |
| Eduardo Ponce         | Eduardo Enrique Ponce Castillo            |
| Eduardo Rojas Rojas   | Eduardo Rojas Andres Rojas Del Campo       |
| Emilio Santos         | Emilio Alberto Santos Castillo            |
| JOAQUIN MANRIQUEZ     | JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA       |
| Jorge Gutierrez       | Jorge Heriberto Gutierrez Silva            |
| Luis Esquivel         | Luis Ramon Esquivel Oyamadel               |
| Maiko Flores          | Maiko Ricardo Flores Maldonado             |
| Marcelo Troncoso      | Marcelo Hernan Troncoso Molina             |
| Marisol Sanchez       | Marisol De Lourdes Sanchez Roitman         |
| Matias Felipe Tapia   | Matias Felipe Felipe Tapia Valenzuela      |
| Milton Marin          | Milton Marin Blanco                        |
| Nataly Carrasco       | Nataly Andrea Carrasco Rojas               |
| Nelson Muñoz          | Nelson Antonio Muñoz Cortes                |
| Nelson Mu√±oz         | Nelson Antonio Muñoz Cortes                |
| Omar Maldonado        | Omar Antonio Maldonado Castillo            |
| Roberto Oyarzun       | Roberto Otilio Oyarzun Alvarez             |
| Victoria Hurtado      | Victoria Andrea Hurtado Olivares           |

---

## 📥 Proceso de Importación

### Paso a paso para usuarios

1. **Login** como manager en la aplicación web
2. Ir a **"Importación de Datos"**
3. Seleccionar **"💳 Saldo Crédito"**
4. Ver alert informativo:
   > "Saldo Crédito se importa directamente desde el archivo del sistema.  
   > **Nota:** Esta acción **eliminará todos los registros existentes** y los reemplazará con los nuevos datos del archivo."
5. Arrastrar o seleccionar archivo **SALDO CREDITO.xlsx**
6. Click en **"Importar y Procesar"**
7. Esperar feedback:
   - ✅ "Eliminados: 1560, Insertados: 1560, Errores: 0"
   - ❌ Si hay errores, se muestran en tabla

### Estructura esperada del Excel

**Columnas requeridas:**
- `RUT`
- `TIPO DOCUMENTO`
- `CLIENTE`
- `folio`
- `fecha_emision`
- `TOTAL FACTURA`
- `SALDO FACTURA`
- `NOMBRE VENDEDOR`

**Columnas opcionales:**
- `Deuda Cancelada`
- `Saldo a Favor Disponible`
- `idvendedor`

**Formato de fecha:** Excel date serial (convertido automáticamente)
**Formato de números:** Cualquier formato numérico (parseado con `parseNumeric()`)

### Comportamiento técnico

```javascript
// 1. Validación
if (!requiredCols.every(col => col in firstRow)) {
  return error('Columnas faltantes');
}

// 2. Transacción
BEGIN;

// 3. Borrado completo
DELETE FROM saldo_credito;
// → registrosEliminados = row_count

// 4. Inserción con normalización
for (const row of data) {
  const nombreVendFinal = await resolveVendorName(row['NOMBRE VENDEDOR']);
  INSERT INTO saldo_credito (..., nombre_vendedor) VALUES (..., nombreVendFinal);
}
// → registrosInsertados = loop_count

// 5. Commit
COMMIT;
```

**Garantía de atomicidad:** Si falla cualquier INSERT, se hace ROLLBACK completo (no quedan registros parciales).

---

## 🛠️ Mantenimiento

### Agregar un nuevo alias

**Opción 1: Via Postman**

```http
POST https://crm2-backend.onrender.com/api/vendor-aliases
Authorization: Bearer <token-manager>
Content-Type: application/json

{
  "alias": "NUEVO NOMBRE CORTO",
  "nombre_vendedor_oficial": "Nombre Oficial Completo Del Vendedor"
}
```

**Opción 2: Via SQL directo**

```sql
INSERT INTO usuario_alias (alias, nombre_vendedor_oficial)
VALUES ('NUEVO NOMBRE CORTO', 'Nombre Oficial Completo Del Vendedor');
```

### Recargar aliases en caché

El caché de aliases se actualiza automáticamente cada **5 minutos**.

Para forzar recarga inmediata:
- Reinicia el servidor backend (Render auto-restart en deploy)
- O espera 5 minutos después de modificar la tabla

### Verificar aliases cargados

```http
GET https://crm2-backend.onrender.com/api/vendor-aliases
Authorization: Bearer <token-manager>
```

---

## 🔧 Troubleshooting

### Problema: Tarjeta muestra $0 al filtrar por vendedor

**Diagnóstico:**
1. Revisa logs del backend en Render:
   ```
   [Saldo Crédito] RUT recibido: 12345678-9
   [Saldo Crédito] Nombre vendedor desde usuario: Maiko Ricardo...
   [Saldo Crédito] Nombres en saldo_credito: ['Maiko Flores', ...]
   [Saldo Crédito] Filtro aplicado: Maiko Ricardo Flores Maldonado
   [Saldo Crédito] Total calculado: 0
   ```

2. Si el nombre no coincide:
   - Agregar alias: `Maiko Flores` → `Maiko Ricardo Flores Maldonado`
   - Re-importar archivo Excel

**Solución:**
```bash
# Via Postman
POST /api/vendor-aliases
{
  "alias": "Maiko Flores",
  "nombre_vendedor_oficial": "Maiko Ricardo Flores Maldonado"
}

# Luego re-importar SALDO CREDITO.xlsx
```

---

### Problema: Importación falla con "LOAD FAILED"

**Posibles causas:**

1. **Columnas faltantes en Excel**
   - Error: `"Columnas faltantes: NOMBRE VENDEDOR"`
   - Solución: Verificar que el archivo tiene todas las columnas requeridas

2. **Error en resolución de nombres**
   - Error: typo en `vendorAlias.js` (ej: `officals` vs `officials`)
   - Solución: Verificar logs del backend, fix typo, redeploy

3. **Timeout de Render**
   - Error: 30s timeout en archivos muy grandes
   - Solución: Dividir archivo en lotes menores o aumentar timeout en Render

**Logs de debug:**
```javascript
console.log('📁 Archivo recibido:', req.file.originalname);
console.log('📊 Registros encontrados:', data.length);
console.log('🗑️  Registros eliminados:', deleteResult.rowCount);
console.log('✅ Importación completada:', insertados, 'registros');
```

---

### Problema: Encoding corrupto en nombres (Nelson Mu√±oz)

**Causa:** Archivo Excel con encoding incorrecto (Latin1 vs UTF-8)

**Solución:**
1. Agregar alias para la variante corrupta:
   ```sql
   INSERT INTO usuario_alias (alias, nombre_vendedor_oficial)
   VALUES ('Nelson Mu√±oz', 'Nelson Antonio Muñoz Cortes');
   ```

2. La normalización lo resolverá automáticamente en futuras importaciones

---

### Problema: Manager ve valor global, no filtrado

**Diagnóstico:**
1. Verificar que `vendedor_id` se envía en params:
   ```javascript
   console.log('🔄 Cargando dashboard con params:', params);
   // Debe mostrar: { vendedor_id: '12345678-9' }
   ```

2. Verificar que el RUT existe en tabla `usuario`:
   ```sql
   SELECT rut, nombre_vendedor FROM usuario WHERE rut = '12345678-9';
   ```

**Solución:**
- Si el vendedor no existe en `usuario`, agregarlo primero
- Si existe pero no tiene `nombre_vendedor`, actualizarlo:
  ```sql
  UPDATE usuario SET nombre_vendedor = 'Nombre Completo' WHERE rut = '12345678-9';
  ```

---

## 📚 Archivos Relevantes

### Backend

| Archivo | Descripción | Líneas clave |
|---------|-------------|--------------|
| `backend/src/routes/kpis.js` | Endpoint saldo-credito-total | 592-660 |
| `backend/src/routes/import.js` | Importación Excel | 1050-1202 |
| `backend/src/routes/vendorAliases.js` | CRUD aliases | 1-80 |
| `backend/src/utils/vendorAlias.js` | Normalización nombres | 1-90 |
| `backend/src/serverApp.js` | Registro de rutas | 47 |
| `backend/scripts/insert_vendor_aliases.sql` | Script SQL aliases | Completo |

### Frontend

| Archivo | Descripción | Líneas clave |
|---------|-------------|--------------|
| `frontend/src/pages/DashboardPage.js` | Tarjeta KPI | 22, 35, 75-82, 186-195 |
| `frontend/src/api.js` | Cliente API | 88-92, 369-402 |
| `frontend/src/components/ImportPanel.js` | UI importación | 32, 125-127, 250-280, 435-451 |

---

## 🚀 URLs de Producción

**Backend:** https://crm2-backend.onrender.com  
**Frontend:** https://crm2-produccion.vercel.app

**Endpoints:**
- `POST /api/users/login` - Autenticación
- `GET /api/kpis/saldo-credito-total` - KPI
- `POST /api/import/saldo-credito` - Importación
- `GET /api/vendor-aliases` - Listar aliases
- `POST /api/vendor-aliases/seed` - Cargar 18 aliases

---

## ✅ Checklist de Deployment

Cuando se despliega en nuevo ambiente:

- [ ] Verificar variables de entorno en Render:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CORS_ORIGINS`
- [ ] Ejecutar seed de aliases:
  ```bash
  POST /api/vendor-aliases/seed
  Authorization: Bearer <token-manager>
  ```
- [ ] Importar archivo inicial de Saldo Crédito
- [ ] Verificar tarjeta en Dashboard:
  - Valor global (manager sin filtro)
  - Valor filtrado (manager con vendedor)
  - Valor de cartera (vendedor)

---

## 📝 Notas Finales

- **Periodicidad recomendada:** Importar Saldo Crédito cada vez que se actualice el archivo del sistema contable
- **Backup:** Antes de importar, se puede exportar la tabla actual: `pg_dump -t saldo_credito`
- **Performance:** Con 1560 registros, la importación toma ~5 segundos
- **Escalabilidad:** El sistema soporta hasta ~10,000 registros sin cambios. Para más, considerar importación async.

---

**Última actualización:** 2 de diciembre de 2025  
**Autor:** GitHub Copilot  
**Revisión:** v1.0
