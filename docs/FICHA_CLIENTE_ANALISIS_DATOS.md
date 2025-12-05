# 📊 ANÁLISIS FICHA CLIENTE - Datos Disponibles en BD

## 🎯 ALCANCE PROPUESTO

**Objetivo:** Ficha de cliente para uso **cotidiano** de Vendedor + Gerente de Ventas.
**Datos:** Solo lo que ya existe en BD (sin nuevas importaciones).
**Complejidad:** MVP funcional + extensible.

---

## 📦 DATOS DISPONIBLES ACTUALMENTE

### **Tabla CLIENTE**
```
Campos disponibles:
✅ rut                  (PK)
✅ nombre               (nombre del cliente)
✅ email                (contacto)
✅ telefono             (contacto)
✅ vendedor_alias       (vendedor asignado)
✅ ciudad               (ubicación)
✅ comuna               (ubicación)
✅ created_at           (fecha de alta)
✅ updated_at           (fecha última actualización)
```

### **Tabla VENTA**
```
Campos relevantes para ficha cliente:
✅ cliente              (nombre cliente)
✅ vendedor_id          (vendedor que hizo la venta)
✅ fecha_emision        (fecha de la venta)
✅ valor_total          (monto de la venta)
✅ folio                (número documento)
✅ tipo_documento       (FAC, BOL, NC, etc)
✅ sku                  (producto código)
✅ descripcion          (nombre producto)
✅ cantidad             (unidades)
✅ precio               (precio unitario)

Períodos de análisis sugeridos:
- Mes actual vs 3 meses anteriores
- Últimos 6 meses (por producto)
```

### **Tabla ABONO**
```
Campos relevantes:
✅ cliente              (nombre cliente)
✅ fecha_abono          (fecha del pago)
✅ monto                (cantidad pagada)

Análisis posible:
- Total abonos por cliente
- Últimos abonos registrados
- Diferencia: Deuda - Abonos
```

### **Tabla SALDO_CREDITO** (CREDITO)
```
Campos relevantes:
✅ cliente              (nombre cliente)
✅ deuda                (monto adeudado)
✅ limite_credito       (si existe)
✅ created_at           (última carga de datos)

Cálculos posibles:
- Deuda total por cliente
- % de utilización del crédito
- Documentos vencidos (si tenemos fechas)
```

---

## 📋 FICHA CLIENTE - ESTRUCTURA PROPUESTA

### **HEADER (Información General)**
```
┌──────────────────────────────────────────────┐
│ Cliente: [NOMBRE]                            │
│ RUT: [RUT] | Email: [EMAIL] | Tel: [TEL]   │
│ Vendedor: [NOMBRE_VENDEDOR] | Ubicación: XX │
│ Última actualización: [FECHA]                │
└──────────────────────────────────────────────┘
```

**Datos a mostrar:** De tabla CLIENTE (básico)

---

### **TAB 1: DEUDA** 
**Para: Vendedor (saber si puede comprar) + Gerente (cobro)**

```
Mostrar:
┌──────────────────────────────────────┐
│ DEUDA PENDIENTE                      │
│ ────────────────────────────────────│
│ Deuda Total: $[XXX.XXX]              │
│ Límite Crédito: $[YYY.YYY]          │
│ Disponible: $[ZZZ.ZZZ]               │
│ % Utilización: XX%                   │
└──────────────────────────────────────┘

Tabla de documentos con deuda:
┌─────────┬────────────┬──────────┐
│ Folio   │ Fecha Vta  │ Deuda    │
├─────────┼────────────┼──────────┤
│ FAC001  │ 15 nov     │ $2,500   │
│ FAC002  │ 20 nov     │ $1,800   │
│ BOL003  │ 25 nov     │ $900     │
└─────────┴────────────┴──────────┘
```

**Datos a obtener:**
- De SALDO_CREDITO: deuda, limite_credito
- De VENTA: join con SALDO_CREDITO para ver documentos
- Cálculo: % = (deuda / limite) * 100
- Disponible = limite - deuda

