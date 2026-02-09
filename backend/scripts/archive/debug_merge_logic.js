
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugMergeLogic() {
    try {
        console.log('--- DEBUG MERGE LOGIC ---');

        const dateFormat = 'YYYY-MM';
        const params = []; // No filter, just global dump for a specific month to see keys
        const rangeParams = ['2025-01-01', '2025-01-31'];

        // 1. Query Sales (Ventas)
        // We suspect it uses 'vendedor_cliente' if available
        const salesQuery = `
            SELECT 
                TO_CHAR(fecha_emision, '${dateFormat}') as periodo,
                vendedor_cliente as vendedor_key,
                vendedor_cliente as raw_key,
                SUM(valor_total) as total_ventas
            FROM venta
            WHERE fecha_emision >= $1 AND fecha_emision <= $2
            GROUP BY TO_CHAR(fecha_emision, '${dateFormat}'), vendedor_cliente
        `;
        const salesRes = await pool.query(salesQuery, rangeParams);
        console.log(`Sales Rows: ${salesRes.rows.length}`);
        if (salesRes.rows.length > 0) console.log('Sample Sales Raw:', salesRes.rows[0]);

        // 2. Query Abonos
        // Uses 'vendedor_cliente'
        const abonosQuery = `
            SELECT 
                TO_CHAR(fecha, '${dateFormat}') as periodo,
                vendedor_cliente as vendedor_key,
                vendedor_cliente as raw_key,
                SUM(monto) as total_abonos
            FROM abono
            WHERE fecha >= $1 AND fecha <= $2
            GROUP BY TO_CHAR(fecha, '${dateFormat}'), vendedor_cliente
        `;
        const abonosRes = await pool.query(abonosQuery, rangeParams);
        console.log(`Abonos Rows: ${abonosRes.rows.length}`);
        if (abonosRes.rows.length > 0) console.log('Sample Abonos Raw:', abonosRes.rows[0]);

        // 3. Simulate Merge in Memory
        const periodoVendedorMap = new Map();

        // Process Sales
        salesRes.rows.forEach(row => {
            const keyRaw = row.vendedor_key ? String(row.vendedor_key).trim().toUpperCase() : 'UNKNOWN';
            const key = `${row.periodo}-${keyRaw}`;
            periodoVendedorMap.set(key, {
                periodo: row.periodo,
                vendedor_key: keyRaw,
                sales_found: true,
                abonos_found: false
            });
        });

        // Process Abonos
        let matches = 0;
        let mismatches = 0;
        abonosRes.rows.forEach(row => {
            const keyRaw = row.vendedor_key ? String(row.vendedor_key).trim().toUpperCase() : 'UNKNOWN';
            const key = `${row.periodo}-${keyRaw}`;
            const existing = periodoVendedorMap.get(key);

            if (existing) {
                matches++;
                existing.abonos_found = true;
                existing.abonos_val = row.total_abonos;
            } else {
                mismatches++;
                console.log(`MISMATCH! Abono Key '${key}' not found in Sales keys.`);
                // console.log(`Keys available in Sales:`, Array.from(periodoVendedorMap.keys())); // Too spammy
            }
        });

        console.log(`\nMerge Results for 2025-01:`);
        console.log(`Matches: ${matches}`);
        console.log(`Mismatches (Abonos without Sales): ${mismatches}`);

        // Dump keys comparison
        const sKeys = new Set(salesRes.rows.map(r => r.vendedor_key ? String(r.vendedor_key).trim().toUpperCase() : 'UNKNOWN'));
        const aKeys = new Set(abonosRes.rows.map(r => r.vendedor_key ? String(r.vendedor_key).trim().toUpperCase() : 'UNKNOWN'));

        console.log('\nKeys in Sales but not Abonos:', [...sKeys].filter(x => !aKeys.has(x)));
        console.log('Keys in Abonos but not Sales:', [...aKeys].filter(x => !sKeys.has(x)));

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debugMergeLogic();
