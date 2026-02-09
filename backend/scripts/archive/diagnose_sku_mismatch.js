require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const showHidden = (str) => {
    if (!str) return 'NULL';
    return `"${str}" (Len: ${str.length}) [Hex: ${Buffer.from(str).toString('hex')}]`;
};

async function diagnose() {
    try {
        console.log('--- DIAGNÓSTICO PROFUNDO PROBABLE MISMATCH SKU ---');

        // 1. Count Total Mismatches
        const countRes = await pool.query(`
        SELECT COUNT(*) as total,
               COUNT(cp.sku) as matched
        FROM venta v
        LEFT JOIN clasificacion_productos cp ON v.sku = cp.sku
    `);
        console.log(`Total Ventas: ${countRes.rows[0].total}`);
        console.log(`Ventas con Match en Maestro: ${countRes.rows[0].matched} (${((countRes.rows[0].matched / countRes.rows[0].total) * 100).toFixed(1)}%)`);

        // 2. Find examples of NO MATCH but look similar
        // We'll take 10 unmatched sales SKUs and try to find them in Master using fuzzy logic (LIKE or TRIM)
        const unmatched = await pool.query(`
        SELECT DISTINCT v.sku 
        FROM venta v 
        LEFT JOIN clasificacion_productos cp ON v.sku = cp.sku 
        WHERE cp.sku IS NULL AND v.sku IS NOT NULL
        LIMIT 10
    `);

        console.log('\n--- SKUs de Venta SIN Match (Muestra) ---');
        for (const row of unmatched.rows) {
            const vSku = row.sku;
            console.log(`\nVenta SKU: ${showHidden(vSku)}`);

            // Try identifying potential match in Master
            const cleanSku = vSku.trim();
            const potential = await pool.query(`
            SELECT sku FROM clasificacion_productos 
            WHERE sku ILIKE $1 OR TRIM(sku) = $2
            LIMIT 1
        `, [`%${cleanSku}%`, cleanSku]);

            if (potential.rows.length > 0) {
                const mSku = potential.rows[0].sku;
                console.log(`   -> POSIBLE MATCH EN MAESTRO: ${showHidden(mSku)}`);
                console.log(`   -> Diferencia: ${vSku === mSku ? 'IDENTICOS (¿Por qué falló JOIN?)' : 'DIFERENTES'}`);
            } else {
                console.log('   -> No se encontró candidato similar en Maestro.');
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

diagnose();
