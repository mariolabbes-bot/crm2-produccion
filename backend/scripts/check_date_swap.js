const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

async function checkDateSwap() {
    console.log('🔄 Buscando Fechas Invertidas (Excel Enero -> BD Febrero)...');

    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    const resDb = await pool.query(`SELECT folio, identificador_abono, fecha, monto_neto FROM abono WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'`);
    const dbMap = new Map();
    resDb.rows.forEach(row => {
        const key = `${row.folio}-${row.identificador_abono || ''}`;
        dbMap.set(key, new Date(row.fecha));
    });

    let swapCount = 0;
    let swapMonto = 0;
    const examples = [];

    data.forEach(row => {
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
        const fechaExcel = parseExcelDate(fechaRaw); // Mi parser estricto DD/MM/YYYY

        if (!fechaExcel) return;

        const key = `${folio}-${idAbono}`;
        const fechaDb = dbMap.get(key);

        if (fechaDb) {
            // Caso sospechoso:
            // Excel dice Enero (Month=0)
            // BD dice Febrero (Month=1)
            // Y los días/meses están cruzados (Excel Day = BD Month + 1, Excel Month + 1 = BD Day)

            if (fechaExcel.getMonth() === 0 && fechaDb.getMonth() === 1) { // Excel Enero vs BD Febrero
                // Verificar si fue un swap
                // Ej: Excel 02/01 (2 Jan) -> BD 01/02 (1 Feb)
                // Excel Day=2, Month=0. BD Day=1, Month=1.
                // Swap probable: Excel Day == BD Month+1 AND Excel Month+1 == BD Day

                const excelDay = fechaExcel.getDate();
                const excelMonth = fechaExcel.getMonth() + 1;

                const dbDay = fechaDb.getDate(); // Ojo con UTC, usar getUTCDate si el driver devuelve UTC midnight
                // Postgres 'date' usually parsed as local midnight or UTC midnight.
                // Vamos a asumir match aproximado
                const dbMonth = fechaDb.getMonth() + 1;

                if (excelDay === dbMonth && excelMonth === dbDay) {
                    swapCount++;
                    swapMonto += montoNeto;
                    if (examples.length < 10) examples.push({
                        folio, idAbono,
                        excel: fechaExcel.toISOString().split('T')[0],
                        bd: fechaDb.toISOString().split('T')[0],
                        montoNeto
                    });
                }
            }
        }
    });

    console.log(`\n🚨 RESULTADO: ${swapCount} registros INVERTIDOS (Enero -> Febrero).`);
    console.log(`💰 Monto Inflado en Febrero por error: $${swapMonto.toLocaleString('es-CL')}`);

    if (examples.length > 0) {
        console.table(examples);
    }

    pool.end();
}

checkDateSwap();
