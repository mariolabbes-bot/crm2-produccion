const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

async function checkAmountMismatch() {
    console.log('💰 Buscando Discrepancias de Monto (Excel vs BD)...');

    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    // Cargar Mapa de BD
    const resDb = await pool.query(`SELECT folio, identificador_abono, monto, monto_neto FROM abono`);
    const dbMap = new Map();
    resDb.rows.forEach(row => {
        const key = `${row.folio}-${row.identificador_abono || ''}`;
        dbMap.set(key, { monto: Number(row.monto), montoNeto: Number(row.monto_neto) });
    });

    let diffCount = 0;
    let totalDiff = 0;
    const examples = [];

    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };

        const folio = String(getVal([/^Folio$/i]) || '').trim();
        const idAbono = String(getVal([/^Identificador_1$/i, /^Identificador.*abono/i]) || '').trim();
        const montoRaw = getVal([/^Monto$/i]);

        if (!folio || !montoRaw) return;

        const montoExcel = parseNumeric(montoRaw);
        if (!montoExcel) return;

        const key = `${folio}-${idAbono}`;
        const dbVal = dbMap.get(key);

        if (dbVal) {
            const diff = Math.abs(dbVal.monto - montoExcel);
            if (diff > 100) { // Tolerancia $100 pesos
                diffCount++;
                totalDiff += (montoExcel - dbVal.monto); // Positivo si Excel > BD
                if (examples.length < 10) {
                    examples.push({
                        folio, idAbono,
                        excel: montoExcel,
                        bd: dbVal.monto,
                        diff: montoExcel - dbVal.monto
                    });
                }
            }
        }
    });

    console.log(`\n🚨 RESULTADO: ${diffCount} registros con diferencia de monto.`);
    console.log(`💰 Diferencia Total (Excel - BD): $${totalDiff.toLocaleString('es-CL')}`);

    if (examples.length > 0) {
        console.table(examples);
    }

    pool.end();
}

checkAmountMismatch();
