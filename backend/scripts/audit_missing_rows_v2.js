const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

async function auditMissing() {
    console.log('🔍 Auditoría Detallada: Excel vs DB (Buscando los 27M faltantes)...');

    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    // 1. Cargar Excel en Memoria (Normalizado)
    const excelMap = new Map(); // Key: Folio-ID -> { monto, fecha, row }
    let excelTotalNeto = 0;

    data.forEach((row, idx) => {
        // Headers detection (simplified based on previous knowledge)
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };

        const folio = String(getVal([/^Folio$/i]) || '').trim();
        const fechaRaw = getVal([/^Fecha$/i, /Fecha.*abono/i]);
        const montoRaw = getVal([/^Monto$/i]);
        const idAbono = String(getVal([/^Identificador_1$/i, /^Identificador.*abono/i]) || '').trim();

        if (!folio || !montoRaw) return;

        const monto = parseNumeric(montoRaw);
        const fecha = parseExcelDate(fechaRaw);
        if (!monto || !fecha) return;

        // Validar solo Febrero
        // if (fecha.getMonth() !== 1 || fecha.getFullYear() !== 2026) return; 
        // Desactivado filtro de fecha para auditar TODO el archivo vs BD

        const montoNeto = Math.round(monto / 1.19);
        excelTotalNeto += montoNeto;

        const key = `${folio}-${idAbono}`;
        if (excelMap.has(key)) {
            // Si ya existe la clave (mismo folio y mismo ID), sumamos? 
            // NO, el sistema hace update. Pero si viene duplicado en excel, deberiamos contar 1.
            // PERO, si el usuario dice que sumemos TODO el excel excel...
            // Vamos a asumir que duplicados EXACTOS de llave no deberían sumar doble en el dashboard.
            // Pero duplicados de FOLIO con DISTINTO ID sí.
        } else {
            excelMap.set(key, {
                folio,
                idAbono,
                monto: monto,
                montoNeto,
                fecha,
                originIdx: idx
            });
        }
    });

    console.log(`📊 Excel Procesado: ${excelMap.size} registros únicos (Folio+ID).`);
    console.log(`   Suma Neto Estimada (Unique Keys): ${excelTotalNeto.toLocaleString('es-CL')}`);

    // 2. Traer TODO de la BD
    const resDb = await pool.query(`SELECT folio, identificador_abono, monto, monto_neto, fecha FROM abono`);
    const dbMap = new Map();
    let dbTotalNeto = 0;

    resDb.rows.forEach(row => {
        const key = `${row.folio}-${row.identificador_abono || ''}`;
        dbMap.set(key, row);
        dbTotalNeto += Number(row.monto_neto || 0); // Ojo: Dashboard puede estar sumando 'monto' o 'monto_neto'
        // El usuario dice Dashboard=187M. 
    });

    console.log(`🗄️ DB Total Registros: ${resDb.rowCount}`);
    console.log(`   Suma Neto en BD: ${dbTotalNeto.toLocaleString('es-CL')}`);

    // 3. Comparar
    console.log('\n🕵️ REPORT DE FALTANTES (Excel tiene, BD no):');

    let faltantesCount = 0;
    let faltantesMonto = 0;
    const missingExamples = [];

    for (const [key, val] of excelMap) {
        if (!dbMap.has(key)) {
            faltantesCount++;
            faltantesMonto += val.montoNeto;
            if (missingExamples.length < 10) missingExamples.push(val);
        }
    }

    console.log(`   ❌ Faltan ${faltantesCount} registros.`);
    console.log(`   💰 Monto Faltante: ${faltantesMonto.toLocaleString('es-CL')}`);

    if (missingExamples.length > 0) {
        console.log('\n   Ejemplos de Faltantes:');
        console.table(missingExamples.map(x => ({
            Folio: x.folio,
            IdAbono: x.idAbono,
            Fecha: x.fecha ? x.fecha.toISOString().split('T')[0] : 'N/A',
            MontoNeto: x.montoNeto
        })));
    }

    // 4. Comparar Fechas (Gringo check)
    console.log('\n📅 Chequeo de Fechas (Diferencias):');
    let diffFechaCount = 0;
    for (const [key, val] of excelMap) {
        if (dbMap.has(key)) {
            const dbVal = dbMap.get(key);
            // Comparar strings de fecha YYYY-MM-DD
            const excelDateStr = val.fecha.toISOString().split('T')[0];
            const dbDateStr = new Date(dbVal.fecha).toISOString().split('T')[0];

            if (excelDateStr !== dbDateStr) {
                diffFechaCount++;
                if (diffFechaCount <= 5) {
                    console.log(`   ⚠️ Diferencia Fecha [${key}]: Excel=${excelDateStr} vs DB=${dbDateStr}`);
                }
            }
        }
    }
    console.log(`   Total fechas discrepantes: ${diffFechaCount}`);

    pool.end();
}

auditMissing();
