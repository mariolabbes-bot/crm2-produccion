# API de Abonos - Documentación

## 📚 Rutas Disponibles

### 1. GET /api/abonos
Obtiene una lista paginada de abonos con filtros opcionales.

**Parámetros de consulta:**
- `vendedor_id` (opcional): ID del vendedor para filtrar
- `fecha_desde` (opcional): Fecha de inicio (YYYY-MM-DD)
- `fecha_hasta` (opcional): Fecha de fin (YYYY-MM-DD)
- `tipo_pago` (opcional): Tipo de pago para filtrar
- `limit` (opcional, default: 50): Número de registros por página
- `offset` (opcional, default: 0): Desplazamiento para paginación

**Control de acceso:**
- Vendedores: Solo ven sus propios abonos
- Manager: Puede ver todos los abonos y filtrar por vendedor

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "folio": "217267",
      "fecha_abono": "2025-09-30",
      "monto": "612283.00",
      "tipo_pago": "Transferencia",
      "cliente_nombre": "OSCAR ENRIQUE LABRA",
      "descripcion": "En Caja Operacional",
      "vendedor_nombre": "ROBERTO OYARZUN",
      "vendedor_id": 3
    }
  ],
  "pagination": {
    "total": 41572,
    "limit": 50,
    "offset": 0,
    "pages": 832
  }
}
```

---

### 2. GET /api/abonos/estadisticas
Obtiene estadísticas agregadas de abonos.

**Parámetros de consulta:**
- `vendedor_id` (opcional): Filtrar por vendedor
- `fecha_desde` (opcional): Fecha de inicio
- `fecha_hasta` (opcional): Fecha de fin

**Control de acceso:**
- Vendedores: Solo estadísticas de sus propios abonos
- Manager: Puede ver estadísticas globales o por vendedor

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "data": {
    "resumen": {
      "total_abonos": "41572",
      "monto_total": "13478889923.00",
      "promedio_abono": "324230.01",
      "abono_minimo": "300.00",
      "abono_maximo": "43043100.00",
      "fecha_primera": "2024-01-02",
      "fecha_ultima": "2025-09-30"
    },
    "por_tipo_pago": [
      {
        "tipo_pago": "Cheque",
        "cantidad": "14583",
        "monto_total": "6268357978.00",
        "promedio": "429897.47"
      }
    ],
    "por_mes": [
      {
        "mes": "2025-09",
        "cantidad": "3245",
        "monto_total": "1250000000.00",
        "promedio": "385192.30"
      }
    ]
  }
}
```

---

### 3. GET /api/abonos/comparativo
Compara ventas vs abonos con agrupación por periodo.

**Parámetros de consulta:**
- `vendedor_id` (opcional): Filtrar por vendedor
- `fecha_desde` (opcional): Fecha de inicio
- `fecha_hasta` (opcional): Fecha de fin
- `agrupar` (opcional, default: 'mes'): 'dia', 'mes', o 'anio'

**Control de acceso:**
- Vendedores: Solo su propio comparativo
- Manager: Puede ver todos los vendedores

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "data": {
    "resumen": {
      "total_ventas": "11601780411.00",
      "cantidad_ventas": "36434",
      "total_abonos": "13478889923.00",
      "cantidad_abonos": "41572",
      "saldo_pendiente": "-1877109512.00",
      "porcentaje_cobrado_total": "116.18"
    },
    "detalle": [
      {
        "periodo": "2025-09",
        "vendedor_id": 6,
        "vendedor_nombre": "OMAR MALDONADO",
        "total_ventas": "1500000000.00",
        "cantidad_ventas": "3500",
        "total_abonos": "1300000000.00",
        "cantidad_abonos": "3200",
        "diferencia": "200000000.00",
        "porcentaje_cobrado": "86.67"
      }
    ]
  }
}
```

---

### 4. GET /api/abonos/por-vendedor
Obtiene un resumen consolidado de abonos y ventas por vendedor.

**Parámetros de consulta:**
- `fecha_desde` (opcional): Fecha de inicio
- `fecha_hasta` (opcional): Fecha de fin

**Control de acceso:**
- Solo managers pueden acceder a esta ruta

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "vendedor_id": 6,
      "vendedor_nombre": "OMAR MALDONADO",
      "cantidad_abonos": "7010",
      "total_abonos": "2698884859.00",
      "promedio_abono": "385004.97",
      "primer_abono": "2024-01-02",
      "ultimo_abono": "2025-09-30",
      "cantidad_ventas": "8523",
      "total_ventas": "3200000000.00",
      "porcentaje_cobrado": "84.34",
      "saldo_pendiente": "501115141.00"
    }
  ]
}
```

---

### 5. GET /api/abonos/tipos-pago
Obtiene la lista de tipos de pago disponibles en el sistema.

**Sin parámetros**

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "data": [
    "Cheque",
    "Crédito",
    "Débito",
    "Depósito",
    "Efectivo",
    "Transferencia",
    "Vale vista"
  ]
}
```

---

## 🔐 Autenticación

Todas las rutas requieren autenticación mediante JWT en el header:
```
Authorization: Bearer <token>
```

Para obtener el token, usar la ruta de login:
```bash
POST /api/users/login
Content-Type: application/json

{
  "email": "usuario@crm.com",
  "password": "password123"
}
```

---

## 📊 Datos Disponibles

- **41,572 abonos** totales
- **$13,478,889,923 CLP** en monto total
- Periodo: Enero 2024 - Septiembre 2025
- 15 vendedores activos
- 7 tipos de pago diferentes

### Top Vendedores por Abonos:
1. Omar Maldonado: $2,698M
2. Nelson Muñoz: $2,079M
3. Alex Mondaca: $1,829M
4. Matias Tapia: $1,170M
5. Maiko Flores: $1,051M

---

## 🧪 Ejemplos de Uso

### Obtener abonos de un vendedor específico
```bash
GET /api/abonos?vendedor_id=6&limit=20
```

### Obtener estadísticas del último trimestre
```bash
GET /api/abonos/estadisticas?fecha_desde=2025-07-01&fecha_hasta=2025-09-30
```

### Comparativo mensual de ventas vs abonos
```bash
GET /api/abonos/comparativo?agrupar=mes&fecha_desde=2025-01-01
```

### Filtrar abonos por tipo de pago
```bash
GET /api/abonos?tipo_pago=Transferencia&fecha_desde=2025-09-01
```

---

## ✅ Estado Actual

- ✅ Tabla `abono` creada con índices optimizados
- ✅ 41,572 abonos importados correctamente
- ✅ Relación con vendedores establecida
- ✅ 5 rutas API implementadas
- ✅ Control de acceso por rol (manager/vendedor)
- ✅ Paginación y filtros implementados
- ✅ Comparativos y estadísticas disponibles

---

## 🚀 Próximos Pasos

1. Integrar en el frontend para visualización
2. Crear dashboards de análisis ventas vs abonos
3. Implementar alertas de saldos pendientes
4. Generar reportes PDF/Excel
