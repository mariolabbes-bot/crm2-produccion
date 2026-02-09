require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkCoverage() {
    try {
        console.log('--- VERIFICACIÓN DE COBERTURA: LUBRICANTES Y APLUS ---');

        // 1. Get Sales that LOOK like Lubricants or Aplus based on Description
        // We use description from Venta because we assume Product link might be missing
        // We check if these SKUs exist in 'clasificacion_productos'

        // Query explanation:
        // Select SKUs from sales where description suggests target category.
        // Left join with Master.
        // Count hits and misses.

        const runCheck = async (label, filter) => {
            console.log(`\n🔍 Analizando: ${label}`);
            const res = await pool.query(`
            WITH TargetSales AS (
                SELECT DISTINCT v.sku, v.descripcion
                FROM venta v
                WHERE ${filter} 
                  AND v.sku IS NOT NULL
            )
            SELECT 
                COUNT(*) as total_distinct_skus,
                COUNT(cp.sku) as found_in_master,
                STRING_AGG(CASE WHEN cp.sku IS NULL THEN ts.sku ELSE NULL END, ', ') as missing_examples
            FROM TargetSales ts
            LEFT JOIN clasificacion_productos cp ON ts.sku = cp.sku
        `);

            const total = parseInt(res.rows[0].total_distinct_skus);
            const found = parseInt(res.rows[0].found_in_master);
            const pct = total > 0 ? ((found / total) * 100).toFixed(1) : '0.0';

            console.log(`   Total SKUs únicos detectados en Ventas: ${total}`);
            console.log(`   Encontrados en Maestro: ${found} (${pct}%)`);

            if (total - found > 0) {
                console.log(`   ⚠️  EJEMPLOS FALTANTES (Top 5):`);
                const missing = (res.rows[0].missing_examples || '').split(', ').slice(0, 5);
                missing.forEach(m => console.log(`      - ${m}`));
            } else {
                console.log(`   ✅ Cobertura Completa.`);
            }
        };

        // LUBRICANTES (Keywords: ACEITE, LUBRICANTE, SHELL, MOBIL, LITRO, 5W30, 10W40)
        await runCheck('Posibles Lubricantes', `
        v.descripcion ILIKE '%ACEITE%' OR 
        v.descripcion ILIKE '%LUBRICANTE%' OR 
        v.descripcion ILIKE '%SHELL%' OR
        v.descripcion ILIKE '%MOBIL%' OR
        v.descripcion ILIKE '%TOTAL%'
    `);

        // APLUS (Keyword: APLUS)
        await runCheck('Productos APLUS', `
        v.descripcion ILIKE '%APLUS%'
    `);

    } catch (e) { console.error(e); } finally { await pool.end(); }
}

checkCoverage();
