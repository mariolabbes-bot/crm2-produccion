require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Normalizer: removes spaces, dashes, dots, and uppercases
const clean = (str) => String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

async function analyze() {
    try {
        console.log('--- ANÁLISIS DE CALIDAD DE MATCH DE SKUS ---');

        // 1. Load ALL Master SKUs into memory
        const masterRes = await pool.query("SELECT sku FROM clasificacion_productos");
        const masterSkus = masterRes.rows.map(r => r.sku);
        const masterCleanMap = new Map(); // Cleaned -> Original
        masterSkus.forEach(s => masterCleanMap.set(clean(s), s));

        console.log(`Total SKUs en Maestro: ${masterSkus.length}`);

        // 2. Get Top Unmatched Sales SKUs
        const salesRes = await pool.query(`
        SELECT v.sku, COUNT(*) as txs 
        FROM venta v 
        LEFT JOIN clasificacion_productos cp ON v.sku = cp.sku 
        WHERE cp.sku IS NULL 
        GROUP BY v.sku 
        ORDER BY txs DESC 
        LIMIT 50
    `);

        console.log(`Top 50 SKUs de Venta SIN MATCH directo:`);
        console.log('----------------------------------------------------------------');
        console.log('| Venta SKU (Original) | Transacciones | Causa Probable | Sugerencia Maestro |');
        console.log('----------------------------------------------------------------');

        let formatIssues = 0;
        let missingData = 0;

        for (const row of salesRes.rows) {
            const vSku = row.sku;
            const vClean = clean(vSku);

            let cause = 'FALTA EN MAESTRO';
            let suggestion = '---';

            if (masterCleanMap.has(vClean)) {
                cause = 'FORMATO DIFERENTE';
                suggestion = masterCleanMap.get(vClean);
                formatIssues++;
            } else {
                // Try partial match?
                const partial = [...masterCleanMap.keys()].find(k => k.includes(vClean) || vClean.includes(k));
                if (partial) {
                    cause = 'PARCIALMENTE SIMILAR';
                    suggestion = masterCleanMap.get(partial);
                } else {
                    missingData++;
                }
            }

            const pad = (s, n) => String(s).padEnd(n).slice(0, n);
            console.log(`| ${pad(vSku, 20)} | ${pad(row.txs, 13)} | ${pad(cause, 14)} | ${pad(suggestion, 18)} |`);
        }

        console.log('----------------------------------------------------------------');
        console.log(`\nRESUMEN:`);
        console.log(`- Problemas de Formato (Espacios/-): ${formatIssues}`);
        console.log(`- Datos Faltantes (No existen):      ${missingData}`);

    } catch (e) { console.error(e); } finally { await pool.end(); }
}

analyze();
