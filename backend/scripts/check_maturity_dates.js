const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

function checkMaturityDates() {
    console.log('📅 Auditoría de Fechas de VENCIMIENTO en Excel...');

    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    let sumFeb = 0;
    let countFeb = 0;
    let sumTotal = 0;

    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };

        const montoRaw = getVal([/^Monto$/i]);
        if (!montoRaw) return;
        const monto = parseNumeric(montoRaw);
        if (!monto) return;
        const montoNeto = Math.round(monto / 1.19);
        sumTotal += montoNeto;

        // VENCIMIENTO
        const fechaVencRaw = getVal([/^Fecha.*vencir/i, /^Fecha.*vencimiento$/i]);
        const fechaVenc = parseExcelDate(fechaVencRaw);

        if (fechaVenc && fechaVenc.getMonth() === 1 && fechaVenc.getFullYear() === 2026) {
            sumFeb += montoNeto;
            countFeb++;
        }
    });

    console.log('\n📊 Resultados Excel (Agrupado por Vencimiento):');
    console.log(`   FEBRERO 2026 (Venc):`);
    console.log(`      Registros: ${countFeb}`);
    console.log(`      Suma Neto: $${sumFeb.toLocaleString('es-CL')}`);

    console.log(`   TOTAL Excel Neto: $${sumTotal.toLocaleString('es-CL')}`);
}

checkMaturityDates();
