# Importación de datos: Ventas y Abonos

Este documento describe cómo importar los datos reales desde el Excel de origen a la base de datos Postgres (Neon) para alimentar el dashboard. Incluye mapeo de vendedores, rendimiento (COPY), validaciones y cómo reimportar de forma segura.

## Fuentes de datos
- Archivo Excel principal: BASE TABLAS CRM2.xlsx
  - Hoja de ventas: «VENTAS 2024-2025»
  - Hoja de abonos: «ABONOS 2024-2025»
  - Hoja opcional de mapeo interno: «MAPEO VENDEDORES» (alias → usuario)
- Archivo Excel de mapeo externo (opcional): base vendedores.xlsx
  - Se puede indicar con la variable de entorno `MAPPING_FILE`

## Scripts de importación (backend/scripts)
- import_full_base_fast.js → Importa VENTAS rápidamente usando COPY
- import_abonos_fast.js → Importa ABONOS rápidamente usando COPY

Ambos scripts:
- Detectan columnas de forma robusta (nombres flexibles)
- Convierten fechas desde serial de Excel o strings a formato ISO (YYYY-MM-DD)
- Hacen mapeo de vendedor desde alias a usuario real
- Generan un CSV temporal en /tmp y hacen COPY a Postgres (muy rápido)
- Limpian la tabla de destino antes de importar (DELETE)

Advertencia: Ejecutar estos scripts borra el contenido previo de las tablas objetivo antes de la importación. Úselos con conocimiento de causa si hay data en producción.

## Conexión a BD
Ambos scripts usan la conexión Neon. Si necesitas ajustar credenciales/URL, edita el archivo correspondiente o exporta `DATABASE_URL` y ajusta el script según sea necesario.

## Mapeo de vendedores (alias → usuario)
El mapeo combina 3 fuentes, con esta precedencia (de mayor a menor):
1) Mapeo fijo en JSON: backend/config/vendor_alias_map.json
   - Claves: alias (string); Valor: nombre del usuario destino tal como está en la tabla users (ej: "MAIKO FLORES MALDONADO").
2) Mapeo interno (opcional) desde hoja «MAPEO VENDEDORES» del Excel principal
   - Debe contener columnas tipo “Alias” y “Usuario” (o similar). Se hace match por contenido, no por nombre exacto.
3) Mapeo externo (opcional) desde un Excel con nombres completos
   - Controlado por `MAPPING_FILE`. El script busca columnas como “Nombre Vendedor”, “Nombre”, “Apellido” (y opcional “Apellido 2”). Forma el nombre completo, lo normaliza y lo cruza con la tabla users.

Si no hay match en los 3 puntos, aplica heurísticas por tokens del nombre y, si persiste la ambigüedad, asigna el abono/venta al usuario con rol manager como fallback. Para forzar rutas específicas, use el JSON fijo.

## Campos cargados
- Ventas (tabla sales): fecha, vendedor_id, folio, cliente, subtotal/total según diseño del script, etc.
- Abonos (tabla abonos o abono, el script detecta):
  - vendedor_id
  - fecha_abono
  - monto (usa "Monto"; si no existe, usa "Monto total")
  - descripcion (incluye “Estado: {Estado abono}” si existe)
  - folio
  - cliente_nombre
  - tipo_pago

Nota: Los scripts detectan dinámicamente si la tabla de destino se llama `abonos` o `abono`. Si no existe ninguna, crean `abono` con el esquema estándar.

## Cómo ejecutar
- Requisitos: Node.js 18+ y acceso a la base Postgres. Instala dependencias en el backend si no están instaladas: xlsx, pg, pg-copy-streams, dotenv.
- Opcional: define `MAPPING_FILE` si vas a usar el mapeo externo.

Ejemplos (rutas con espacios deben ir entre comillas):
- Importar abonos:
  - node "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2/backend/scripts/import_abonos_fast.js"
- Importar ventas:
  - node "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2/backend/scripts/import_full_base_fast.js"

Ambos scripts imprimen un resumen con conteo y min/max de fechas al finalizar.

## Validación rápida post-import
- En la terminal del script ya se muestra algo como:
  - Abonos: { c: 41572, min: 2024-01-02, max: 2025-09-30 }
  - Ventas: { c: 38706, min: 2024-01-02, max: 2025-09-30 }
- En el dashboard, verifica filtros por fecha y por vendedor (manager ve todos; vendedores ven solo su data con filtro por fechas).

## Resolución de problemas
- Encoding raro en Tipo pago (Cr√©dito/D√©bito): El valor se guarda tal cual viene. Si necesitas normalizarlo a "Crédito/Débito", podemos añadir una normalización adicional.
- Alias no reconocidos: Añádelos a backend/config/vendor_alias_map.json para un control explícito y reimporta.
- Performance: COPY es muy rápido; si observas lentitud, confirma que no hay triggers pesados o constraints adicionales en la BD.
- Diferencias de esquema prod/dev: Los endpoints del backend ya detectan tablas y columnas comunes; si cambias esquema, recuerda ajustar importadores y/o endpoints.

## Resultados actuales (verificados)
- Ventas: 38,706 registros cargados. Fechas entre 2024-01-02 y 2025-09-30.
- Abonos: 41,572 registros cargados. Fechas entre 2024-01-02 y 2025-09-30.

## Siguientes pasos sugeridos
- Añadir tests mínimos de consistencia (ej: total por rango vs dashboard)
- Normalización opcional de campos de texto (Tipo pago)
- Comandos npm/yarn para ejecutar importadores con un alias más cómodo
