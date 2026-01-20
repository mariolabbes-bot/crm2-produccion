const pool = require('./src/db');

async function checkAbonos() {
    try {
        console.log('--- Verificación Granular de Abonos ---');

        // 1. General Count
        const countRes = await pool.query('SELECT COUNT(*) FROM abono');
        const totalRows = parseInt(countRes.rows[0].count);
        console.log(`Total Registros: ${totalRows}`);

        // 2. NULL/Zero Netos
        const badNeto = await pool.query(`
            SELECT COUNT(*) 
            FROM abono 
            WHERE monto_neto IS NULL OR monto_neto = 0
        `);
        const badNetoCount = parseInt(badNeto.rows[0].count);
        console.log(`Registros con monto_neto NULL o 0: ${badNetoCount} (${((badNetoCount / totalRows) * 100).toFixed(1)}%)`);

        // 3. Totales por Mes (Últimos 6 Meses con datos)
        console.log('\n--- Totales por Mes (Últimos 6 con datos) ---');
        const monthStatus = await pool.query(`
            SELECT 
                TO_CHAR(fecha, 'YYYY-MM') as mes,
                COUNT(*) as count,
                SUM(monto) as sum_monto_bruto,
                SUM(monto_neto) as sum_monto_neto
            FROM abono
            GROUP BY TO_CHAR(fecha, 'YYYY-MM')
            HAVING SUM(monto) > 0
            ORDER BY mes DESC
            LIMIT 6
        `);

        const formatMoney = (val) => '$' + (parseInt(val) || 0).toLocaleString('es-CL');

        console.table(monthStatus.rows.map(r => ({
            mes: r.mes,
            count: r.count,
            bruto: formatMoney(r.sum_monto_bruto),
            neto: formatMoney(r.sum_monto_neto),
            ratio: r.sum_monto_neto > 0 ? (r.sum_monto_bruto / r.sum_monto_neto).toFixed(2) : 'N/A'
        })));


        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkAbonos();
