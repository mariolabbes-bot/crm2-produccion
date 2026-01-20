const pool = require('./src/db');

async function resetJan26() {
    try {
        console.log('--- Reseteando Abonos Enero 2026 ---');
        const countBefore = await pool.query("SELECT COUNT(*) FROM abono WHERE fecha >= '2026-01-01' AND fecha < '2026-02-01'");
        console.log(`Registros actuales: ${countBefore.rows[0].count}`);

        const res = await pool.query("DELETE FROM abono WHERE fecha >= '2026-01-01' AND fecha < '2026-02-01'");
        console.log(`Eliminados: ${res.rowCount}`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

resetJan26();
