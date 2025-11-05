# Prueba rápida de importación

Esta guía te ayuda a probar la importación de Ventas y Abonos de punta a punta y a interpretar los nuevos mensajes de error detallados.

## Pasos rápidos

1) Inicia sesión en la app y copia tu token (queda en localStorage)
- Inicia sesión en la app (producción o local).
- El token se adjunta automáticamente al subir archivos desde la UI. Para descargas en nueva pestaña, se usa ?token=...

2) Descarga una plantilla
- Ventas: desde la UI o GET /api/import/plantilla/ventas
- Abonos: desde la UI o GET /api/import/plantilla/abonos

3) Completa SOLO los campos mínimos
- Ventas: Folio, Tipo documento, Fecha (YYYY-MM-DD). Deja vacíos "Vendedor cliente" y "Vendedor documento" si no estás seguro; la importación se permite con vendedor_id nulo.
- Abonos: Folio, Fecha, Monto

4) Sube el archivo desde Importar en la app
- Si faltan columnas o el archivo está vacío: verás 400 con detalles y encabezados detectados.
- Si falla una inserción: verás la fila de Excel y folio que falló en el mensaje.

## Mensajes de error nuevos

- 400 Faltan columnas: "Faltan columnas requeridas: Folio, Fecha" y lista de encabezados detectados.
- 400 Archivo vacío: "El archivo Excel no contiene filas para procesar".
- 500 Error al guardar datos: "Fila 7 (folio 1234): <detalle postgres>" para ubicar la fila exacta.

## Tips frecuentes

- Formato Fecha: YYYY-MM-DD (o fecha Excel). Evita strings ambiguas.
- Números: usar valores numéricos en Cantidad/Precio/Montos; se parsean con parseFloat.
- Duplicados: ventas duplican por (tipo_documento+folio); abonos por folio.
- Vendedor: si ingresas alias/nombre inexistente, se detendrá la importación y se generará un informe de faltantes. Déjalo vacío si no aplica.

## Datos de ejemplo locales

Si estás en entorno local, puedes generar archivos de ejemplo con el script en backend/scripts/generar_muestras.js. Se crearán en backend/scripts/samples/ ventas_ejemplo.xlsx y abonos_ejemplo.xlsx.
