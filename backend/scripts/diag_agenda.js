const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  console.log('--- DIAGNÓSTICO DE AGENDA Y SUPERVISIÓN ---');

  // 1. Ver registros recientes de visitas_registro
  console.log('\n[1] Últimos 20 registros en visitas_registro:');
  const resRecent = await client.query(`
    SELECT v.id, v.vendedor_id, v.cliente_rut, v.fecha, v.tipo_evento, v.titulo, v.estado
    FROM visitas_registro v
    ORDER BY v.id DESC
    LIMIT 20
  `);
  console.table(resRecent.rows);

  // 2. Ver tipos de datos en vendedor_id
  console.log('\n[2] Tipos de valores en vendedor_id (visitas_registro):');
  const resTypes = await client.query(`
    SELECT vendedor_id::text as val, COUNT(*) 
    FROM visitas_registro 
    GROUP BY vendedor_id 
    ORDER BY COUNT(*) DESC
  `);
  console.table(resTypes.rows);

  // 3. Ver usuarios y sus IDs/RUTs para cruce
  console.log('\n[3] Mapeo de Usuarios (ID y RUT):');
  const resUsers = await client.query(`
    SELECT id, rut, nombre_vendedor, rol_usuario 
    FROM usuario 
    WHERE nombre_vendedor IS NOT NULL
    ORDER BY id
  `);
  console.table(resUsers.rows);

  // 4. Ver registros que podrían estar fallando en el JOIN de supervisión
  console.log('\n[4] Registros sin coincidencia clara en usuario (Supervisión Check):');
  const resOrphans = await client.query(`
    SELECT DISTINCT v.vendedor_id
    FROM visitas_registro v
    LEFT JOIN usuario u ON (u.id::text = v.vendedor_id::text OR REGEXP_REPLACE(u.rut, '[^0-9]', '', 'g') = REGEXP_REPLACE(v.vendedor_id::text, '[^0-9]', '', 'g'))
    WHERE u.id IS NULL
  `);
  console.table(resOrphans.rows);

  await client.end();
}

run().catch(console.error);
