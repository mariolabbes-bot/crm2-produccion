
require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function inspectUserTable() {
    try {
        console.log('--- INSPECTING USUARIO TABLE SCHEMA ---');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'usuario';
        `);
        console.table(res.rows);

        // Also dump one row to see content
        const rows = await pool.query('SELECT * FROM usuario LIMIT 1');
        console.log('Sample User Row:', rows.rows[0]);

    } catch (err) {
        console.error('Error inspecting:', err);
    } finally {
        await pool.end();
    }
}

inspectUserTable();
