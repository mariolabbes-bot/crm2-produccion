const pool = require('../src/db');

async function checkDateDistribution() {
    console.log('📅 Distribución de Fechas en Abonos (DB vs Excel logic)...');

    // 1. Totales por Mes en BD
    const res = await pool.query(`
        SELECT to_char(fecha, 'YYYY-MM') as mes, count(*) as count, sum(monto_neto) as total_neto
        FROM abono
        GROUP BY mes
        ORDER BY mes DESC
    `);
    console.table(res.rows);

    // 2. Totales específicos Febrero 2026 (Lo que ve el Dashboard)
    const resFeb = await pool.query(`
        SELECT count(*) as count, sum(monto_neto) as total_neto, sum(monto) as total_bruto
        FROM abono
        WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
    `);
    console.log('\n🔍 Dashboard Febrero 2026 (BD):');
    console.log(`   Count: ${resFeb.rows[0].count}`);
    console.log(`   Total Neto: $${parseInt(resFeb.rows[0].total_neto).toLocaleString('es-CL')}`);
    console.log(`   Total Bruto: $${parseInt(resFeb.rows[0].total_bruto).toLocaleString('es-CL')}`);

    pool.end();
}

checkDateDistribution();
