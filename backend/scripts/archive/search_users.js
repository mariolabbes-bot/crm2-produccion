require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function search() {
    const client = await pool.connect();
    try {
        console.log('--- SEARCHING USERS ---');
        const res = await client.query(`
            SELECT rut, nombre_vendedor, alias, nombre_credito 
            FROM usuario 
            WHERE nombre_vendedor ILIKE '%Matias%' 
               OR nombre_vendedor ILIKE '%Octavio%' 
               OR nombre_vendedor ILIKE '%Nelson%'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

search();
