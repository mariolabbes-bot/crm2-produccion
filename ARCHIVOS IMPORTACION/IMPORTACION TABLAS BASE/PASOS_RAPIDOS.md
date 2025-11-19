# PASOS RÁPIDOS PARA EJECUTAR LA CARGA

## ⚡ EJECUCIÓN RÁPIDA (EN ORDEN):

### 1️⃣ PREPARACIÓN (1 segundo)
```
✅ desactivar_fk_sku.sql
```

### 2️⃣ VENTAS (10-15 minutos)
```
✅ carga_ventas_parte_01_de_08.sql (incluye TRUNCATE)
✅ carga_ventas_parte_02_de_08.sql
✅ carga_ventas_parte_03_de_08.sql
✅ carga_ventas_parte_04_de_08.sql
✅ carga_ventas_parte_05_de_08.sql
✅ carga_ventas_parte_06_de_08.sql
✅ carga_ventas_parte_07_de_08.sql
✅ carga_ventas_parte_08_de_08.sql (incluye UPDATE vendedores)
```

### 3️⃣ ABONOS (5 minutos)
```
✅ carga_abonos_parte_01_de_05.sql (incluye TRUNCATE)
✅ carga_abonos_parte_02_de_05.sql
✅ carga_abonos_parte_03_de_05.sql
✅ carga_abonos_parte_04_de_05.sql
✅ carga_abonos_parte_05_de_05.sql (incluye UPDATE vendedores)
```

### 4️⃣ VERIFICACIÓN (5 segundos)
```
✅ identificar_skus_faltantes.sql
```

## 📊 RESULTADO ESPERADO:
- 77,029 ventas cargadas
- 40,932 abonos cargados
- Vendedores asignados automáticamente
- 225 SKUs faltantes identificados (opcional agregarlos)

## ⏱️ TIEMPO TOTAL: ~15-20 minutos
