const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

function auditExcelDates() {
    console.log('📅 Auditoría de Fechas en archivo Excel (Febrero vs Otros)...');

    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    let sumFeb = 0;
    let countFeb = 0;

    let sumJan = 0;
    let countJan = 0;

    let sumOther = 0;
    let countOther = 0;

    const uniqueMap = new Map(); // Para no sumar duplicados si nuestra lógica de importación los mató

    data.forEach(row => {
        // Headers search
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };

        const fechaRaw = getVal([/^Fecha$/i, /Fecha.*abono/i]);
        const montoRaw = getVal([/^Monto$/i]);
        const folio = String(getVal([/^Folio$/i]) || '').trim();
        const idAbono = String(getVal([/^Identificador_1$/i, /^Identificador.*abono/i]) || '').trim();

        const monto = parseNumeric(montoRaw);
        const fecha = parseExcelDate(fechaRaw);

        if (!monto || !fecha) return;

        // Deduplicate logic logic (Simulating what DB accepted)
        const key = `${folio}-${idAbono}-${fecha.getTime()}`;
        if (uniqueMap.has(key)) return;
        uniqueMap.set(key, true);

        const montoNeto = Math.round(monto / 1.19);

        // Bucketing
        const m = fecha.getMonth(); // 0=Jan, 1=Feb
        const y = fecha.getFullYear();

        if (y === 2026 && m === 1) { // FEBRERO
            sumFeb += montoNeto;
            countFeb++;
        } else if (y === 2026 && m === 0) { // ENERO
            sumJan += montoNeto;
            countJan++;
        } else {
            console.log(`   ⚠️ Fecha Fuera de rango: ${fecha.toISOString()}`);
            sumOther += montoNeto;
            countOther++;
        }
    });

    console.log('\n📊 Resultados Excel (Filtrado por Fecha Real Parseada):');
    console.log('   FEBRERO 2026:');
    console.log(`      Registros: ${countFeb}`);
    console.log(`      Suma Neto: $${sumFeb.toLocaleString('es-CL')}`);

    console.log('\n   ENERO 2026:');
    console.log(`      Registros: ${countJan}`);
    console.log(`      Suma Neto: $${sumJan.toLocaleString('es-CL')}`);

    console.log('\n   OTROS:');
    console.log(`      Registros: ${countOther}`);
    console.log(`      Suma Neto: $${sumOther.toLocaleString('es-CL')}`);

    console.log('\n-----------------------------------');
    console.log(`TOTAL EXCEL AUDITADO: $${(sumFeb + sumJan + sumOther).toLocaleString('es-CL')}`);
}

auditExcelDates();
