const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  const fecha = '2026-04-24';
  
  const res = await client.query("SELECT COUNT(*) FROM planificacion WHERE fecha::date = $1", [fecha]);
  console.log(`Total registros en PLANIFICACION para ${fecha}: ${res.rows[0].count}`);
  
  if (res.rows[0].count > 0) {
    const samples = await client.query("SELECT * FROM planificacion WHERE fecha::date = $1 LIMIT 5", [fecha]);
    console.table(samples.rows);
  }
  
  await client.end();
}

run().catch(console.error);
