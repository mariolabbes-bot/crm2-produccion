require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debugMaster() {
    try {
        console.log('--- DEBUG MASTER TABLE ---');

        // 1. Check CP content sample
        const cpSample = await pool.query("SELECT * FROM clasificacion_productos LIMIT 5");
        console.log('Sample CP:', cpSample.rows);

        // 2. Check Sales SKU format
        const salesSample = await pool.query("SELECT sku FROM venta LIMIT 5");
        console.log('Sample Sales SKU:', salesSample.rows.map(r => `"${r.sku}"`));

        // 3. Try explicit JOIN
        const joinTest = await pool.query(`
        SELECT count(*) as matches 
        FROM venta v 
        JOIN clasificacion_productos cp ON TRIM(v.sku) = TRIM(cp.sku)
    `);
        console.log('Total INNER JOIN matches:', joinTest.rows[0].matches);

        // 4. Check specific families in CP
        const families = await pool.query("SELECT DISTINCT familia FROM clasificacion_productos");
        console.log('Familias en CP:', families.rows.map(r => r.familia));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

debugMaster();
