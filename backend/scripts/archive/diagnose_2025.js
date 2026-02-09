const pool = require('../src/db');

async function check2025() {
    try {
        console.log('--- Diagnóstico Enero 2025 ---');

        const start = '2025-01-01';
        const end = '2025-01-31';

        // 1. Count rows
        const resCount = await pool.query("SELECT COUNT(*) FROM venta WHERE fecha_emision BETWEEN $1 AND $2", [start, end]);
        console.log(`Total Ventas Enero 2025: ${resCount.rows[0].count}`);

        // 2. Count null SKUs
        const resNull = await pool.query("SELECT COUNT(*) FROM venta WHERE fecha_emision BETWEEN $1 AND $2 AND sku IS NULL", [start, end]);
        console.log(`Ventas con SKU NULL: ${resNull.rows[0].count}`);

        // 3. Count Join
        const resJoin = await pool.query(`
            SELECT COUNT(*) 
            FROM venta v
            JOIN clasificacion_productos cp ON v.sku = cp.sku
            WHERE v.fecha_emision BETWEEN $1 AND $2
        `, [start, end]);
        console.log(`Ventas 2025 con Match en Maestro: ${resJoin.rows[0].count}`);

        // 4. Sample Dates (to verify format)
        const resDates = await pool.query("SELECT MIN(fecha_emision), MAX(fecha_emision) FROM venta WHERE fecha_emision BETWEEN '2025-01-01' AND '2025-12-31'");
        console.log('Rango Fechas 2025:', resDates.rows[0]);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check2025();
