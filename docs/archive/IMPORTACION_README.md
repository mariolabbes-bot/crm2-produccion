# 📊 Sistema de Importación Periódica - CRM2

## Descripción General

Sistema completo para importar datos periódicos de ventas y abonos desde archivos Excel, con validación automática de duplicados y generación de informes de referencias faltantes.

## Características Principales

### ✅ Validación de Duplicados
- **Ventas**: Se valida por combinación única de `Tipo de Documento + Folio`
- **Abonos**: Se valida por `Folio` único

### ⚠️ Control de Referencias Faltantes
- Detecta automáticamente vendedores no registrados en el sistema
- Detecta automáticamente clientes no registrados en el sistema
- Genera informe Excel descargable con todas las referencias faltantes
- Permite corregir y reintentar la importación

### 📄 Plantillas Descargables
- Plantilla Excel para ventas con estructura correcta
- Plantilla Excel para abonos con estructura correcta
- Las plantillas incluyen todas las columnas requeridas

## Acceso al Sistema

### Credenciales de Manager
- **Email**: manager@crm.com
- **Contraseña**: manager123

### Navegación
1. Iniciar sesión con cuenta de manager
2. En el Dashboard, hacer clic en el botón **"📊 Importar Datos"** (esquina superior derecha)
3. Se abrirá el panel de importación

## Flujo de Uso

### Paso 1: Seleccionar Tipo de Datos
- Hacer clic en **"Ventas"** o **"Abonos"** según el tipo de datos a importar

### Paso 2: Descargar Plantilla
- Hacer clic en **"Descargar Plantilla de Ventas"** o **"Descargar Plantilla de Abonos"**
- Se descargará un archivo Excel con la estructura correcta
- Completar la plantilla con los datos a importar

### Paso 3: Subir Archivo
- **Arrastrar y soltar** el archivo Excel en la zona de carga (drag & drop)
- O hacer **clic en la zona** para seleccionar archivo desde el explorador
- Formatos soportados: `.xlsx`, `.xls`
- Tamaño máximo: 50MB

### Paso 4: Procesar Importación
- Hacer clic en **"Importar y Procesar"**
- El sistema procesará el archivo y mostrará resultados en tiempo real

## Interpretación de Resultados

### ✅ Caso Exitoso (Todo OK)
```
✓ Listo para importar
100 filas procesadas

Para importar: 95
Duplicados: 5
```
- Los registros se importaron correctamente
- Los duplicados fueron ignorados automáticamente

### ⚠️ Caso con Referencias Faltantes
```
⚠ Atención: Hay pendientes
100 filas procesadas

Para importar: 0
Duplicados: 5

Referencias Faltantes:
- 3 Vendedor(es) no encontrado(s)
- 8 Cliente(s) no encontrado(s)
```

**Acciones a tomar:**
1. Hacer clic en **"Descargar Informe de Pendientes"**
2. Abrir el Excel descargado
3. Registrar los vendedores/clientes faltantes en el CRM:
   - Vendedores: Crear cuentas en "Administrar Usuarios"
   - Clientes: Registrar en la sección de clientes
4. **Volver a subir el mismo archivo Excel**
5. Esta vez se importarán todos los registros correctamente

## Estructura de las Plantillas

### Plantilla de Ventas
Columnas requeridas:
- **Folio**: Número de documento (ej: 12345)
- **Identificador**: Tipo de documento (ej: Factura, Boleta, Nota de Crédito)
- **Fecha**: Formato DD-MM-YYYY (ej: 15-03-2024)
- **Cliente**: Nombre completo del cliente
- **Vendedor**: Nombre completo del vendedor
- **Cantidad**: Cantidad de productos/servicios
- **Precio**: Monto total de la venta

### Plantilla de Abonos
Columnas requeridas:
- **Folio**: Número único del abono (ej: 98765)
- **Fecha**: Formato DD-MM-YYYY (ej: 20-03-2024)
- **Cliente**: Nombre completo del cliente
- **Monto**: Monto del abono
- **Tipo de pago**: Efectivo, Transferencia, Cheque, etc.
- **Vendedor**: Nombre completo del vendedor

## Detección Inteligente de Columnas

El sistema detecta automáticamente las columnas del Excel aunque:
- Tengan nombres ligeramente diferentes (ej: "FOLIO", "Folio", "folio")
- Estén en diferente orden
- Tengan espacios o caracteres especiales

