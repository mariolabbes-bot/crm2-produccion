const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  // Ajusta estos valores según lo que el usuario esté probando
  const rut = '1-9'; // RUT de ejemplo
  const id = '9';   // ID de ejemplo (el Manager suele ser 9 según mi inspección anterior)
  const fecha = '2026-04-24'; // Fecha de hoy o la que el usuario esté mirando
  
  const query = `
            SELECT v.id, v.titulo, v.vendedor_id, v.fecha, v.cliente_rut,
                   (
                     SELECT string_agg(u.nombre, ', ')
                     FROM usuario u
                     WHERE jsonb_typeof(v.participantes) = 'array' 
                       AND u.id::text IN (
                        SELECT jsonb_array_elements_text(v.participantes)
                     )
                   ) as nombres_participantes
            FROM visitas_registro v
            LEFT JOIN cliente c ON v.cliente_rut = c.rut
            WHERE (v.vendedor_id::text = $1 OR v.vendedor_id::text = $2)
            AND v.fecha::date = $3::date
  `;
  
  try {
    const res = await client.query(query, [rut, id, fecha]);
    console.log(`--- Resultados para ID ${id} en fecha ${fecha} ---`);
    console.table(res.rows);
    
    const countTotal = await client.query("SELECT COUNT(*) FROM visitas_registro WHERE fecha::date = $1", [fecha]);
    console.log(`Total registros en esa fecha (cualquier vendedor): ${countTotal.rows[0].count}`);
    
  } catch (err) {
    console.error('ERROR EN QUERY:', err.message);
  }
  
  await client.end();
}

run().catch(console.error);
