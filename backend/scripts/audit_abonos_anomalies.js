const pool = require('../src/db');

async function checkAnomalies() {
    try {
        console.log('🔍 Buscando anomalías en ABONOS Febrero 2026...');

        // 1. Top Montos (Outliers)
        const resTop = await pool.query(`
            SELECT folio, fecha, cliente, monto, vendedor_cliente
            FROM abono 
            WHERE fecha >= '2026-02-01'
            ORDER BY monto DESC
            LIMIT 10
        `);
        console.log('\n💰 Top 10 Montos:');
        console.table(resTop.rows);

        // 2. Folios Consecutivos (Mismo Cliente, Mismo Monto, Folio cercano)
        // Usamos una auto-join para encontrar pares sospechosos
        const resConsec = await pool.query(`
            SELECT a1.folio as folio_1, a2.folio as folio_2, 
                   a1.cliente, a1.monto, a1.fecha, a1.vendedor_cliente
            FROM abono a1
            JOIN abono a2 ON a1.cliente = a2.cliente 
                          AND a1.monto = a2.monto 
                          AND a1.fecha = a2.fecha
                          AND a1.folio <> a2.folio
                          AND ABS(CAST(a1.folio AS INTEGER) - CAST(a2.folio AS INTEGER)) = 1
            WHERE a1.fecha >= '2026-02-01'
            ORDER BY a1.cliente, a1.folio ASC
        `);
        console.log(`\n⚠️ Folios Consecutivos Sospechosos (Mismo Cliente+Monto+Fecha): ${resConsec.rowCount} pares encontrados.`);
        console.table(resConsec.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkAnomalies();
