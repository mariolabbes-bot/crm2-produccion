
const XLSX = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function auditOmar() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
    const client = await pool.connect();

    console.log('🔍 AUDIT REPORT: OMAR MALDONADO (2026-01-21 Import)\n');

    // --- 1. EXCEL: VENTAS ---
    const vWB = XLSX.readFile('backend/bulk_data/IMPORTACION 21-01-2026/VENTAS.xlsx');
    const vData = XLSX.utils.sheet_to_json(vWB.Sheets[vWB.SheetNames[0]]);
    const omarVentasExcel = vData.filter(r =>
        String(r['Vendedor cliente'] || '').trim().toLowerCase().includes('omar') ||
        String(r['Vendedor documento'] || '').trim().toLowerCase().includes('omar')
    );

    console.log(`📊 EXCEL VENTAS (Total Filas: ${omarVentasExcel.length})`);
    let totalVentasExcel = 0;
    omarVentasExcel.forEach(r => {
        const val = (r.Cantidad || 0) * (r.Precio || 0);
        totalVentasExcel += val;
        // Log sample lines or specific ones if needed
    });
    console.log(`   Sum Net Total: $${totalVentasExcel.toLocaleString()}\n`);

    // --- 2. EXCEL: ABONOS ---
    const aWB = XLSX.readFile('backend/bulk_data/IMPORTACION 21-01-2026/ABONOS.xlsx');
    const aData = XLSX.utils.sheet_to_json(aWB.Sheets[aWB.SheetNames[0]]);
    const omarAbonosExcel = aData.filter(r =>
        String(r['Vendedor cliente'] || '').trim().toLowerCase().includes('omar')
    );

    console.log(`📊 EXCEL ABONOS (Total Filas: ${omarAbonosExcel.length})`);
    let totalAbonosExcelBruto = 0;
    let totalAbonosExcelNetoCalc = 0;
    omarAbonosExcel.forEach(r => {
        totalAbonosExcelBruto += (r.Monto || 0);
        totalAbonosExcelNetoCalc += Math.round((r.Monto || 0) / 1.19);
    });
    console.log(`   Sum Bruto Total: $${totalAbonosExcelBruto.toLocaleString()}`);
    console.log(`   Sum Net (Calc):  $${totalAbonosExcelNetoCalc.toLocaleString()}\n`);

    // --- 3. DATABASE: VENTAS (Today) ---
    const vDbRes = await client.query(`
    SELECT folio, valor_total, fecha_emision 
    FROM venta 
    WHERE vendedor_cliente ILIKE '%Omar%' AND created_at >= '2026-01-21'
  `);
    console.log(`📊 DATABASE VENTAS (Total Registros: ${vDbRes.rowCount})`);
    let totalVentasDb = 0;
    vDbRes.rows.forEach(r => totalVentasDb += parseFloat(r.valor_total));
    console.log(`   Sum Database Total: $${totalVentasDb.toLocaleString()}\n`);

    // --- 4. DATABASE: ABONOS (Today) ---
    const aDbRes = await client.query(`
    SELECT folio, monto, monto_neto, vendedor_cliente, created_at 
    FROM abono 
    WHERE vendedor_cliente ILIKE '%Omar%' AND created_at >= '2026-01-22T03:00:00Z'
  `);
    console.log(`📊 DATABASE ABONOS (Today, since bulk start: 2026-01-22 03:00 UT): ${aDbRes.rowCount}`);
    let totalAbonosDbBruto = 0;
    let totalAbonosDbNeto = 0;
    const vendorDist = {};

    aDbRes.rows.forEach(r => {
        totalAbonosDbBruto += parseFloat(r.monto || 0);
        totalAbonosDbNeto += parseFloat(r.monto_neto || 0);
        vendorDist[r.vendedor_cliente] = (vendorDist[r.vendedor_cliente] || 0) + 1;
    });
    console.log(`   Sum Database Bruto: $${totalAbonosDbBruto.toLocaleString()}`);
    console.log(`   Sum Database Neto:  $${totalAbonosDbNeto.toLocaleString()}`);
    console.log('   Vendor Distribution in DB Results:', JSON.stringify(vendorDist, null, 2), '\n');

    // --- 5. DISCREPANCY ANALYSIS ---
    console.log('--- RESUMEN DE COMPATIBILIDAD ---');
    const vDiff = totalVentasExcel - totalVentasDb;
    const aDiff = totalAbonosExcelNetoCalc - totalAbonosDbNeto;

    console.log(`Ventas (Excel vs DB): ${vDiff === 0 ? '✅ 100% IDENTICO' : '❌ DIFERENCIA: $' + vDiff.toLocaleString()}`);
    console.log(`Abonos (Excel Neto vs DB Neto): ${aDiff === 0 ? '✅ 100% IDENTICO' : '❌ DIFERENCIA: $' + aDiff.toLocaleString()}`);

    if (vDiff !== 0 || aDiff !== 0) {
        console.log('\n--- ANALISIS DE FILAS FALTANTES ---');
        // Look for Folios in Excel not in DB
        const excelVFolios = new Set(omarVentasExcel.map(r => String(r.Folio)));
        const dbVFolios = new Set(vDbRes.rows.map(r => String(r.folio)));

        const missingV = [...excelVFolios].filter(f => !dbVFolios.has(f));
        if (missingV.length > 0) console.log(`Ventas Folios en Excel pero NO en DB: ${missingV.join(', ')}`);

        const excelAFolios = new Set(omarAbonosExcel.map(r => String(r.Folio)));
        const dbAFolios = new Set(aDbRes.rows.map(r => String(r.folio)));
        const missingA = [...excelAFolios].filter(f => !dbAFolios.has(f));
        if (missingA.length > 0) console.log(`Abonos Folios en Excel pero NO en DB: ${missingA.join(', ')}`);
    }

    client.release();
    pool.end();
}

auditOmar();
