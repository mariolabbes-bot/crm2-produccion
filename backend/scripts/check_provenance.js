const pool = require('../src/db');

async function checkProvenance() {
    console.log('🕵️ Investigando Origen de los Datos de Febrero 2026...');

    // Agrupar por fecha de creación (Cuándo se insertaron en el sistema)
    const res = await pool.query(`
        SELECT 
            to_char(created_at, 'YYYY-MM-DD HH24:MI') as fecha_creacion,
            count(*) as registros,
            sum(monto_neto) as total_neto
        FROM abono
        WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
        GROUP BY fecha_creacion
        ORDER BY fecha_creacion DESC
    `);

    console.table(res.rows);

    // Suma Total
    const total = res.rows.reduce((acc, r) => acc + parseInt(r.total_neto), 0);
    console.log(`💰 Total Neto en BD (Febrero): $${total.toLocaleString('es-CL')}`);

    pool.end();
}

checkProvenance();
