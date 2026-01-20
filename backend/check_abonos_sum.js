const pool = require('./src/db');

async function checkAbonos() {
    try {
        console.log('--- Verificación de Totales de Abonos ---');

        // 1. Count
        const countRes = await pool.query('SELECT COUNT(*) FROM abono');
        console.log(`Total Registros: ${countRes.rows[0].count}`);

        // 2. Sums
        const sumsRes = await pool.query(`
            SELECT 
                SUM(monto) as sum_monto_total_col,
                SUM(monto_neto) as sum_monto_neto,
                SUM(monto_total) as sum_monto_total_explicit
            FROM abono
        `);

        const r = sumsRes.rows[0];
        console.log(`Suma columna 'monto' (Excel Header 'Monto'): $${parseInt(r.sum_monto_total_col).toLocaleString('es-CL')}`);
        console.log(`Suma columna 'monto_neto' (Calc / 1.19):    $${parseInt(r.sum_monto_neto).toLocaleString('es-CL')}`);
        console.log(`Suma columna 'monto_total' (Excel Header 'Monto Total'): $${parseInt(r.sum_monto_total_explicit || 0).toLocaleString('es-CL')}`);

        // 3. Check for recent duplicates (same folio/date)
        const dupRes = await pool.query(`
            SELECT folio, fecha, COUNT(*) 
            FROM abono 
            GROUP BY folio, fecha 
            HAVING COUNT(*) > 1 
            LIMIT 5
        `);

        if (dupRes.rows.length > 0) {
            console.log('\n⚠️ Posibles duplicados detectados (mismo folio y fecha, distinto identificador_abono?):');
            console.table(dupRes.rows);
        } else {
            console.log('\n✅ No se detectaron duplicados simples (folio+fecha).');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkAbonos();
