# Documentación de la API CRM2

Base URL: `http://localhost:3001/api`

## Autenticación
- Todas las rutas protegidas requieren header `Authorization: Bearer <token>`

## Endpoints principales

### Usuarios
- `POST /users/login` — Login de usuario
- `POST /users/register` — Registrar usuario (admin)
- `GET /users` — Listar usuarios (admin)

### Clientes
- `GET /clients` — Listar clientes
- `POST /clients` — Crear cliente
- `PUT /clients/:id` — Editar cliente
- `DELETE /clients/:id` — Eliminar cliente

### Actividades
- `GET /activities` — Listar actividades
- `POST /activities` — Crear actividad
- `PUT /activities/:id` — Editar actividad
- `DELETE /activities/:id` — Eliminar actividad

### Tipos de Actividad y Objetivo
- `GET /activity-types` — Listar tipos de actividad
- `POST /activity-types` — Crear tipo
- `GET /goal-types` — Listar tipos de objetivo
- `POST /goal-types` — Crear tipo

### Objetivos
- `GET /goals` — Listar objetivos (filtra por usuario si rol vendedor)
- `GET /goals/activity/:activityId` — Objetivos de una actividad
- `POST /goals` — Crear objetivo (acepta `activity_id` o `cliente_id` para crear actividad automática)
- `PUT /goals/:id` — Editar objetivo
- `DELETE /goals/:id` — Eliminar objetivo

### Oportunidades y Amenazas
- `GET /opportunities` — Listar oportunidades
- `POST /opportunities` — Crear oportunidad
- `GET /threats` — Listar amenazas
- `POST /threats` — Crear amenaza

### Ventas
- `POST /sales/bulk` — Carga masiva de ventas desde CSV
  - Formato esperado: columnas `RUT`, `FECHA FACTURA`, `NUMERO FACTURA`, `MONTO NETO FACTURA`
  - Respuesta: JSON con éxito o archivo CSV con registros no cargados
 - `POST /sales/import-json` — Importar ventas desde JSON
   - Body: `[{"rut": "11111111-1", "invoice_number":"F001", "invoice_date":"2025-09-01", "net_amount":12345.67}]`
   - Respuesta: `{ inserted: <n>, failed: <m>, detalles_fallidos: [...] }`

### Salud
- `GET /health` — Estado rápido del servicio

### KPIs
- `GET /kpis/top-clients` — Top 5 clientes por ventas
- `GET /kpis/sales-summary` — Resumen de ventas

## Ejemplo de autenticación
```json
POST /users/login
{
  "email": "usuario@ejemplo.com",
  "password": "123456"
}
```

## Ejemplo de carga de ventas
- Enviar archivo CSV como `form-data` con campo `file` a `/sales/bulk`.
- Si hay errores, se descarga automáticamente un archivo CSV con los registros no cargados y el motivo.

---
Para detalles adicionales, revisa el código fuente o contacta al equipo de desarrollo.
