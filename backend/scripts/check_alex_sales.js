require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkAlexSales() {
    try {
        console.log('--- CHECK ALEX SALES ---');
        const query = `
        SELECT TO_CHAR(fecha_emision, 'YYYY-MM') as mes, COUNT(*) as c, SUM(valor_total) as total
        FROM venta
        WHERE UPPER(vendedor_cliente) = 'ALEX'
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 5;
    `;
        const res = await pool.query(query);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAlexSales();
