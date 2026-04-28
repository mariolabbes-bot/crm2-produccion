const { Client } = require('pg');
require('dotenv').config();

async function diagSupervision() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  const fecha = new Date().toISOString().split('T')[0];
  console.log(`Diagnosticando Supervisión para fecha: ${fecha}`);
  
  const query = `
            SELECT 
                u.id as vendedor_id,
                u.nombre_vendedor as nombre,
                u.rut,
                COALESCE(stats.total_actividades, 0) as total_actividades,
                COALESCE(stats.planificadas, 0) as planificadas,
                COALESCE(stats.completadas, 0) as completadas,
                COALESCE(stats.en_progreso, 0) as en_progreso,
                stats.primera_visita,
                stats.ultima_visita,
                COALESCE(stats.fuera_geocerca, 0) as fuera_geocerca
            FROM usuario u
            LEFT JOIN (
                SELECT 
                    v.vendedor_id,
                    COUNT(v.id) as total_actividades,
                    COUNT(CASE WHEN v.planificada = TRUE THEN 1 END) as planificadas,
                    COUNT(CASE WHEN v.estado = 'completada' THEN 1 END) as completadas,
                    COUNT(CASE WHEN v.estado = 'en_progreso' THEN 1 END) as en_progreso,
                    MIN(v.hora_inicio) as primera_visita,
                    MAX(v.hora_fin) as ultima_visita,
                    COUNT(CASE WHEN v.distancia_checkin > 500 THEN 1 END) as fuera_geocerca
                FROM visitas_registro v
                WHERE v.fecha::date = $1::date
                GROUP BY v.vendedor_id
            ) stats ON (
                u.id::text = stats.vendedor_id::text 
                OR REGEXP_REPLACE(u.rut, '[^0-9]', '', 'g') = REGEXP_REPLACE(stats.vendedor_id::text, '[^0-9]', '', 'g')
            )
            WHERE u.nombre_vendedor IS NOT NULL
              AND u.id NOT IN (SELECT id FROM usuario WHERE LOWER(nombre_vendedor) LIKE '%admin%')
            ORDER BY u.nombre_vendedor ASC
  `;

  try {
    const res = await client.query(query, [fecha]);
    console.log(`✅ Consulta exitosa. Filas: ${res.rows.length}`);
    if (res.rows.length > 0) console.table(res.rows.slice(0, 5));
  } catch (err) {
    console.error('❌ ERROR EN SQL SUPERVISION:');
    console.error(err);
  }

  await client.end();
}

diagSupervision().catch(console.error);
