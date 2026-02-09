
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

async function listOrphans() {
    const client = await pool.connect();
    try {
        const orphanedRes = await client.query(`
        SELECT DISTINCT t.nombre_vendedor 
        FROM cliente t
        LEFT JOIN usuario u ON (LOWER(t.nombre_vendedor) = LOWER(u.nombre_vendedor) OR LOWER(t.nombre_vendedor) = LOWER(u.alias))
        WHERE t.nombre_vendedor IS NOT NULL AND t.nombre_vendedor != '' AND u.rut IS NULL
    `);
        console.log('ORPHANED NAMES IN CLIENTE TABLE:');
        orphanedRes.rows.forEach(r => console.log(`- "${r.nombre_vendedor}"`));
        console.log(`Total: ${orphanedRes.rowCount}`);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

listOrphans();
