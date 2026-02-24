const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

async function checkReverseSwap() {
    console.log('🔄 Buscando Fechas Invertidas REVERSAS (Excel Febrero -> BD Enero)...');
    console.log('   Hipótesis: El Dashboard muestra menos dinero porque los abonos están escondidos en Enero.');

    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    // Traer BD completa para mapear fecha por llave única
    const resDb = await pool.query(`SELECT folio, identificador_abono, fecha FROM abono`);
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
        const fechaExcel = parseExcelDate(fechaRaw); // Parser Nuevo (estricto DD/MM)

        if (!fechaExcel) return;

        // FILTRO: Solo nos interesa si EXCEL dice FEBRERO
        if (fechaExcel.getMonth() !== 1 || fechaExcel.getFullYear() !== 2026) return;

        const key = `${folio}-${idAbono}`;
        const fechaDb = dbMap.get(key);

        if (fechaDb) {
            // Chequear si en BD está en OTRO MES (ej: Enero)
            if (fechaDb.getMonth() !== 1) {
                swapCount++;
                swapMonto += montoNeto;

                if (examples.length < 10) {
                    examples.push({
                        folio, idAbono,
                        excel: fechaExcel.toISOString().split('T')[0], // Es Feb
                        bd: fechaDb.toISOString().split('T')[0], // No es Feb
                        montoNeto
                    });
                }
            }
        }
    });

    console.log(`\n🚨 RESULTADO: ${swapCount} registros son Febrero en Excel pero OTRO MES en BD.`);
    console.log(`💰 Monto Escondido (Lost in January): $${swapMonto.toLocaleString('es-CL')}`);

    if (examples.length > 0) {
        console.table(examples);
    }

    pool.end();
}

checkReverseSwap();
