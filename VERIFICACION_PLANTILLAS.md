# Verificación de Plantillas de Importación

**Fecha**: 13 de noviembre de 2025

## 📊 Comparación: Columnas DB vs Plantillas

### 🟢 TABLA VENTA

#### Columnas en Base de Datos (20 columnas):
```
1.  id (integer) - AUTO
2.  sucursal (varchar)
3.  tipo_documento (varchar)
4.  folio (varchar)
5.  fecha_emision (date)
6.  identificador (varchar)
7.  cliente (varchar)
8.  vendedor_cliente (varchar)
9.  vendedor_documento (varchar)
10. estado_sistema (varchar)
11. estado_comercial (varchar)
12. estado_sii (varchar)
13. indice (varchar)
14. sku (varchar)
15. descripcion (varchar)
16. cantidad (numeric)
17. precio (numeric)
18. valor_total (numeric)
19. litros_vendidos (numeric)
20. created_at (timestamp) - AUTO
```

#### Columnas en Plantilla Descargable (17 columnas):
```
✅ Sucursal
✅ Tipo documento
✅ Folio
✅ Fecha (mapea a fecha_emision)
✅ Identificador
✅ Cliente
✅ Vendedor cliente
✅ Vendedor documento
✅ Estado sistema
✅ Estado comercial
✅ Estado SII
✅ Indice
✅ SKU
✅ Descripcion
✅ Cantidad
✅ Precio
✅ Valor total
```

#### ❌ Columnas FALTANTES en Plantilla:
```
❌ litros_vendidos (numeric)
   - No está en la plantilla
   - Puede quedar NULL en la importación
   - ¿Es importante para el negocio?
```

#### ✅ Columnas AUTO (no necesarias en plantilla):
```
✅ id - Auto-increment
✅ created_at - Timestamp automático
```

---

### 💰 TABLA ABONO

#### Columnas en Base de Datos (19 columnas):
```
1.  id (integer) - AUTO
2.  sucursal (varchar)
3.  folio (varchar)
4.  fecha (date)
5.  identificador (varchar)
6.  cliente (varchar)
7.  vendedor_cliente (varchar)
8.  caja_operacion (varchar)
9.  usuario_ingreso (varchar)
10. tipo_pago (varchar)
11. monto (numeric)
12. monto_total (numeric)
13. monto_neto (numeric)
14. saldo_a_favor (numeric)
15. saldo_a_favor_total (numeric)
16. estado_abono (varchar)
17. identificador_abono (varchar)
18. fecha_vencimiento (date)
19. created_at (timestamp) - AUTO
```

#### Columnas en Plantilla Descargable (17 columnas):
```
✅ Sucursal
✅ Folio
✅ Fecha
✅ Identificador
✅ Cliente
✅ Vendedor cliente
✅ Caja operacion
✅ Usuario ingreso
✅ Monto total
✅ Saldo a favor
✅ Saldo a favor total
✅ Tipo pago
✅ Estado abono
✅ Identificador abono
✅ Fecha vencimiento
✅ Monto
✅ Monto neto
```

#### ✅ Todas las columnas incluidas (excepto AUTO):
```
✅ Todas las 17 columnas mapeadas correctamente
✅ id - Auto-increment (no necesario)
✅ created_at - Timestamp automático (no necesario)
```

---

## 📋 Resumen de Verificación

### ✅ PLANTILLA DE VENTAS
**Estado**: ⚠️ CASI COMPLETA (falta 1 campo)

**Campos Incluidos**: 17/18 (94%)
- ✅ Todos los campos principales incluidos
- ✅ Campos obligatorios: Folio, Tipo documento, Fecha
- ✅ Ejemplos con datos realistas

**Campo Faltante**:
- `litros_vendidos` (numeric)

**Recomendación**:
- **Opción A**: Agregar columna "Litros vendidos" a la plantilla
- **Opción B**: Dejar como está (campo quedará NULL en DB)

### ✅ PLANTILLA DE ABONOS
**Estado**: ✅ COMPLETA

**Campos Incluidos**: 17/17 (100%)
- ✅ Todos los campos incluidos
- ✅ Campos obligatorios: Folio, Fecha, Monto
- ✅ Ejemplos con datos realistas

---

## 🔍 Análisis de Detección de Columnas

### Código de Detección Automática

El importador usa detección flexible de nombres de columnas:

```javascript
// Ejemplo: Detección de Folio
const colFolio = findCol([/^Folio$/i]);

// Ejemplo: Detección de Tipo documento
const colTipoDoc = findCol([/^Tipo.*documento$/i, /^Tipo$/i]);

// Ejemplo: Detección de Fecha
const colFecha = findCol([/^Fecha$/i, /^Fecha.*emision$/i]);
```

### ✅ Ventajas:
- Flexible con variaciones de nombres
- No case-sensitive
- Acepta múltiples patrones

### ⚠️ Consideraciones:
- Usuario debe respetar nombres similares a los de la plantilla
- Si cambia mucho los nombres, puede no detectar

---

## 🎯 Decisión sobre litros_vendidos

### Pregunta: ¿Agregar "Litros vendidos" a la plantilla de ventas?

**Opción A: SI - Agregar columna**
```javascript
'Litros vendidos': 100  // Ejemplo en plantilla
```
**Pro**: Campo completo en plantilla
**Contra**: +1 columna (puede confundir si no es relevante)

**Opción B: NO - Dejar como está**
```sql
litros_vendidos NULL  -- Quedará vacío en DB
```
**Pro**: Plantilla más simple
**Contra**: Campo siempre NULL (puede causar problemas si es importante)

---

## ✅ Recomendaciones Finales

### Para Ventas:
1. **Validar** si `litros_vendidos` es importante para el negocio
2. Si es importante → Agregar a plantilla
3. Si no se usa → Dejar como está (NULL en DB)

### Para Abonos:
✅ **Plantilla perfecta** - lista para usar

### Testing:
1. Descargar plantillas actuales
2. Llenar con datos de oct-nov 2025
3. Importar y verificar
4. Si falta `litros_vendidos` y es necesario → Agregar en v2

---

## 📝 Campos Obligatorios vs Opcionales

### VENTAS (Mínimos obligatorios):
```
OBLIGATORIOS:
- Folio
- Tipo documento  
- Fecha

OPCIONALES (pero recomendados):
- Identificador (para vincular cliente)
- Vendedor cliente (para filtros por vendedor)
- Valor total (para KPIs)
```

### ABONOS (Mínimos obligatorios):
```
OBLIGATORIOS:
- Folio
- Fecha
- Monto

OPCIONALES (pero recomendados):
- Identificador (para vincular cliente)
- Vendedor cliente (para filtros por vendedor)
```

---

## 🚀 Conclusión

**VENTAS**: ⚠️ Falta `litros_vendidos` (decidir si agregar)  
**ABONOS**: ✅ Plantilla completa y lista

**Decisión requerida**: 
¿Agregamos "Litros vendidos" a la plantilla de ventas?
- **SI**: Commit rápido (5 min) + redeploy
- **NO**: Usar plantilla actual y proceder a importar

**¿Qué prefieres hacer?**
