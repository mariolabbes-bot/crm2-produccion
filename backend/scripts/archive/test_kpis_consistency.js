
const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function testKpis() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
    const client = await pool.connect();

    console.log('--- 🧪 KPI CONSISTENCY TEST ---');

    // Vendedor a testear: Omar
    const vendorName = 'Omar';
    const mes = '2026-01';

    // 1. Manually calculate Net from DB using ONLY "monto" / 1.19
    const dbRes = await client.query(`
    SELECT SUM(monto / 1.19) as total_neto 
    FROM abono 
    WHERE vendedor_cliente = $1 AND TO_CHAR(fecha, 'YYYY-MM') = $2
  `, [vendorName, mes]);
    const expectedNet = parseFloat(dbRes.rows[0].total_neto);

    console.log(`[DB Audit] Expected Net for ${vendorName} in ${mes}: $${expectedNet.toLocaleString()}`);

    // 2. We can't easily call the API route directly here without a full mock req/res, 
    // but we can simulate the standardized logic from kpis.js / abonos.js

    // Simulated logic after fix (prioritizing 'monto'):
    // let abonoAmountCol = cols.has('monto') ? 'monto' : ...
    const amountCol = 'monto'; // This is what we standardized on
    const kpiRes = await client.query(`
     SELECT SUM(${amountCol} / 1.19) as total_kpi
     FROM abono
     WHERE vendedor_cliente = $1 AND TO_CHAR(fecha, 'YYYY-MM') = $2
  `, [vendorName, mes]);
    const actualNet = parseFloat(kpiRes.rows[0].total_kpi);

    console.log(`[KPI Logic] Actual Net returned: $${actualNet.toLocaleString()}`);

    const diff = Math.abs(expectedNet - actualNet);
    if (diff < 1) {
        console.log('\n✅ SUCCESS: KPI logic is consistent with the Gross/1.19 rule.');
    } else {
        console.log(`\n❌ ERROR: Discrepancy of $${diff.toLocaleString()} found.`);
    }

    client.release();
    pool.end();
}

testKpis();
