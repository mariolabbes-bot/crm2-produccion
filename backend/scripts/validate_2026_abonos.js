
const XLSX = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function validate() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
    const client = await pool.connect();

    console.log('--- 🛡️ FINAL VALIDATION: ABONOS 2026 RECOVERY ---\n');

    // 1. EXCEL DATA
    const wb = XLSX.readFile('backend/bulk_data/IMPORTACION 21-01-2026/RECUPERACION ABONOS 2026.xlsx');
    const excelData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    const excelSummary = {};
    excelData.forEach(r => {
        const vendor = String(r['Vendedor cliente'] || 'Unassigned').trim();
        if (!excelSummary[vendor]) excelSummary[vendor] = { count: 0, bruto: 0, neto: 0 };
        excelSummary[vendor].count++;
        excelSummary[vendor].bruto += (r.Monto || 0);
        excelSummary[vendor].neto += Math.round((r.Monto || 0) / 1.19);
    });

    // 2. DATABASE DATA (Since recovery start)
    const dbRes = await client.query(`
    SELECT vendedor_cliente, monto, monto_neto 
    FROM abono 
    WHERE fecha >= '2026-01-01'
  `);

    const dbSummary = {};
    dbRes.rows.forEach(r => {
        const vendor = String(r.vendedor_cliente || 'Unassigned').trim();
        if (!dbSummary[vendor]) dbSummary[vendor] = { count: 0, bruto: 0, neto: 0 };
        dbSummary[vendor].count++;
        dbSummary[vendor].bruto += parseFloat(r.monto);
        dbSummary[vendor].neto += parseFloat(r.monto_neto);
    });

    // 3. COMPARISON TABEL
    const allVendors = new Set([...Object.keys(excelSummary), ...Object.keys(dbSummary)]);
    const report = [];

    allVendors.forEach(v => {
        const ex = excelSummary[v] || { count: 0, bruto: 0, neto: 0 };
        const db = dbSummary[v] || { count: 0, bruto: 0, neto: 0 };

        report.push({
            Vendor: v,
            Ex_Count: ex.count,
            Db_Count: db.count,
            Count_Diff: db.count - ex.count,
            Ex_Neto: ex.neto,
            Db_Neto: Math.round(db.neto),
            Neto_Diff: Math.round(db.neto) - ex.neto
        });
    });

    console.table(report);

    const errors = report.filter(r => r.Count_Diff !== 0 || r.Neto_Diff !== 0);
    if (errors.length === 0) {
        console.log('\n✅ 100% MATCH: All vendors records and sums are perfectly aligned.');
    } else {
        console.log('\n❌ DISCREPANCIES FOUND in vendors:', errors.map(e => e.Vendor).join(', '));
    }

    // 4. CHECK ASSIGNMENT COVERAGE
    const unassigned = await client.query("SELECT count(*) FROM abono WHERE fecha >= '2026-01-01' AND (vendedor_cliente IS NULL OR vendedor_cliente = 'Unknown' OR vendedor_cliente = 'STUB')");
    console.log(`\nUnassigned/Stub records in DB: ${unassigned.rows[0].count}`);

    client.release();
    pool.end();
}

validate();
