const pool = require('../src/db');

async function verifyKpis() {
    try {
        console.log('--- Verificando KPIs en BD (Comparativo) ---');

        const periodos = [
            { label: 'Enero 2026 (Current)', start: '2026-01-01', end: '2026-01-31' },
            { label: 'Enero 2025 (Last Year)', start: '2025-01-01', end: '2025-01-31' }
        ];

        for (const p of periodos) {
            console.log(`\n>>> ${p.label}`);
            const runQuery = async (label, value, where) => {
                const res = await pool.query(`
                    SELECT SUM(${value}) as total
                    FROM venta v
                    JOIN clasificacion_productos cp ON v.sku = cp.sku
                    WHERE v.fecha_emision BETWEEN $1 AND $2
                      AND ${where}
                `, [p.start, p.end]);
                console.log(`[${label}]: ${parseFloat(res.rows[0].total || 0).toFixed(2)}`);
            };

            // 1. Lubricantes
            await runQuery('Litros Lubricantes', 'v.cantidad * cp.litros', "UPPER(cp.familia) LIKE '%LUBRICANTE%'");

            // 2. TBR
            await runQuery('Unidades TBR', 'v.cantidad', "UPPER(cp.subfamilia) LIKE '%TBR%'");

            // 3. PCR
            await runQuery('Unidades PCR', 'v.cantidad', "UPPER(cp.subfamilia) LIKE '%PCR%'");

            // 4. Reencauche
            await runQuery('Unidades Reencauche', 'v.cantidad', "UPPER(cp.familia) LIKE '%REENCAUCHE%'");
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

verifyKpis();
