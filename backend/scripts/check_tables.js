require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTables() {
    try {
        console.log('--- CHECK TABLE COUNTS ---');
        const tables = ['sales', 'ventas', 'venta'];

        for (const t of tables) {
            try {
                const res = await pool.query(`SELECT COUNT(*) FROM ${t}`);
                console.log(`Table '${t}': ${res.rows[0].count} rows`);
            } catch (e) {
                console.log(`Table '${t}': Does NOT exist (${e.message})`); // e.g. undefined table
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkTables();