**Query necesaria:** 
- GET /api/clients/:rut/deuda
- SELECT deuda, limite_credito FROM saldo_credito WHERE cliente = ?
- SELECT folio, fecha_emision, valor_total FROM venta WHERE cliente = ? AND (folio existe en deuda)

---

### **TAB 2: VENTAS MENSUALES**
**Para: Vendedor (oportunidad) + Gerente (seguimiento)**

```
Comparativo: Mes Actual vs Trimestre Anterior

Tabla:
┌──────────┬──────────┬──────────────┬──────────┐
│ Mes      │ Monto    │ Variación    │ Trending │
├──────────┼──────────┼──────────────┼──────────┤
│ Sept     │ $15,000  │ -            │ -        │
│ Oct      │ $18,000  │ +20%         │ ↑        │
│ Nov      │ $14,000  │ -22%         │ ↓        │
│ Dic      │ $16,500  │ +18%         │ ↑        │
├──────────┼──────────┼──────────────┼──────────┤
│ Promedio │ $15,875  │ -            │ -        │
└──────────┴──────────┴──────────────┴──────────┘

Promedio Trimestre Anterior (Sept+Oct+Nov) = $15,667
Mes Actual (Dic) = $16,500
Resultado: +5.3% respecto a promedio trimestral ✓
```

**Datos a obtener:**
- De VENTA: SUM(valor_total) GROUP BY YEAR, MONTH, cliente
- Período: Últimos 4 meses
- Cálculo: Promedio 3 meses previos vs mes actual

**Query necesaria:**
- GET /api/clients/:rut/ventas-mensual
- SELECT DATE_TRUNC('month', fecha_emision) as mes, SUM(valor_total) FROM venta WHERE cliente = ? GROUP BY mes

---

### **TAB 3: PRODUCTOS (Últimos 6 meses)**
**Para: Vendedor (reorden sugerida) + Gerente (seguimiento)**

```
Top productos comprados por este cliente (últimos 6 meses)

Tabla:
┌────────────────┬──────────┬──────────────┬──────────┐
│ Producto       │ Cantidad │ Promedio 5m  │ Trending │
├────────────────┼──────────┼──────────────┼──────────┤
│ Producto A     │ 250 un   │ 180 un       │ ↑ +39%   │
│ Producto B     │ 120 un   │ 100 un       │ ↑ +20%   │
│ Producto C     │ 80 un    │ 150 un       │ ↓ -47%   │
└────────────────┴──────────┴──────────────┴──────────┘

Insight para vendedor:
"Producto A está en tendencia. 
Cliente compró 250 unidades en último mes 
vs promedio de 180. Considerar aumentar stock."
```

**Datos a obtener:**
- De VENTA: SKU, descripcion, SUM(cantidad) GROUP BY sku, cliente
- Período: Últimos 6 meses
- Cálculo: Promedio últimos 5 meses vs mes actual

**Query necesaria:**
- GET /api/clients/:rut/productos-6m
- SELECT sku, descripcion, SUM(cantidad) as cantidad_total, COUNT(DISTINCT folio) as num_compras FROM venta WHERE cliente = ? AND fecha_emision >= NOW() - INTERVAL '6 months' GROUP BY sku

---

### **TAB 4: ACTIVIDADES & OBSERVACIONES**
**Para: Vendedor (contexto de visitas) + Gerente (seguimiento)**

```
Block de notas + historial de últimas 3 actividades

┌─────────────────────────────────────────────┐
│ Registrar nueva actividad:                 │
│ [INPUT TEXTAREA]                           │
│ [GUARDAR] [LIMPIAR]                       │
└─────────────────────────────────────────────┘

Últimas actividades:
┌──────────────────────────────────────────────┐
│ 04 dic 18:30 - Mario Labbe:                 │
│ "Cliente confirmó pedido para próxima semana"│
│                                              │
│ 02 dic 14:15 - Gerente:                     │
│ "Recordar que tiene 2 documentos vencidos"   │
│                                              │
│ 30 nov 10:00 - Mario Labbe:                 │
│ "Cliente interesado en nueva línea de xxxxx" │
└──────────────────────────────────────────────┘
```

