# Propuesta de Limpieza de Datos Históricos

## Análisis de Datos Actual (> 18 meses)
- **Ventas**: ~34,500 registros.
- **Abonos**: ~15,800 registros.
- **Deuda Pendiente (Saldo Crédito)**: ~1,800 registros tienen más de 18 meses.

## Ventajas
- **Rendimiento**: Consultas más rápidas (aunque ya están optimizadas, menos datos siempre es mejor para memoria e índices).
- **Consistencia**: Eliminamos datos "sucios" de años anteriores que complican los reportes actuales.
- **Mantenimiento**: Backups más pequeños y procesos de importación más ágiles.

## Riesgos y Consideraciones
1. **Pérdida de Historial YoY**: Los gráficos de "Año vs Año" para meses antiguos (ej. mediados de 2024) aparecerán en 0.
2. **Facturas Impagas**: Existe un riesgo de borrar la venta original que originó una deuda que aún está vigente en `saldo_credito`.

## Estrategia Propuesta
1. **Borrado Inteligente**: Eliminar solo ventas y abonos de hace > 18 meses QUE NO tengan saldos pendientes asociados.
2. **Script de Mantenimiento**: Crear un script `scripts/routine_cleanup.js` que el administrador pueda ejecutar mensualmente.
3. **Backup Preventivo**: El script podría exportar los datos borrados a un archivo JSON/CSV antes de eliminarlos definitivamente.
