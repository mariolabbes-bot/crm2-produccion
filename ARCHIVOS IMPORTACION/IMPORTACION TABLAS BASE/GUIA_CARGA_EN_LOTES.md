# GUÍA DE CARGA MASIVA EN LOTES - CRM2
Fecha: 9 de noviembre de 2025

## 📦 ARCHIVOS DIVIDIDOS GENERADOS

Los archivos grandes han sido divididos en lotes más pequeños para facilitar la carga:

### VENTAS (77,029 registros → 8 archivos)
- ✅ carga_ventas_parte_01_de_08.sql (3.6 MB) - 10,000 registros
- ✅ carga_ventas_parte_02_de_08.sql (3.6 MB) - 10,000 registros
- ✅ carga_ventas_parte_03_de_08.sql (3.6 MB) - 10,000 registros
- ✅ carga_ventas_parte_04_de_08.sql (3.6 MB) - 10,000 registros
- ✅ carga_ventas_parte_05_de_08.sql (3.6 MB) - 10,000 registros
- ✅ carga_ventas_parte_06_de_08.sql (3.6 MB) - 10,000 registros
- ✅ carga_ventas_parte_07_de_08.sql (3.6 MB) - 10,000 registros
- ✅ carga_ventas_parte_08_de_08.sql (2.5 MB) - 7,029 registros + UPDATE

### ABONOS (40,932 registros → 5 archivos)
- ✅ carga_abonos_parte_01_de_05.sql (2.4 MB) - 10,000 registros
- ✅ carga_abonos_parte_02_de_05.sql (2.4 MB) - 10,000 registros
- ✅ carga_abonos_parte_03_de_05.sql (2.4 MB) - 10,000 registros
- ✅ carga_abonos_parte_04_de_05.sql (2.4 MB) - 10,000 registros
- ✅ carga_abonos_parte_05_de_05.sql (229 KB) - 932 registros + UPDATE

---

## 🚀 ORDEN DE EJECUCIÓN EN DBEAVER

### PASO 0: PREPARAR BASE DE DATOS (EJECUTAR PRIMERO)

**⚠️ IMPORTANTE: Hay 225 SKUs en ventas que NO están en la tabla producto**

Ejecutar este script ANTES de cargar ventas:
```
0.1 desactivar_fk_sku.sql ⏱️ ~1 segundo
```

Este script desactiva temporalmente la validación de foreign key en el campo `sku`, permitiendo cargar ventas con productos que no están en el catálogo. Después de la carga, podremos identificar y agregar estos productos.

---

### PASO 1: CARGAR VENTAS (en orden secuencial)

**IMPORTANTE**: Solo el primer archivo incluye `TRUNCATE TABLE venta CASCADE;`

```
1.1 carga_ventas_parte_01_de_08.sql ⏱️ ~1-2 min
1.2 carga_ventas_parte_02_de_08.sql ⏱️ ~1-2 min
1.3 carga_ventas_parte_03_de_08.sql ⏱️ ~1-2 min
1.4 carga_ventas_parte_04_de_08.sql ⏱️ ~1-2 min
1.5 carga_ventas_parte_05_de_08.sql ⏱️ ~1-2 min
1.6 carga_ventas_parte_06_de_08.sql ⏱️ ~1-2 min
1.7 carga_ventas_parte_07_de_08.sql ⏱️ ~1-2 min
1.8 carga_ventas_parte_08_de_08.sql ⏱️ ~1-2 min ⚠️ INCLUYE UPDATE DE VENDEDORES
```

**Tiempo total VENTAS: ~10-15 minutos**

---

### PASO 2: CARGAR ABONOS (en orden secuencial)

**IMPORTANTE**: Solo el primer archivo incluye `TRUNCATE TABLE abono CASCADE;`

