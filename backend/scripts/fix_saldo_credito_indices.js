const { Pool } = require('@neondatabase/serverless');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false } // Fallback if env missing
});

async function run() {
  console.log("Iniciando fix de índices para saldo_credito...");
  try {
    const res = await pool.query(`
      UPDATE saldo_credito 
      SET rut_idx = UPPER(REGEXP_REPLACE(rut, '[^a-zA-Z0-9]', '', 'g')) 
      WHERE rut_idx IS NULL AND rut IS NOT NULL
      RETURNING rut_idx;
    `);
    
    console.log(`✅ Operación exitosa. ${res.rowCount} filas actualizadas con su respectivo rut_idx.`);
  } catch (error) {
    console.error("❌ Error actualizando rut_idx:", error);
  } finally {
    pool.end();
  }
}

run();
