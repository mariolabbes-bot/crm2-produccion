
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkDates() {
    try {
        console.log('--- CHECK DATA YEAR DISTRIBUTION ---');
        console.log('Current System Date:', new Date().toISOString());

        // Check Sales Years
        const salesRes = await pool.query(`
            SELECT 
                EXTRACT(YEAR FROM fecha_emision) as anio, 
                TO_CHAR(fecha_emision, 'YYYY-MM') as mes,
                COUNT(*) as count 
            FROM venta 
            GROUP BY 1, 2 
            ORDER BY 1 DESC, 2 DESC 
            LIMIT 10
        `);
        console.log('\nTop 10 Recent Sales Months:');
        console.table(salesRes.rows);

        // Check Abonos Years
        const abonosRes = await pool.query(`
            SELECT 
                EXTRACT(YEAR FROM fecha) as anio, 
                TO_CHAR(fecha, 'YYYY-MM') as mes,
                COUNT(*) as count 
            FROM abono 
            GROUP BY 1, 2 
            ORDER BY 1 DESC, 2 DESC 
            LIMIT 10
        `);
        console.log('\nTop 10 Recent Abonos Months:');
        console.table(abonosRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkDates();