```
2.1 carga_abonos_parte_01_de_05.sql ⏱️ ~1 min
2.2 carga_abonos_parte_02_de_05.sql ⏱️ ~1 min
2.3 carga_abonos_parte_03_de_05.sql ⏱️ ~1 min
2.4 carga_abonos_parte_04_de_05.sql ⏱️ ~1 min
2.5 carga_abonos_parte_05_de_05.sql ⏱️ ~1 min ⚠️ INCLUYE UPDATE DE VENDEDORES
```

**Tiempo total ABONOS: ~5 minutos**

---

### PASO 3: IDENTIFICAR Y AGREGAR PRODUCTOS FALTANTES

Después de cargar todas las ventas y abonos, ejecutar:
```
3.1 identificar_skus_faltantes.sql ⏱️ ~5 segundos
```

Este script:
- Lista los 225 SKUs que están en ventas pero no en productos
- Muestra cuántas veces se vendió cada uno
- Genera un script de INSERT para agregarlos a la tabla producto

**NOTA**: Después de ejecutar este script, revisa los resultados y decide si quieres:
- Agregar los productos faltantes a la tabla producto
- Dejarlos así (las ventas se cargaron correctamente)
- Investigar por qué estos productos no estaban en el catálogo original

---

## ⚙️ CARACTERÍSTICAS IMPORTANTES

### 🔄 TRUNCATE (solo en primera parte)
- **parte_01** de cada tipo limpia la tabla completa
- Las demás partes solo insertan datos
- No ejecutar la parte_01 dos veces sin completar el resto

### 👤 UPDATE DE VENDEDORES (solo en última parte)
- **parte_08** de VENTAS incluye: `UPDATE venta SET vendedor_cliente = ...`
- **parte_05** de ABONOS incluye: `UPDATE abono SET vendedor_cliente = ...`
- Este UPDATE asigna vendedores desde la tabla CLIENTES

### ✅ VERIFICACIONES
Cada archivo final incluye consultas de verificación:
```sql
SELECT COUNT(*) as total FROM venta;
SELECT COUNT(vendedor_cliente) as con_vendedor FROM venta;
SELECT vendedor_cliente, COUNT(*) FROM venta GROUP BY vendedor_cliente;
```

---

## 📋 CHECKLIST DE EJECUCIÓN

### Antes de empezar:
- [ ] DBeaver conectado a base de datos Neon
- [ ] Tabla usuario con 19 registros cargados
- [ ] Tabla producto con 2,697 registros cargados
- [ ] Tabla cliente con 2,919 registros cargados

### Cargar VENTAS:
- [ ] Ejecutar carga_ventas_parte_01_de_08.sql
- [ ] Ejecutar carga_ventas_parte_02_de_08.sql
- [ ] Ejecutar carga_ventas_parte_03_de_08.sql
- [ ] Ejecutar carga_ventas_parte_04_de_08.sql
- [ ] Ejecutar carga_ventas_parte_05_de_08.sql
- [ ] Ejecutar carga_ventas_parte_06_de_08.sql
- [ ] Ejecutar carga_ventas_parte_07_de_08.sql
- [ ] Ejecutar carga_ventas_parte_08_de_08.sql (incluye UPDATE)
- [ ] Verificar: `SELECT COUNT(*) FROM venta;` debe devolver 77,029

### Cargar ABONOS:
- [ ] Ejecutar carga_abonos_parte_01_de_05.sql
- [ ] Ejecutar carga_abonos_parte_02_de_05.sql
- [ ] Ejecutar carga_abonos_parte_03_de_05.sql
- [ ] Ejecutar carga_abonos_parte_04_de_05.sql
- [ ] Ejecutar carga_abonos_parte_05_de_05.sql (incluye UPDATE)
- [ ] Verificar: `SELECT COUNT(*) FROM abono;` debe devolver 40,932

---

## 🔍 CONSULTAS DE VERIFICACIÓN FINAL

Después de completar toda la carga, ejecuta estas consultas:

