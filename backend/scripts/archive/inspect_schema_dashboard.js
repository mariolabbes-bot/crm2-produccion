require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectSchema() {
    const client = await pool.connect();
    try {
        console.log('--- INSPECTING SCHEMA ---');

        const tables = ['venta', 'abono'];

        for (const t of tables) {
            console.log(`\nTable: ${t}`);
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [t]);
            console.table(res.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

inspectSchema();
