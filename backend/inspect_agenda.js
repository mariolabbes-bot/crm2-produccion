const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query("SELECT id, vendedor_id, titulo, tipo_evento, fecha, cliente_rut FROM visitas_registro ORDER BY id DESC LIMIT 10");
  fs.writeFileSync('agenda_inspect.json', JSON.stringify(res.rows, null, 2));
  await client.end();
  console.log('✅ Datos guardados en agenda_inspect.json');
}

run().catch(console.error);
