const pool = require('./src/db');

async function inspectDiff() {
    try {
        console.log('--- Inspecting Folio 222088 in DB ---');
        const res = await pool.query(`
            SELECT id, folio, fecha, identificador_abono, monto, monto_neto, created_at
            FROM abono
            WHERE folio = '222088'
        `);
        console.table(res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspectDiff();
