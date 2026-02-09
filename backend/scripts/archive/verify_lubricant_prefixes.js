require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkPrefixes() {
    try {
        console.log('--- VERIFICACIÓN DE COBERTURA: LUBRICANTES CLAVE (SHE, TOT, LIQ, MOB, GG) ---');

        const prefixes = ['SHE', 'TOT', 'LIQ', 'MOB', 'GG'];

        // Build OR clause for SKU prefixes
        const prefixClause = prefixes.map(p => `v.sku ILIKE '${p}%'`).join(' OR ');

        console.log(`Filtro: ${prefixClause}`);

        const res = await pool.query(`
        WITH TargetSales AS (
            SELECT DISTINCT v.sku, v.descripcion
            FROM venta v
            WHERE (${prefixClause}) 
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

        console.log(`\nRESULTADOS:`);
        console.log(`   Total SKUs únicos (Prefijos Clave): ${total}`);
        console.log(`   Encontrados en Maestro: ${found} (${pct}%)`);

        if (total - found > 0) {
            console.log(`   ⚠️  EJEMPLOS FALTANTES (Top 10):`);
            const missing = (res.rows[0].missing_examples || '').split(', ').slice(0, 10);
            missing.forEach(m => console.log(`      - ${m}`));
        } else {
            console.log(`   ✅ Cobertura Completa.`);
        }

    } catch (e) { console.error(e); } finally { await pool.end(); }
}

checkPrefixes();
