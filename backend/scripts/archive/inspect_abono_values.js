const pool = require('../src/db');

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT id, folio, fecha, monto, monto_neto, 
                   (monto / 1.19) as calculated_net
            FROM abono 
            ORDER BY id DESC 
            LIMIT 10
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end(); // Assumes pool has .end() or process exit
    }
}

inspect();
