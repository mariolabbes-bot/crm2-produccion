require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspect() {
    const client = await pool.connect();
    try {
        console.log('--- INSPECTING USUARIO DUPLICATES ---');

        const targets = ['Omar', 'Alex', 'Nelson', 'Maiko'];

        for (const t of targets) {
            console.log(`\nSearching for: ${t}`);
            const res = await client.query(`
                SELECT rut, nombre_vendedor, alias 
                FROM usuario 
                WHERE alias ILIKE $1 OR nombre_vendedor ILIKE $2
            `, [t, `%${t}%`]);
            console.table(res.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

inspect();
