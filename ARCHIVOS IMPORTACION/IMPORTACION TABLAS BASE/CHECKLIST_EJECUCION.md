# ✅ CHECKLIST DE EJECUCIÓN - CARGA MASIVA CRM2
Fecha: 9 de noviembre de 2025

## 📋 ESTADO DE EJECUCIÓN

### PASO 0: PREPARACIÓN
- [ ] **desactivar_fk_sku.sql** ⏱️ 1 seg
  - Elimina constraint FK en SKU
  - DEBE ejecutarse ANTES de cargar ventas

---

### PASO 1: CARGA DE VENTAS (77,029 registros)

- [ ] **carga_ventas_parte_01_de_08.sql** ⏱️ 1-2 min
  - Incluye: TRUNCATE TABLE venta CASCADE
  - Registros: 1 - 10,000

- [ ] **carga_ventas_parte_02_de_08.sql** ⏱️ 1-2 min
  - Registros: 10,001 - 20,000

- [ ] **carga_ventas_parte_03_de_08.sql** ⏱️ 1-2 min
  - Registros: 20,001 - 30,000

- [ ] **carga_ventas_parte_04_de_08.sql** ⏱️ 1-2 min
  - Registros: 30,001 - 40,000

- [ ] **carga_ventas_parte_05_de_08.sql** ⏱️ 1-2 min
  - Registros: 40,001 - 50,000

- [ ] **carga_ventas_parte_06_de_08.sql** ⏱️ 1-2 min
  - Registros: 50,001 - 60,000

- [ ] **carga_ventas_parte_07_de_08.sql** ⏱️ 1-2 min
  - Registros: 60,001 - 70,000

- [ ] **carga_ventas_parte_08_de_08.sql** ⏱️ 1-2 min ⭐
  - Registros: 70,001 - 77,029
  - Incluye: UPDATE vendedores desde tabla CLIENTES
  - Incluye: Consultas de verificación

**Verificación VENTAS:**
```sql
SELECT COUNT(*) FROM venta; 
-- Debe devolver: 77,029
```

---

### PASO 2: CARGA DE ABONOS (40,932 registros)

- [ ] **carga_abonos_parte_01_de_05.sql** ⏱️ 1 min
  - Incluye: TRUNCATE TABLE abono CASCADE
  - Registros: 1 - 10,000

- [ ] **carga_abonos_parte_02_de_05.sql** ⏱️ 1 min
  - Registros: 10,001 - 20,000

- [ ] **carga_abonos_parte_03_de_05.sql** ⏱️ 1 min
  - Registros: 20,001 - 30,000

- [ ] **carga_abonos_parte_04_de_05.sql** ⏱️ 1 min
  - Registros: 30,001 - 40,000

- [ ] **carga_abonos_parte_05_de_05.sql** ⏱️ 1 min ⭐
  - Registros: 40,001 - 40,932
  - Incluye: UPDATE vendedores desde tabla CLIENTES
  - Incluye: Consultas de verificación

**Verificación ABONOS:**
```sql
SELECT COUNT(*) FROM abono;
-- Debe devolver: 40,932
```

---

### PASO 3: IDENTIFICACIÓN DE PRODUCTOS FALTANTES

- [ ] **identificar_skus_faltantes.sql** ⏱️ 5 seg
  - Lista los 225 SKUs vendidos que no están en productos
  - Genera script para agregarlos (opcional)

---

## 📊 VERIFICACIÓN FINAL

- [ ] Ejecutar consultas de verificación completas:

```sql
-- 1. Conteo general
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
-- TOTAL:    123,596

-- 2. Verificar vendedores asignados en VENTAS
SELECT 
    COUNT(*) as total,
    COUNT(vendedor_cliente) as con_vendedor,
    COUNT(*) - COUNT(vendedor_cliente) as sin_vendedor
FROM venta;

-- 3. Verificar vendedores asignados en ABONOS
SELECT 
    COUNT(*) as total,
    COUNT(vendedor_cliente) as con_vendedor,
    COUNT(*) - COUNT(vendedor_cliente) as sin_vendedor
FROM abono;
```

---

## ⏱️ TIEMPO TOTAL ESTIMADO: 15-20 minutos

---

## 🎯 RESULTADO ESPERADO:

✅ 123,596 registros totales cargados
✅ Vendedores asignados automáticamente desde tabla CLIENTES
✅ 225 SKUs faltantes identificados para revisión
✅ Base de datos histórica completa y lista para usar

---

## 📝 NOTAS DE EJECUCIÓN:

**Hora de inicio:** __:__ AM/PM
**Hora de fin:** __:__ AM/PM
**Tiempo total:** ____ minutos

**Problemas encontrados:**
- [ ] Ninguno
- [ ] Timeouts
- [ ] Errores de FK
- [ ] Otros: _______________

**Acciones pendientes:**
- [ ] Revisar los 225 SKUs faltantes
- [ ] Agregar productos faltantes al catálogo
- [ ] Preparar actualización periódica mensual
- [ ] Crear reportes sobre datos cargados