### Mapeo de Columnas para Ventas:
- Folio: `folio`, `nro`, `numero`, `n°`, `#`
- Tipo Doc: `identificador`, `tipo`, `tipo_documento`, `tipodoc`
- Fecha: `fecha`, `fecha_emision`, `date`
- Cliente: `cliente`, `razon_social`, `rut_cliente`
- Vendedor: `vendedor`, `seller`
- Cantidad: `cantidad`, `qty`, `units`
- Precio: `precio`, `monto`, `total`, `amount`

### Mapeo de Columnas para Abonos:
- Folio: `folio`, `nro`, `numero`
- Fecha: `fecha`, `fecha_pago`, `date`
- Cliente: `cliente`, `razon_social`
- Monto: `monto`, `pago`, `amount`
- Tipo Pago: `tipo_pago`, `forma_pago`, `metodo`
- Vendedor: `vendedor`, `seller`

## Validaciones Automáticas

### Durante la Importación:
1. **Validación de duplicados**: Compara con registros existentes en BD
2. **Validación de vendedores**: Busca en tabla de usuarios (rol: vendedor)
3. **Validación de clientes**: Busca en tabla de clientes por nombre
4. **Normalización de texto**: Convierte a minúsculas y elimina acentos para mejores coincidencias

### Mapeo Inteligente de Vendedores:
El sistema utiliza mapeo de alias para resolver variaciones de nombres:
- "Juan P" → "Juan Pérez"
- "Maria G" → "María González"
- Los mapeos están en: `backend/vendor_alias_map.json`

## Ubicación de Archivos

### Archivos Temporales:
- `backend/uploads/temp/`: Archivos Excel subidos (se eliminan tras procesamiento)

### Informes de Pendientes:
- `backend/uploads/reports/`: Informes Excel de referencias faltantes
- Formato: `pendientes_ventas_TIMESTAMP.xlsx` o `pendientes_abonos_TIMESTAMP.xlsx`

## API Endpoints

### POST `/api/import/ventas`
Importa datos de ventas desde Excel.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `file` (archivo Excel)

**Response:**
```json
{
  "success": true,
  "totalRows": 100,
  "toImport": 95,
  "duplicates": 5,
  "canProceed": true,
  "missingVendors": [],
  "missingClients": [],
  "duplicatesList": [...]
}
```

### POST `/api/import/abonos`
Importa datos de abonos desde Excel.

**Request/Response:** Similar a `/ventas`

### GET `/api/import/plantilla/ventas`
Descarga plantilla Excel para ventas.

### GET `/api/import/plantilla/abonos`
Descarga plantilla Excel para abonos.

### GET `/api/import/download-report/:filename`
Descarga informe de referencias faltantes.

## Solución de Problemas

### Error: "Solo se permiten archivos Excel"
- Verificar que el archivo tenga extensión `.xlsx` o `.xls`

### Error: "Columnas requeridas no encontradas"
- Descargar la plantilla oficial del sistema
- Verificar que todas las columnas estén presentes
- No cambiar los nombres de las columnas principales

### Error: "Vendedor no encontrado: [nombre]"
- Registrar al vendedor en "Administrar Usuarios" con rol "vendedor"
- El nombre debe coincidir exactamente (el sistema normaliza automáticamente)

### Error: "Cliente no encontrado: [nombre]"
- Registrar al cliente en la sección de clientes
- El nombre debe coincidir con el RUT o nombre exacto

### Los registros no aparecen después de importar
- Verificar que el rango de fechas del dashboard incluya las fechas importadas
- Refrescar el navegador (F5)
- Verificar que no hayan sido marcados como duplicados

## Mejores Prácticas

1. **Siempre descargar la plantilla oficial** antes de preparar los datos
2. **Importar en lotes pequeños** primero para verificar el formato
3. **Mantener actualizado el catálogo** de vendedores y clientes
4. **Guardar los informes de pendientes** para auditoría
5. **Verificar duplicados** antes de intentar reimportar
6. **Usar nombres consistentes** para vendedores y clientes

## Logs y Auditoría

Todos los intentos de importación generan logs en:
- **Backend console**: Muestra errores y warnings en tiempo real
- **Informes Excel**: Almacenan referencias faltantes para revisión posterior
- **Base de datos**: Los registros importados incluyen timestamp de creación

## Próximas Mejoras

- [ ] Tabla de historial de importaciones en BD
- [ ] Dashboard de estadísticas de importaciones
- [ ] Validación de formatos de fecha más flexible
- [ ] Importación programada automática desde fuentes externas
- [ ] Notificaciones por email cuando hay referencias faltantes

---

**Última actualización**: Marzo 2024  
**Versión**: 1.0.0
