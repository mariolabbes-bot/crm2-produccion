const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

function findDateRange() {
    console.log('🕵️ Buscando qué rango de fechas suma $214.981.618 (Neto) o $255.828.125 (Bruto)...');
    const targetNeto = 214981618;
    const targetBruto = 255828125;
    const tolerance = 2000000; // Tolerancia de 2 Millones (1%)

    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    const rows = [];
    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };
        const fechaRaw = getVal([/^Fecha$/i, /Fecha.*abono/i]);
        const montoRaw = getVal([/^Monto$/i]); // Bruto
        if (!fechaRaw || !montoRaw) return;

        const monto = parseNumeric(montoRaw);
        const fecha = parseExcelDate(fechaRaw);
        if (fecha && monto) {
            rows.push({ fecha, monto, montoNeto: Math.round(monto / 1.19) });
        }
    });

    // Ordenar por fecha
    rows.sort((a, b) => a.fecha - b.fecha);
    console.log(`Datos ordenados: ${rows.length} filas. Desde ${rows[0].fecha.toISOString()} hasta ${rows[rows.length - 1].fecha.toISOString()}`);

    // Sliding Window
    let currentSumNeto = 0;
    let currentSumBruto = 0;
    let start = 0;

    for (let end = 0; end < rows.length; end++) {
        currentSumNeto += rows[end].montoNeto;
        currentSumBruto += rows[end].monto;

        while ((currentSumNeto > targetNeto + tolerance) && start < end) {
            currentSumNeto -= rows[start].montoNeto;
            currentSumBruto -= rows[start].monto;
            start++;
        }

        if (Math.abs(currentSumNeto - targetNeto) < tolerance || Math.abs(currentSumBruto - targetBruto) < tolerance) {
            console.log(`\n🎯 ¡MATCH ENCONTRADO!`);
            console.log(`   Rango: ${rows[start].fecha.toISOString().split('T')[0]}  <-->  ${rows[end].fecha.toISOString().split('T')[0]}`);
            console.log(`   Suma Neto: $${currentSumNeto.toLocaleString('es-CL')} (Target: $${targetNeto.toLocaleString()})`);
            console.log(`   Suma Bruto: $${currentSumBruto.toLocaleString('es-CL')} (Target: $${targetBruto.toLocaleString()})`);

            // Check if it looks like "Start of year to X"
            // Or "Last 30 days"
        }
    }
}

findDateRange();
