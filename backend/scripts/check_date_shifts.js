const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

async function checkDateShifts() {
    console.log('📅 Buscando Desplazamientos de Mes (Excel dice Feb, BD dice Otro)...');

    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    // Cargar Mapa de BD
    const resDb = await pool.query(`SELECT folio, identificador_abono, fecha, monto_neto FROM abono`);
    const dbMap = new Map();
    resDb.rows.forEach(row => {
        const key = `${row.folio}-${row.identificador_abono || ''}`;
        dbMap.set(key, row.fecha); // Guardamos la fecha guardada en BD
    });

    let shiftCount = 0;
    let shiftMonto = 0;
    const examples = [];

    const excelErrors = [];

    data.forEach(row => {
        // Headers parsing
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };

        const folio = String(getVal([/^Folio$/i]) || '').trim();
        const idAbono = String(getVal([/^Identificador_1$/i, /^Identificador.*abono/i]) || '').trim();
        const fechaRaw = getVal([/^Fecha$/i, /Fecha.*abono/i]);
        const montoRaw = getVal([/^Monto$/i]);

        if (!folio || !montoRaw || !fechaRaw) return;

        const monto = parseNumeric(montoRaw);
        const montoNeto = Math.round(monto / 1.19);
        const fechaExcel = parseExcelDate(fechaRaw);

        if (!fechaExcel) return;

        const key = `${folio}-${idAbono}`;
        const fechaDb = dbMap.get(key);

        if (fechaDb) {
            const dDb = new Date(fechaDb);
            const dExcel = fechaExcel;

            // Comparar MES
            // Queremos ver casos donde Excel es FEB (Month=1) y DB NO ES FEB
            if (dExcel.getMonth() === 1 && dExcel.getFullYear() === 2026) {
                if (dDb.getMonth() !== 1 || dDb.getFullYear() !== 2026) {
                    shiftCount++;
                    shiftMonto += montoNeto;
                    if (examples.length < 10) {
                        examples.push({
                            folio,
                            idAbono,
                            fechaExcel: dExcel.toISOString().split('T')[0],
                            fechaDb: dDb.toISOString().split('T')[0], // probable YYYY-MM-DD
                            montoNeto
                        });
                    }
                }
            }
        }
    });

    console.log(`\n🚨 RESULTADO: ${shiftCount} registros son Febrero en Excel pero OTRO MES en BD.`);
    console.log(`💰 Monto Neto Desplazado: $${shiftMonto.toLocaleString('es-CL')}`);

    if (examples.length > 0) {
        console.log('\n🔍 Ejemplos:');
        console.table(examples);
    } else {
        console.log('✅ No se detectaron desplazamientos de mes para registros de Febrero.');
    }

    pool.end();
}

checkDateShifts();
