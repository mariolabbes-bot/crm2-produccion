require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function auditSales() {
    const client = await pool.connect();
    try {
        console.log('--- AUDITORÍA DE NOMBRES EN VENTAS (2026) ---');

        const res = await client.query(`
        SELECT DISTINCT vendedor_cliente, COUNT(*) as count 
        FROM venta 
        WHERE fecha_emision >= '2026-01-01'
        GROUP BY vendedor_cliente 
        ORDER BY count DESC
    `);

        console.table(res.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

auditSales();
