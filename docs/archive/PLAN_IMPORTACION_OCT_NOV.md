# Plan de Importación de Datos - Oct-Nov 2025

**Fecha**: 13 de noviembre de 2025  
**Deploy en curso**: Commit f0ff135 (texto blanco en Sidebar)

## 📊 Estado Actual de Datos

### Datos Existentes
- **Ventas**: 77,017 registros
- **Abonos**: 30,230 registros
- **Período**: 2024-01-02 al 2025-09-30 (21 meses)

### Datos Faltantes
- **Octubre 2025**: 1-31 (completo)
- **Noviembre 2025**: 1-13 (al día de hoy)

## 🎯 Pasos para Importar Datos

### 1. Verificar Deploy (2-3 minutos)
Una vez que Vercel complete el rebuild:

```bash
# Abrir dashboard:
https://crm2-produccion.vercel.app

# Login:
Email: mario.labbe@lubricar-insa.cl
Password: manager123

# Verificar:
✅ Sidebar con texto BLANCO (buen contraste)
✅ Botón "Importar Datos" visible en el menú
✅ Click en "Importar Datos"
```

### 2. Descargar Plantillas
En la página de importación:

**Para Ventas**:
```
1. Seleccionar tipo: VENTAS
2. Click "Descargar Plantilla de Ventas"
3. Abrir Excel descargado
4. Revisar columnas requeridas
```

**Para Abonos**:
```
1. Seleccionar tipo: ABONOS
2. Click "Descargar Plantilla de Abonos"
3. Abrir Excel descargado
4. Revisar columnas requeridas
```

### 3. Formato de Datos Requerido

#### VENTAS (Columnas Mínimas)
```
Folio | Tipo documento | Fecha | Valor total
```

#### VENTAS (Columnas Recomendadas)
```
Folio | Tipo documento | Fecha | Sucursal | Identificador | Cliente | 
Vendedor cliente | Estado sistema | Estado comercial | Estado SII | 
SKU | Descripcion | Cantidad | Precio | Valor total
```

#### ABONOS (Columnas Mínimas)
```
Folio | Fecha | Monto
```

#### ABONOS (Columnas Recomendadas)
```
Folio | Fecha | Monto | RUT cliente | Cliente | Vendedor cliente |
Medio pago | Tipo documento origen | Folio origen
```

### 4. Preparar Archivos

**Opción A: Tienes archivos Excel listos**
```
1. Abrir archivo de ventas oct-nov 2025
2. Verificar que tenga las columnas requeridas
3. Verificar fechas: 2025-10-01 al 2025-11-13
4. Verificar que NO haya duplicados de folio
5. Guardar como ventas_oct_nov_2025.xlsx
```

**Opción B: Necesitas extraer desde sistema**
```
1. Exportar ventas desde ERP/sistema contable
2. Filtrar fechas: 2025-10-01 al 2025-11-13
3. Mapear columnas al formato de la plantilla
4. Copiar datos a plantilla descargada
5. Guardar
```

**Opción C: Crear datos de prueba (para testing)**
```
1. Usar plantilla descargada
2. Crear 10-20 ventas de ejemplo
3. Fechas variadas en oct-nov 2025
4. Clientes y vendedores existentes
5. Valores realistas
```

### 5. Ejecutar Importación

#### VENTAS
```
1. Ir a: /import-data
2. Seleccionar tipo: VENTAS
3. Arrastrar archivo ventas_oct_nov_2025.xlsx
4. Click "Subir y Procesar"
5. Esperar resultado (1-2 minutos)
6. Revisar:
   - ✅ Registros importados exitosamente
   - ⚠️ Duplicados detectados (no se importan)
   - ❌ Clientes/vendedores no encontrados
7. Si hay pendientes: descargar informe y resolver
```

#### ABONOS
```
1. Seleccionar tipo: ABONOS
2. Arrastrar archivo abonos_oct_nov_2025.xlsx
3. Click "Subir y Procesar"
4. Esperar resultado (1-2 minutos)
5. Revisar resultado similar a ventas
6. Resolver pendientes si los hay
```

### 6. Validar Importación

Después de importar, verificar en el dashboard:

