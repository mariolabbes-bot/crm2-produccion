# 🎯 GUÍA FINAL - CARGA EN BLOQUES PEQUEÑOS

## ✅ SOLUCIÓN AL PROBLEMA DE MEMORIA DE DBEAVER

DBeaver tiene límite de memoria Java. He dividido todo en **bloques de 200-300 KB** que DBeaver puede manejar sin problemas.

## 📊 ESTADO ACTUAL

- **Ventas cargadas**: 9,279 registros (de 77,029)
- **Abonos cargados**: 0 registros (de 41,540)
- **Pendiente**: 67,750 ventas + 41,540 abonos = 109,290 registros

## 📁 ARCHIVOS PREPARADOS

### VENTAS (7 bloques de ~10,000 registros cada uno)
```
carga_ventas_bloque_01_de_07.sql  (200 KB)
carga_ventas_bloque_02_de_07.sql  (200 KB)
carga_ventas_bloque_03_de_07.sql  (200 KB)
carga_ventas_bloque_04_de_07.sql  (200 KB)
carga_ventas_bloque_05_de_07.sql  (200 KB)
carga_ventas_bloque_06_de_07.sql  (200 KB)
carga_ventas_bloque_07_de_07.sql  (200 KB) ← Tiene UPDATE de vendedores
```

### ABONOS (5 bloques de ~10,000 registros cada uno)
```
carga_abonos_bloque_01_de_05.sql  (200 KB) ← Tiene TRUNCATE
carga_abonos_bloque_02_de_05.sql  (200 KB)
carga_abonos_bloque_03_de_05.sql  (200 KB)
carga_abonos_bloque_04_de_05.sql  (200 KB)
carga_abonos_bloque_05_de_05.sql  (40 KB)  ← Tiene UPDATE de vendedores
```

## 🚀 PROCESO EN DBEAVER

### PASO 1: Cargar Ventas (7 archivos)

1. Abrir DBeaver
2. Conectar a la base de datos (doble clic en la conexión)
3. File → Open → `carga_ventas_bloque_01_de_07.sql`
4. **Execute SQL Script** (Ctrl+X)
5. Esperar ~2 minutos
6. Verificar resultado (debe decir cuántos registros hay)
7. **Repetir con archivos 02, 03, 04, 05, 06, 07**

⏱️ **Tiempo total**: ~14 minutos

### PASO 2: Cargar Abonos (5 archivos)

1. File → Open → `carga_abonos_bloque_01_de_05.sql`
2. **Execute SQL Script**
3. Esperar ~2 minutos
4. **Repetir con archivos 02, 03, 04, 05**

⏱️ **Tiempo total**: ~10 minutos

## ✅ VERIFICACIÓN FINAL

Después de cargar todos los bloques:

```sql
-- Verificar totales
SELECT COUNT(*) as total_ventas FROM venta;
-- Debe dar: 77,029

SELECT COUNT(*) as total_abonos FROM abono;
-- Debe dar: 41,540

-- Verificar vendedores
SELECT COUNT(*) as ventas_sin_vendedor 
FROM venta 
WHERE vendedor_cliente IS NULL;

SELECT vendedor_cliente, COUNT(*) as num_ventas
FROM venta
WHERE vendedor_cliente IS NOT NULL
GROUP BY vendedor_cliente
ORDER BY num_ventas DESC
LIMIT 10;
```

## 💡 VENTAJAS DE ESTA SOLUCIÓN

| Aspecto | Bloques Pequeños | Archivo Grande |
|---------|------------------|----------------|
| Tamaño archivo | 200 KB | 25 MB |
| Memoria DBeaver | ✅ Sin problemas | ❌ Java heap space |
| Si falla | Solo rehacer 1 bloque | Rehacer todo |
| Progreso visible | Cada 2 minutos | Solo al final |
| Ejecución | ✅ Confiable | ❌ Se interrumpe |

## ⚠️ IMPORTANTE

- **Ejecutar EN ORDEN** (01, 02, 03...)
- **NO ejecutar el mismo bloque 2 veces** (generaría duplicados)
- **NO cerrar DBeaver** mientras ejecuta un bloque
- Si hay error en un bloque, **continuar con el siguiente**

## 🐛 TROUBLESHOOTING

### Error: "duplicate key value"
- Ya ejecutaste ese bloque antes
- Solución: Continuar con el siguiente bloque

### Error: "No active connection"
- DBeaver no está conectado
- Solución: Doble clic en la conexión para conectar

### DBeaver se queda "colgado"
- Archivo demasiado grande para la memoria
- Solución: Ya dividimos en bloques pequeños, usa esos

### Error: "timeout"
- Conexión lenta o inestable
- Solución: Volver a ejecutar ese bloque

## 📋 CHECKLIST

**VENTAS:**
- [ ] Bloque 01 ejecutado
- [ ] Bloque 02 ejecutado
- [ ] Bloque 03 ejecutado
- [ ] Bloque 04 ejecutado
- [ ] Bloque 05 ejecutado
- [ ] Bloque 06 ejecutado
- [ ] Bloque 07 ejecutado (con UPDATE)
- [ ] Verificado: 77,029 registros

**ABONOS:**
- [ ] Bloque 01 ejecutado (con TRUNCATE)
- [ ] Bloque 02 ejecutado
- [ ] Bloque 03 ejecutado
- [ ] Bloque 04 ejecutado
- [ ] Bloque 05 ejecutado (con UPDATE)
- [ ] Verificado: 41,540 registros

---

**Tiempo total estimado**: ~25 minutos
**Fecha preparación**: 10 de noviembre de 2025
