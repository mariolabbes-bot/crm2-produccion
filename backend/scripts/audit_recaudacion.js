const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

function auditRecaudacion() {
    console.log('🔍 Auditando archivo RECAUDACION 02-2026.xlsx (Descargado de Drive)...');

    const filePath = path.join(__dirname, '../temp_recaudacion.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    let sumNeto = 0;
    let sumBruto = 0;
    let count = 0;
    let minDate = null;
    let maxDate = null;

    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };

        const montoRaw = getVal([/^Monto$/i]);
        const fechaRaw = getVal([/^Fecha$/i, /Fecha.*abono/i]);

        if (montoRaw) {
            const monto = parseNumeric(montoRaw);
            if (monto) {
                const montoNeto = Math.round(monto / 1.19);
                sumNeto += montoNeto;
                sumBruto += monto;
                count++;

                if (fechaRaw) {
                    const d = parseExcelDate(fechaRaw);
                    if (d) {
                        if (!minDate || d < minDate) minDate = d;
                        if (!maxDate || d > maxDate) maxDate = d;
                    }
                }
            }
        }
    });

    console.log(`\n📊 Resultados Recaudación:`);
    console.log(`   Filas con Monto: ${count}`);
    console.log(`   Suma Bruto: $${sumBruto.toLocaleString('es-CL')}`);
    console.log(`   Suma Neto:  $${sumNeto.toLocaleString('es-CL')}`);

    if (minDate && maxDate) {
        console.log(`   Rango Fechas: ${minDate.toISOString().split('T')[0]} - ${maxDate.toISOString().split('T')[0]}`);
    }
}

auditRecaudacion();