```bash
# Ir al dashboard principal:
https://crm2-produccion.vercel.app

# Verificar KPIs:
✅ Ventas del Mes > 0 (noviembre 2025)
✅ Abonos del Mes > 0 (noviembre 2025)
✅ Clientes Activos > 0
✅ Productos Vendidos > 0

# Verificar Gráficos:
✅ Evolución Mensual muestra oct-nov 2025
✅ Ventas por Familia incluye datos recientes
✅ No hay errores en consola (F12)
```

## 🚨 Problemas Comunes y Soluciones

### Problema 1: Duplicados
**Mensaje**: "45 ventas duplicadas (folio + tipo_documento ya existen)"

**Causa**: Intentaste reimportar ventas que ya existen

**Solución**: 
- Los duplicados se saltan automáticamente
- Solo se importan registros nuevos
- Revisa que los folios sean únicos

### Problema 2: Clientes No Encontrados
**Mensaje**: "12 clientes no encontrados"

**Causa**: Los RUTs de clientes no existen en tabla `cliente`

**Solución**:
1. Descargar informe de pendientes
2. Ver lista de clientes faltantes
3. Crearlos en el sistema antes de reimportar
4. O usar RUTs de clientes existentes

### Problema 3: Vendedores No Encontrados
**Mensaje**: "5 vendedores no encontrados"

**Causa**: Los alias de vendedores no existen en tabla `usuario`

**Solución**:
1. Descargar informe de pendientes
2. Ver lista de vendedores faltantes
3. Crearlos en el sistema
4. O usar alias de vendedores existentes

### Problema 4: Fechas Incorrectas
**Mensaje**: Error al procesar fechas

**Causa**: Formato de fecha no reconocido

**Solución**:
Usa uno de estos formatos:
- `2025-11-13` (ISO, recomendado)
- `13/11/2025` (DD/MM/YYYY)
- Número serial de Excel (se convierte automáticamente)

### Problema 5: Archivo Muy Grande
**Mensaje**: "File too large"

**Causa**: Archivo supera 50MB

**Solución**:
1. Dividir en archivos más pequeños
2. Importar por mes: oct_2025.xlsx, nov_2025.xlsx
3. Cada archivo < 50MB

## 📝 Checklist de Importación

### Pre-importación
- [ ] Deploy de Vercel completado
- [ ] Sidebar con texto blanco visible
- [ ] Botón "Importar Datos" accesible
- [ ] Plantillas descargadas
- [ ] Archivos de datos preparados
- [ ] Fechas verificadas (oct-nov 2025)
- [ ] Sin duplicados de folio

### Importación de Ventas
- [ ] Archivo ventas_oct_nov_2025.xlsx listo
- [ ] Importación ejecutada
- [ ] Resultado: X registros importados
- [ ] Sin errores críticos
- [ ] Pendientes resueltos (si los hay)

### Importación de Abonos
- [ ] Archivo abonos_oct_nov_2025.xlsx listo
- [ ] Importación ejecutada
- [ ] Resultado: X registros importados
- [ ] Sin errores críticos
- [ ] Pendientes resueltos (si los hay)

### Post-importación
- [ ] Dashboard muestra datos actualizados
- [ ] KPIs > 0
- [ ] Gráficos incluyen oct-nov 2025
- [ ] Sin errores en consola
- [ ] Testing completo exitoso

## 🎯 Resultado Esperado Final

Una vez completada la importación:

```
📊 Datos en el Sistema:
- Ventas: 77,017 + ~2,000 nuevas = ~79,000 total
- Abonos: 30,230 + ~800 nuevos = ~31,000 total
- Período: 2024-01-02 al 2025-11-13 (22 meses completos)

🎉 Dashboard:
- KPIs actualizados con datos de noviembre 2025
- Gráficos muestran evolución completa hasta hoy
- Todas las métricas reflejan situación actual
- Sistema listo para uso en producción
```

## 📞 Siguiente Acción

**AHORA**: 
- Esperar 2-3 minutos para que Vercel complete el rebuild
- Verificar que Sidebar tenga texto blanco
- Confirmar que botón "Importar Datos" es visible

**DESPUÉS**:
- ¿Tienes los archivos de ventas/abonos de oct-nov 2025 listos?
- ¿Necesitas ayuda para preparar los archivos?
- ¿Procedo a guiarte en la importación paso a paso?

---

**Deploy actual**: f0ff135 - Texto blanco en Sidebar  
**Status**: ⏳ Esperando rebuild de Vercel (2-3 min)
