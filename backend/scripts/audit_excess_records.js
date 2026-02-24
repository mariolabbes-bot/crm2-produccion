const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

async function auditExcess() {
    console.log('🔍 Auditoría Inversa: ¿Qué sobra en la Base de Datos? (BD vs Recaudacion Excel)...');
    console.log('   Objetivo: Explicar por qué Dashboard ($220M) > Excel ($214M). Diferencia aprox: $6M');

    // 1. Cargar Excel (Recaudacion)
    const filePath = path.join(__dirname, '../temp_recaudacion.xlsx'); // Archivo descargado previamente
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    const excelMap = new Map();
    let excelSumFeb = 0;

    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };

        const folio = String(getVal([/^Folio$/i]) || '').trim();
        const idAbono = String(getVal([/^Identificador_1$/i, /^Identificador.*abono/i]) || '').trim();
        const montoRaw = getVal([/^Monto$/i]);
        const fechaRaw = getVal([/^Fecha$/i, /Fecha.*abono/i]);

        if (!folio || !montoRaw) return;

        const monto = parseNumeric(montoRaw);
        const fecha = parseExcelDate(fechaRaw);

        if (fecha && fecha.getMonth() === 1 && fecha.getFullYear() === 2026) {
            const montoNeto = Math.round(monto / 1.19);
            excelSumFeb += montoNeto;

            // Key Composite
            const key = `${folio}-${idAbono}`;
            excelMap.set(key, true);
        }
    });

    console.log(`📊 Excel Febrero (Recaudacion): $${excelSumFeb.toLocaleString('es-CL')} | ${excelMap.size} registros únicos.`);

    // 2. Traer BD Febrero
    const resDb = await pool.query(`
        SELECT folio, identificador_abono, monto_neto, fecha, created_at 
        FROM abono 
        WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
    `);

    let dbSumFeb = 0;
    let excessCount = 0;
    let excessSum = 0;
    const ghosts = [];

    for (const row of resDb.rows) {
        dbSumFeb += Number(row.monto_neto);
        const key = `${row.folio}-${row.identificador_abono || ''}`;

        if (!excelMap.has(key)) {
            excessCount++;
            excessSum += Number(row.monto_neto);
            if (ghosts.length < 20) {
                ghosts.push({
                    folio: row.folio,
                    id: row.identificador_abono,
                    fecha: new Date(row.fecha).toISOString().split('T')[0],
                    monto: Number(row.monto_neto),
                    creado: new Date(row.created_at).toISOString()
                });
            }
        }
    }

    console.log(`🗄️ DB Febrero: $${dbSumFeb.toLocaleString('es-CL')} | ${resDb.rowCount} registros.`);
    console.log(`\n🚨 DETECCIÓN DE SOBRANTES (Están en BD, NO en Excel Recaudacion):`);
    console.log(`   Cantidad: ${excessCount} registros fantasma.`);
    console.log(`   Monto Sobrante: $${excessSum.toLocaleString('es-CL')}`);

    if (ghosts.length > 0) {
        console.log('\n👻 Ejemplos de Registros Sobrantes:');
        console.table(ghosts);
    }

    pool.end();
}

auditExcess();