**Datos a obtener:**
- Nueva tabla: `cliente_actividad` (id, cliente_rut, usuario_id, comentario, created_at)
- Mostrar: últimas 3 actividades
- Permitir agregar nueva actividad

**Query necesaria:**
- GET /api/clients/:rut/actividades
- SELECT u.nombre, ca.comentario, ca.created_at FROM cliente_actividad ca JOIN usuario u ON ca.usuario_id = u.id WHERE ca.cliente_rut = ? ORDER BY ca.created_at DESC LIMIT 3
- POST /api/clients/:rut/actividades (agregar nueva)

---

## 🔧 CAMBIOS EN BASE DE DATOS NECESARIOS

### **NUEVA TABLA: cliente_actividad**

```sql
CREATE TABLE cliente_actividad (
  id SERIAL PRIMARY KEY,
  cliente_rut VARCHAR(20) NOT NULL REFERENCES cliente(rut) ON DELETE CASCADE,
  usuario_id INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_cliente_rut (cliente_rut),
  INDEX idx_created_at (created_at)
);
```

**Este es el ÚNICO cambio de estructura necesario.**

---

## 🚫 DATOS QUE NO TENEMOS (Optional, sin importancia crítica)

| Información | Por qué falta | Recomendación |
|------------|--------------|----------------|
| Teléfono alternativo | No importado | Opcional, no crítico |
| Dirección exacta | Tenemos ciudad/comuna | Suficiente para cotidiano |
| Contacto (nombre persona) | No importado | Considerar agregar |
| Límite de crédito asignado | No existe en CREDITO | Usar lo que hay |
| Días de crédito (plazo) | No importado | Usar fecha venta + fecha pago |
| País | No importado | Asumir Chile |

---

## ✅ RECOMENDACIÓN FINAL

**MVP a implementar SIN nuevas importaciones:**

1. ✅ **Buscador global** de clientes (busca en todos, filtra por vendedor si no es gerente)
2. ✅ **Ficha cliente** con 4 tabs:
   - Tab 1: Deuda (SALDO_CREDITO + VENTA)
   - Tab 2: Ventas mensual (VENTA, últimos 4 meses)
   - Tab 3: Productos (VENTA, últimos 6 meses)
   - Tab 4: Actividades (NUEVA tabla `cliente_actividad`)
3. ✅ **Tabla nueva:** `cliente_actividad` (muy simple, solo 5 columnas)

**Esfuerzo estimado:**
- Backend: 3-4 endpoints + 1 tabla nueva = ~4 horas
- Frontend: Ficha cliente + tabs + buscador = ~6 horas
- **Total: 1 día de trabajo**

**Opcional (sin urgencia):**
- Importar datos adicionales del sistema matriz (teléfono alternativo, contacto, etc)
- Agregar límite de crédito editable en tabla `saldo_credito`

---

## 📊 FLUJO DE USO ESPERADO

```
Vendedor abre Dashboard
        ↓
Ve buscador en sección "CLIENTES"
        ↓
Escribe nombre/RUT cliente
        ↓
Selector muestra TODOS los clientes que coinciden
        ↓
Vendedor selecciona cliente
        ↓
Se abre Ficha Cliente con:
  - Deuda actual
  - Últimas ventas
  - Productos más comprados
  - Notas/actividades previas
        ↓
Vendedor puede:
  - Ver si puede vender (disponible de crédito)
  - Recordar qué compró antes (productos)
  - Saber qué dijo el gerente/otro vendedor (actividades)
  - Registrar nueva nota
        ↓
Gerente ve lo MISMO pero todos los clientes
```

---

## 🎯 PRIORIDAD

1. **P1:** Buscador global (vendedor necesita esto urgente)
2. **P1:** Tabla deuda (saber si puede vender)
3. **P2:** Ventas mensuales (análisis)
4. **P2:** Productos últimos 6m (contexto de compra)
5. **P3:** Actividades (documentación de gestoría)

¿Procedemos con esta estructura?
