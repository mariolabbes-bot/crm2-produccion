const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

async function fullSyncCheck() {
    console.log('⚖️ Checkeo de Sincronización Total (Excel Recaudacion vs BD)...');

    // 1. Cargar Excel y generar Expected Data Map
    const filePath = path.join(__dirname, '../temp_recaudacion.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    const expectedData = new Map(); // Key -> { montoNeto, originalRow }
    const tempKeyTracker = new Map();

    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };

        const folio = String(getVal([/^Folio$/i]) || '').trim();
        const rawId = String(getVal([/^Identificador_1$/i, /^Identificador.*abono/i]) || '').trim();
        const fechaRaw = getVal([/^Fecha$/i, /Fecha.*abono/i]);
        const montoRaw = getVal([/^Monto$/i]);

        if (!folio || !montoRaw) return;

        const fecha = parseExcelDate(fechaRaw);
        if (fecha && fecha.getMonth() === 1 && fecha.getFullYear() === 2026) {
            const monto = parseNumeric(montoRaw);
            const montoNeto = Math.round(monto / 1.19);

            let baseKey = `${folio}-${rawId}`;
            let finalKey = baseKey;
            let counter = 1;

            while (tempKeyTracker.has(finalKey)) {
                finalKey = `${baseKey}_${counter}`;
                counter++;
            }
            tempKeyTracker.set(finalKey, true);

            expectedData.set(finalKey, { montoNeto, fecha, row });
        }
    });

    console.log(`📊 Excel: ${expectedData.size} registros esperados.`);

    // 2. Traer BD
    const resDb = await pool.query(`
        SELECT id, folio, identificador_abono, monto_neto, fecha 
        FROM abono 
        WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
    `);

    // Map DB
    const dbMap = new Map();
    resDb.rows.forEach(row => {
        const f = String(row.folio || '').trim();
        const i = String(row.identificador_abono || '').trim();
        const key = `${f}-${i}`;
        dbMap.set(key, { ...row, key });
    });

    // 3. Comparar
    const trash = [];
    const missing = [];
    const diffs = [];

    // Check Missing & Diff (Iterate Expected)
    for (const [expKey, expVal] of expectedData) {
        if (!dbMap.has(expKey)) {
            missing.push({ key: expKey, ...expVal });
        } else {
            const dbVal = dbMap.get(expKey);
            const dbMonto = Number(dbVal.monto_neto);
            if (dbMonto !== expVal.montoNeto) {
                diffs.push({ key: expKey, excel: expVal.montoNeto, db: dbMonto, rowId: dbVal.id });
            }
        }
    }

    // Check Trash (Iterate DB)
    for (const [dbKey, dbVal] of dbMap) {
        if (!expectedData.has(dbKey)) {
            trash.push(dbVal);
        }
    }

    // Report
    console.log('\n🚨 REPORTE DE DISCREPANCIAS:');

    console.log(`\n🗑️ BASURA (En DB, no en Excel): ${trash.length}`);
    const trashSum = trash.reduce((s, i) => s + Number(i.monto_neto), 0);
    console.log(`   Suma Basura: $${trashSum.toLocaleString('es-CL')}`);
    if (trash.length > 0) console.table(trash.slice(0, 5).map(t => ({ id: t.id, key: t.key, monto: t.monto_neto })));

    console.log(`\n🕵️ MISSING (En Excel, faltan en DB): ${missing.length}`);
    const missingSum = missing.reduce((s, i) => s + i.montoNeto, 0);
    console.log(`   Suma Missing: $${missingSum.toLocaleString('es-CL')}`);
    if (missing.length > 0) console.table(missing.slice(0, 5).map(m => ({ key: m.key, monto: m.montoNeto })));

    console.log(`\n⚖️ DIFFS (Monto distinto): ${diffs.length}`);
    if (diffs.length > 0) console.table(diffs.slice(0, 5));

    // Balance Final
    // Total DB Actual:
    const dbTotal = resDb.rows.reduce((s, r) => s + Number(r.monto_neto), 0);
    console.log(`\n💰 Balance:`);
    console.log(`   DB Actual: $${dbTotal.toLocaleString('es-CL')}`);
    console.log(`   (-) Basura: $${trashSum.toLocaleString('es-CL')}`);
    console.log(`   (+) Missing: $${missingSum.toLocaleString('es-CL')}`);
    const projected = dbTotal - trashSum + missingSum;
    console.log(`   = PROYECTADO: $${projected.toLocaleString('es-CL')}`);

    // Validar vs Excel Sum (Pre-calculated)
    const excelTotal = Array.from(expectedData.values()).reduce((s, v) => s + v.montoNeto, 0);
    console.log(`   Target Excel: $${excelTotal.toLocaleString('es-CL')}`);

    pool.end();
}

fullSyncCheck();
