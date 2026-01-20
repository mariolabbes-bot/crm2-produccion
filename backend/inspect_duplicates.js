const pool = require('./src/db');

async function inspectDuplicates() {
    try {
        console.log('--- Inspección de Duplicados (Folio 1, Fecha 2024-01-17) ---');

        const res = await pool.query(`
            SELECT id, folio, fecha, identificador, identificador_abono, monto, monto_neto, created_at 
            FROM abono 
            WHERE folio = '1' AND fecha = '2024-01-17' 
        `);

        console.table(res.rows);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

inspectDuplicates();