```sql
-- 1. Conteo general de todas las tablas
SELECT 'usuario' as tabla, COUNT(*) as registros FROM usuario
UNION ALL
SELECT 'producto', COUNT(*) FROM producto
UNION ALL
SELECT 'cliente', COUNT(*) FROM cliente
UNION ALL
SELECT 'venta', COUNT(*) FROM venta
UNION ALL
SELECT 'abono', COUNT(*) FROM abono;

-- Resultado esperado:
-- usuario:  19
-- producto: 2,697
-- cliente:  2,919
-- venta:    77,029
-- abono:    40,932
-- TOTAL:    123,596 registros

-- 2. Verificar que todas las ventas tienen vendedor asignado
SELECT 
    COUNT(*) as total_ventas,
    COUNT(vendedor_cliente) as con_vendedor,
    COUNT(*) - COUNT(vendedor_cliente) as sin_vendedor
FROM venta;

-- 3. Verificar que todos los abonos tienen vendedor asignado
SELECT 
    COUNT(*) as total_abonos,
    COUNT(vendedor_cliente) as con_vendedor,
    COUNT(*) - COUNT(vendedor_cliente) as sin_vendedor
FROM abono;

-- 4. Top 10 vendedores por volumen de ventas
SELECT 
    vendedor_cliente,
    COUNT(*) as num_ventas,
    SUM(valor_total) as total_vendido
FROM venta
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY total_vendido DESC
LIMIT 10;

-- 5. Top 10 vendedores por abonos recaudados
SELECT 
    vendedor_cliente,
    COUNT(*) as num_abonos,
    SUM(monto) as total_abonado
FROM abono
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY total_abonado DESC
LIMIT 10;

-- 6. Ventas por mes (últimos 12 meses)
SELECT 
    DATE_TRUNC('month', fecha_emision) as mes,
    COUNT(*) as num_ventas,
    SUM(valor_total) as total_mes
FROM venta
GROUP BY mes
ORDER BY mes DESC
LIMIT 12;
```

---

## ⚠️ PROBLEMAS COMUNES Y SOLUCIONES

### Problema: "Timeout al ejecutar script"
**Solución**: Los archivos están divididos en lotes pequeños, cada uno debería ejecutarse en 1-2 minutos. Si aún hay timeout, verifica la conexión a Neon.

### Problema: "Duplicate key violation"
**Solución**: Si se interrumpió una carga previa, ejecuta:
```sql
TRUNCATE TABLE venta CASCADE;
TRUNCATE TABLE abono CASCADE;
```
Y comienza de nuevo desde parte_01.

### Problema: "Foreign key constraint violation"
**Solución**: Asegúrate de haber cargado primero las tablas base:
- usuario (19 registros)
- producto (2,697 registros)
- cliente (2,919 registros)

### Problema: "Vendedores quedan NULL después del UPDATE"
**Solución**: Verifica que:
1. La tabla cliente tiene nombre_vendedor poblado
2. Los RUTs en ventas/abonos coinciden con los de cliente
3. El UPDATE se ejecutó correctamente en la última parte

---

## 📊 RESUMEN FINAL ESPERADO

Al completar toda la carga, tu base de datos debería tener:

| Tabla    | Registros | Estado                          |
|----------|----------:|---------------------------------|
| usuario  |        19 | ✅ Cargado previamente          |
| producto |     2,697 | ✅ Cargado previamente          |
| cliente  |     2,919 | ✅ Cargado previamente          |
| venta    |    77,029 | ✅ Carga masiva en 8 partes     |
| abono    |    40,932 | ✅ Carga masiva en 5 partes     |
| **TOTAL**|**123,596**| ✅ Base de datos completa       |

---

## 🎯 PRÓXIMOS PASOS

Una vez completada la carga masiva:
1. ✅ Revisar reporte de duplicados: `abonos_duplicados_reporte.csv`
2. 📋 Preparar scripts de actualización periódica (mensual)
3. 🔄 Definir proceso de importación incremental
4. 📊 Crear dashboards y reportes sobre los datos cargados
