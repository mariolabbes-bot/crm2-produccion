# Guía: Usar Importador de Ventas y Abonos

**Fecha**: 13 de noviembre de 2025  
**URL**: https://crm2-produccion.vercel.app/import-data

## ✅ Estado del Importador

### Frontend
- **Componente**: `ImportPanel.js` ✅ Completo
- **Ruta**: `/import-data` ✅ Integrada
- **Acceso**: Solo usuarios MANAGER
- **Features**:
  - Upload por drag & drop
  - Descarga de plantillas Excel
  - Selección entre Ventas y Abonos
  - Progress bar durante upload
  - Reporte de duplicados y faltantes
  - Descarga de informes de pendientes

### Backend
- **Endpoint Ventas**: `POST /api/import/ventas` ✅ Funcional
- **Endpoint Abonos**: `POST /api/import/abonos` ✅ Funcional
- **Validaciones**:
  - ✅ Detección automática de columnas (flexible)
  - ✅ Verificación de duplicados (folio + tipo_documento)
  - ✅ Validación de clientes y vendedores existentes
  - ✅ Parseo de fechas (Excel serial, DD/MM/YYYY, YYYY-MM-DD)
  - ✅ Parseo de números con decimales
  - ✅ Generación de reportes de pendientes

## 📋 Columnas Requeridas

### Para VENTAS (mínimo requerido)
```
Folio | Tipo documento | Fecha
```

### Para VENTAS (recomendado)
```
Folio | Tipo documento | Fecha | Sucursal | Identificador | Cliente | 
Vendedor cliente | Vendedor documento | Estado sistema | Estado comercial | 
Estado SII | Indice | SKU | Descripcion | Cantidad | Precio | Valor total
```

### Para ABONOS (mínimo requerido)
```
Folio | Fecha abono | Monto
```

### Para ABONOS (recomendado)
```
Folio | Fecha abono | Monto | RUT cliente | Cliente | Vendedor cliente |
Medio pago | Tipo documento origen | Folio origen | Banco | N° cuenta |
N° operacion | Observaciones
```

## 🎯 Cómo Usar el Importador

### Paso 1: Acceder al Importador
1. Ir a: https://crm2-produccion.vercel.app
2. Login con credenciales de MANAGER:
   - Email: `mario.labbe@lubricar-insa.cl`
   - Password: `manager123`
3. Navegar a: https://crm2-produccion.vercel.app/import-data
   - O agregar botón en el dashboard/sidebar

### Paso 2: Descargar Plantilla
1. Seleccionar tipo: **Ventas** o **Abonos**
2. Click en "Descargar Plantilla de Ventas/Abonos"
3. Abrir archivo Excel descargado
4. Revisar columnas y ejemplo

### Paso 3: Preparar Datos
1. **Copiar datos** desde tu fuente (ERP, sistema contable, etc.)
2. **Pegar en plantilla** Excel descargada
3. **Verificar**:
   - Fechas en formato correcto (DD/MM/YYYY o YYYY-MM-DD)
   - Números sin símbolos de moneda
   - RUTs con formato: 12345678-9
   - Folios sin duplicados

### Paso 4: Importar
1. Arrastrar archivo Excel al área de drop
   - O hacer click y seleccionar archivo
2. Click en **"Subir y Procesar"**
3. **Esperar**:
   - Progress bar mostrará avance
   - Puede tardar 1-2 minutos para archivos grandes

### Paso 5: Revisar Resultados
El sistema mostrará:

#### ✅ Registros Exitosos
```
✓ 1,234 ventas importadas correctamente
✓ 567 abonos importados correctamente
```

#### ⚠️ Duplicados (no se importan)
```
⚠ 45 ventas duplicadas (folio + tipo_documento ya existen)
```

#### ❌ Faltantes (se crea reporte)
```
❌ 12 vendedores no encontrados
❌ 8 clientes no encontrados

📥 Descargar Informe de Pendientes
```

### Paso 6: Resolver Pendientes (si hay)
1. **Descargar informe** de pendientes (Excel)
2. **Crear clientes/vendedores** faltantes en el sistema
3. **Re-importar** las filas pendientes

## 🔧 Características Técnicas

### Detección Automática de Columnas
El sistema busca columnas con nombres similares:
- **Fecha**: `Fecha`, `Fecha emision`, etc.
- **Folio**: `Folio`, `Nro documento`, etc.
- **Cliente**: `Cliente`, `Identificador`, `RUT`, etc.
- **Vendedor**: `Vendedor cliente`, `Alias vendedor`, etc.

### Parseo Inteligente
- **Fechas Excel**: Convierte números seriales (44927 → 2023-01-15)
- **Fechas texto**: 15/01/2023 → 2023-01-15
- **Números**: Acepta decimales con punto o coma
- **RUTs**: Valida formato 12345678-9

