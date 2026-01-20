require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkAliases() {
    try {
        console.log('--- CHECK ALIASES ---');
        const res = await pool.query(`
      SELECT nombre_vendedor, alias, rut 
      FROM usuario 
      WHERE rol_usuario = 'VENDEDOR'
      AND alias IS NOT NULL
      ORDER BY nombre_vendedor
    `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAliases();
