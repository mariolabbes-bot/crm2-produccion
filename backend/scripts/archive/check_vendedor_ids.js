require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('--- CHECKING VENDEDOR_ID COVERAGE ---');

        const resVenta = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(vendedor_id) as with_id,
                COUNT(vendedor_cliente) as with_name
            FROM venta
        `);
        console.log('\n[VENTA Table]');
        console.table(resVenta.rows);

        const resAbono = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(vendedor_id) as with_id,
                COUNT(vendedor_cliente) as with_name
            FROM abono
        `);
        console.log('\n[ABONO Table]');
        console.table(resAbono.rows);

        // Check sample of missing IDs but with names
        const resSample = await client.query(`
            SELECT vendedor_cliente, COUNT(*) 
            FROM venta 
            WHERE vendedor_id IS NULL AND vendedor_cliente IS NOT NULL
            GROUP BY vendedor_cliente
            LIMIT 5
        `);
        console.log('\n[Sample Missing IDs in Venta]');
        console.table(resSample.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
