require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspect() {
    try {
        const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('venta', 'producto', 'sales', 'products') 
      ORDER BY table_name, ordinal_position;
    `);

        console.log('--- SCHEMA ---');
        res.rows.forEach(r => console.log(`${r.table_name}.${r.column_name} (${r.data_type})`));

        // Check sample values for Families/Brands if columns exist
        const familiesRes = await pool.query(`SELECT DISTINCT familia FROM venta LIMIT 10`).catch(() => ({ rows: [] }));
        if (familiesRes.rows.length > 0) {
            console.log('--- Muestra Familia (venta) ---');
            console.log(familiesRes.rows.map(r => r.familia));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

inspect();
