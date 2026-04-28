const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query("SELECT usuario_alias_id, COUNT(*) FROM cliente_actividad GROUP BY usuario_alias_id");
  console.log('--- Distribución de usuario_alias_id ---');
  console.table(res.rows);
  
  const resNull = await client.query("SELECT id, comentario FROM cliente_actividad WHERE usuario_alias_id IS NULL LIMIT 5");
  if(resNull.rows.length > 0) {
    console.log('--- Ejemplos de registros con NULL ---');
    console.table(resNull.rows);
  }
  
  await client.end();
}

run().catch(console.error);
