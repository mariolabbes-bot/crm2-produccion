require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query(`
      SELECT sku, descripcion, familia 
      FROM producto 
      WHERE familia = 'Lubricantes' 
      LIMIT 10
    `);
        console.table(res.rows);
    } catch (e) { console.error(e); } finally { await pool.end(); }
}
check();
