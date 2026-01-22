require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query(`
        SELECT 
            COUNT(*) as total_rows,
            COUNT(CASE WHEN monto_neto IS NULL THEN 1 END) as null_neto,
            COUNT(CASE WHEN monto_neto = 0 THEN 1 END) as zero_neto,
            COUNT(CASE WHEN (monto_neto IS NULL OR monto_neto = 0) AND monto > 0 THEN 1 END) as problematic_rows,
            SUM(CASE WHEN (monto_neto IS NULL OR monto_neto = 0) AND monto > 0 THEN monto END) as problematic_monto_sum
        FROM abono
    `);
        console.log('--- Diagnóstico de Nulos ---');
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
