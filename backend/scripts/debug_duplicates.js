require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDuplicates() {
    const client = await pool.connect();
    try {
        console.log('--- BUSCANDO MILTON Y EMILIO ---');
        const res = await client.query(`
        SELECT rut, nombre_vendedor, alias, rol_usuario
        FROM usuario 
        WHERE nombre_vendedor ILIKE '%Milton%' 
           OR nombre_vendedor ILIKE '%Emilio%' 
           OR alias ILIKE '%Milton%' 
           OR alias ILIKE '%Emilio%'
    `);
        console.table(res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkDuplicates();
