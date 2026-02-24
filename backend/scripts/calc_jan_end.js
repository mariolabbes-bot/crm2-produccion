const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

function calcJanEnd() {
    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    let sumJanEnd = 0; // 29, 30, 31 Ene
    let sumFebStart = 0; // 1 - 8 Feb

    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };
        const fechaRaw = getVal([/^Fecha$/i, /Fecha.*abono/i]);
        const montoRaw = getVal([/^Monto$/i]);
        if (!fechaRaw || !montoRaw) return;

        const monto = parseNumeric(montoRaw);
        const fecha = parseExcelDate(fechaRaw);
        if (!fecha || !monto) return;

        const montoNeto = Math.round(monto / 1.19);

        if (fecha.getFullYear() === 2026) {
            if (fecha.getMonth() === 0 && fecha.getDate() >= 29) {
                sumJanEnd += montoNeto;
            }
            if (fecha.getMonth() === 1 && fecha.getDate() <= 8) {
                sumFebStart += montoNeto;
            }
        }
    });

    console.log('📊 Desglose de Fechas Recientes en Excel:');
    console.log(`   Enero (29, 30, 31): $${sumJanEnd.toLocaleString('es-CL')}`);
    console.log(`   Febrero (1 al 8):   $${sumFebStart.toLocaleString('es-CL')}`);
    console.log(`   SUMA (29 Ene - 8 Feb): $${(sumJanEnd + sumFebStart).toLocaleString('es-CL')}`);
}

calcJanEnd();