### Validaciones
1. **Duplicados**: Verifica `tipo_documento + folio` único
2. **FKs**: Verifica que clientes y vendedores existan
3. **Formato**: Valida fechas, números, RUTs

### Performance
- **Batch inserts**: 500 registros por lote
- **Transacciones**: Rollback automático si hay error
- **Límite**: 50MB por archivo
- **Tiempo**: ~1-2 segundos por cada 1,000 registros

## 📊 Testing del Importador

### ✅ Tests Recomendados

1. **Test de Plantilla**
   ```bash
   # Descargar plantilla de ventas
   # Descargar plantilla de abonos
   # Verificar que tengan datos de ejemplo
   ```

2. **Test de Ventas (archivo pequeño)**
   ```bash
   # Crear Excel con 10 ventas de oct-nov 2024
   # Incluir columnas: Folio, Tipo documento, Fecha, Cliente, Vendedor, Valor total
   # Importar y verificar resultado
   ```

3. **Test de Abonos (archivo pequeño)**
   ```bash
   # Crear Excel con 10 abonos de oct-nov 2024
   # Incluir columnas: Folio, Fecha abono, Monto, Cliente
   # Importar y verificar resultado
   ```

4. **Test de Duplicados**
   ```bash
   # Importar mismo archivo 2 veces
   # Verificar que segunda importación detecte duplicados
   ```

5. **Test de Faltantes**
   ```bash
   # Crear Excel con vendedor inexistente
   # Importar y verificar que genere informe de pendientes
   ```

## 🎯 Plan de Carga de Datos Actuales

### Opción A: Importar Mes por Mes (Recomendado)
```
1. Preparar ventas octubre 2024 → Importar
2. Preparar abonos octubre 2024 → Importar
3. Validar datos octubre en dashboard
4. Repetir para nov 2024, dic 2024, ..., nov 2025
```

**Ventaja**: Control detallado, fácil detectar errores

### Opción B: Importar Todo de Una Vez
```
1. Preparar archivo con ventas oct 2024 - nov 2025 (14 meses)
2. Preparar archivo con abonos oct 2024 - nov 2025 (14 meses)
3. Importar ambos
4. Validar datos en dashboard
```

**Ventaja**: Rápido, menos pasos

### Opción C: Importar Últimos 3 Meses (Testing Rápido)
```
1. Preparar ventas sep-oct-nov 2024
2. Preparar abonos sep-oct-nov 2024
3. Importar
4. Probar dashboard con datos recientes
```

**Ventaja**: Testing rápido antes de carga completa

## 🚀 Próximos Pasos

### 1. Agregar Acceso al Importador en UI
Actualmente la ruta `/import-data` existe pero no hay botón visible. Opciones:

**A) Agregar en Sidebar** (Recomendado)
```javascript
// En Sidebar.js, agregar:
<ListItemButton 
  component={Link}
  to="/import-data"
  selected={location.pathname === '/import-data'}
>
  <ListItemIcon><UploadFileIcon /></ListItemIcon>
  <ListItemText primary="Importar Datos" />
</ListItemButton>
```

**B) Agregar en Dashboard** (Alternativa)
```javascript
// En DashboardPage.js, agregar botón:
<Button 
  startIcon={<UploadIcon />}
  onClick={() => navigate('/import-data')}
>
  Importar Datos
</Button>
```

### 2. Preparar Archivos de Datos
¿Dónde están los datos actuales?
- Excel del sistema contable
- Exportación de ERP
- Base de datos legacy
- Archivos CSV

### 3. Ejecutar Importación
1. Abrir importador
2. Subir archivo de ventas
3. Revisar resultado
4. Subir archivo de abonos
5. Revisar resultado

### 4. Validar en Dashboard
1. Ir a dashboard
2. Verificar KPIs muestran datos > 0
3. Verificar gráficos muestran evolución correcta
4. Verificar fechas actuales (nov 2025)

## 📝 Notas Importantes

### Formato de Fechas
El importador acepta:
- `2024-11-13` (ISO)
- `13/11/2024` (DD/MM/YYYY)
- `44927` (Excel serial number)

### RUTs de Clientes
Deben existir en la tabla `cliente` antes de importar ventas/abonos.
Si no existen, aparecerán en el informe de pendientes.

### Alias de Vendedores
Deben existir en la tabla `usuario` con `rol = 'vendedor'`.
Si no existen, aparecerán en el informe de pendientes.

### Duplicados
El sistema NO permite duplicados de:
- Ventas: `tipo_documento + folio`
- Abonos: `folio`

Si intentas reimportar, esos registros se saltarán.

---

**¿Quieres que te ayude a:**
1. Agregar el botón de importador al Sidebar/Dashboard
2. Preparar un archivo de prueba con datos de ejemplo
3. Ejecutar una importación de testing
4. Revisar tus archivos de datos actuales

**Indica qué prefieres hacer primero.** 🚀
