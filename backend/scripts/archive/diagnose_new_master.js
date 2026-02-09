const pool = require('../src/db');

async function diagnose() {
    try {
        console.log('--- Diagnóstico de Cobertura ---');

        // 1. Total Ventas
        const resVentas = await pool.query('SELECT COUNT(*) FROM venta WHERE fecha_emision BETWEEN \'2026-01-01\' AND \'2026-01-31\'');
        console.log(`Total Ventas Enero: ${resVentas.rows[0].count}`);

        // 2. Cobertura JOIN
        const resJoin = await pool.query(`
            SELECT COUNT(*) 
            FROM venta v
            JOIN clasificacion_productos cp ON v.sku = cp.sku
            WHERE v.fecha_emision BETWEEN '2026-01-01' AND '2026-01-31'
        `);
        console.log(`Ventas con Match en Maestro: ${resJoin.rows[0].count}`);

        // 3. Muestra de SKUs sin match que DEBERIAN ser Lubricantes (por descripcion)
        const resMiss = await pool.query(`
            SELECT DISTINCT v.sku, v.descripcion
            FROM venta v
            LEFT JOIN clasificacion_productos cp ON v.sku = cp.sku
            WHERE v.fecha_emision BETWEEN '2026-01-01' AND '2026-01-31'
              AND cp.sku IS NULL
              AND (v.descripcion LIKE '%HELIX%' OR v.descripcion LIKE '%11R22.5%') 
            LIMIT 5
        `);
        console.log('\n--- Muestra SKUs sin Match (Helix/11R22.5) ---');
        console.table(resMiss.rows);

        // 4. Ver qué hay en el maestro para un SKU fallido (si existe uno en la muestra)
        if (resMiss.rows.length > 0) {
            const sampleSku = resMiss.rows[0].sku;
            console.log(`\nBuscando SKU '${sampleSku}' en Maestro (con LIKE)...`);
            if (sampleSku) {
                const resSearch = await pool.query(`SELECT * FROM clasificacion_productos WHERE sku LIKE $1`, [`%${sampleSku.substring(0, 5)}%`]);
                console.table(resSearch.rows.slice(0, 5));
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

diagnose();
