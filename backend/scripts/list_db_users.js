
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function list() {
    const client = await pool.connect();
    const res = await client.query("SELECT nombre_vendedor, alias FROM usuario ORDER BY nombre_vendedor");
    console.log('--- DB USERS ---');
    res.rows.forEach(r => console.log(`Name: "${r.nombre_vendedor}" | Alias: "${r.alias}"`));
    client.release();
    pool.end();
}
list();
