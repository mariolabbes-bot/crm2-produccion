
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
    const client = await pool.connect();
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'usuario'");
    console.log('Columns in usuario:', res.rows.map(r => r.column_name).join(', '));
    client.release();
    pool.end();
}
check();
