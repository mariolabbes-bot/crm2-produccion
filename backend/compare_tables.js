const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query("SELECT COUNT(*) FROM visitas");
  console.log(`Total registros en tabla 'visitas': ${res.rows[0].count}`);
  
  const res2 = await client.query("SELECT COUNT(*) FROM visitas_registro");
  console.log(`Total registros en tabla 'visitas_registro': ${res2.rows[0].count}`);
  
  await client.end();
}
run().catch(console.error);
