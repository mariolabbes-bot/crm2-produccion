require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectUsuario() {
    const client = await pool.connect();
    try {
        console.log('--- INSPECTING SCHEMA: USUARIO ---');

        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'usuario'
            ORDER BY ordinal_position
        `);
        console.table(res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

inspectUsuario();
