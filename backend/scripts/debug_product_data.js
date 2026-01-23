require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debug() {
    try {
        console.log('--- DEBUG PRODUCT DATA ---');

        // 1. Check distinct Families, Subfamilies, Brands in PRODUCT table
        console.log('\n1. Muestra de PRODUCTOS (Familia/Subfamilia/Marca):');
        const prodSample = await pool.query(`
        SELECT sku, familia, subfamilia, marca 
        FROM producto 
        WHERE familia IS NOT NULL 
        LIMIT 10
    `);
        console.table(prodSample.rows);

        // 2. Check distinct Families actually sold in Current Month
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        console.log(`\n2. Ventas del Mes (${start} a ${end}):`);
        const salesSample = await pool.query(`
        SELECT COUNT(*) as count 
        FROM venta 
        WHERE fecha_emision BETWEEN $1 AND $2
    `, [start, end]);
        console.log('Total boletas/facturas en rango:', salesSample.rows[0].count);

        // 3. Test JOIN and Filters specific to KPIs
        console.log('\n3. Test JOIN específico KPIs:');

        // LUBRICANTES
        const lubCheck = await pool.query(`
        SELECT COUNT(*) as count, SUM(v.litros_vendidos) as sum_litros
        FROM venta v
        JOIN producto p ON v.sku = p.sku
        WHERE v.fecha_emision BETWEEN $1 AND $2
        AND UPPER(p.familia) = 'LUBRICANTES'
    `, [start, end]);
        console.log('KP1 (Lubricantes):', lubCheck.rows[0]);

        // TBR APLUS
        const tbrCheck = await pool.query(`
        SELECT COUNT(*) as count, SUM(v.cantidad) as sum_units
        FROM venta v
        JOIN producto p ON v.sku = p.sku
        WHERE v.fecha_emision BETWEEN $1 AND $2
        AND UPPER(p.subfamilia) = 'TBR' AND UPPER(p.marca) = 'APLUS'
    `, [start, end]);
        console.log('KP2 (TBR Aplus):', tbrCheck.rows[0]);

        // 4. Why 0? Let's see what IS there.
        console.log('\n4. ¿Qué familias SÍ tienen ventas este mes?');
        const whatSold = await pool.query(`
        SELECT p.familia, p.subfamilia, p.marca, COUNT(*) as txs
        FROM venta v
        LEFT JOIN producto p ON v.sku = p.sku
        WHERE v.fecha_emision BETWEEN $1 AND $2
        GROUP BY p.familia, p.subfamilia, p.marca
        ORDER BY txs DESC
        LIMIT 20
    `, [start, end]);
        console.table(whatSold.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

debug();
