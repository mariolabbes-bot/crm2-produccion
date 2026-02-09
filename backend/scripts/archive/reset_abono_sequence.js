require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false
});

async function checkAbono() {
  try {
    const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) as count FROM abono');
    console.log(`Registros en abono: ${count}`);
    
    // Reset sequence
    await pool.query("SELECT setval(pg_get_serial_sequence('abono', 'id'), 1, false)");
    console.log('✅ Secuencia de abono.id reseteada a 1');
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

checkAbono();
