const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  const schema = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'visitas_registro' AND column_name = 'vendedor_id'
  `);
  console.log('--- Schema visitas_registro.vendedor_id ---');
  console.table(schema.rows);

  const samples = await client.query(`
    SELECT vendedor_id, COUNT(*) 
    FROM visitas_registro 
    GROUP BY vendedor_id 
    LIMIT 10
  `);
  console.log('--- Muestras de vendedor_id ---');
  console.table(samples.rows);
  
  await client.end();
}

run().catch(console.error);
