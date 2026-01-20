const pool = require('./src/db');
const { norm } = require('./src/services/importers/utils');

async function testInsert() {
    try {
        console.log('--- Intentando insertar fila manual para Folio 222088 ---');

        // Data from Excel for missing row
        const row = {
            folio: '222088',
            fecha: '2026-01-16', // 46038 -> 2026-01-16
            identificador_abono: '276615_manual_1', // Suffix
            monto: 419016
        };

        const query = `
            INSERT INTO abono (folio, fecha, identificador_abono, monto, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (folio, identificador_abono, fecha) DO UPDATE SET
                monto = EXCLUDED.monto
            RETURNING (xmax = 0) AS inserted, id
        `;

        const res = await pool.query(query, [row.folio, row.fecha, row.identificador_abono, row.monto]);
        console.log('Resultado:', res.rows[0]);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testInsert();
