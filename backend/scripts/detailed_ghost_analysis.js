const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

async function detailedGhostAnalysis() {
    console.log('👻 Análisis Forense de Registros Fantasma...');

    // 1. Cargar Excel Recaudacion (La "Verdad" actual según el usuario)
    const filePath = path.join(__dirname, '../temp_recaudacion.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    const excelMap = new Map();
    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };
        const folio = String(getVal([/^Folio$/i]) || '').trim();
        const idAbono = String(getVal([/^Identificador_1$/i, /^Identificador.*abono/i]) || '').trim();
        if (folio) excelMap.set(`${folio}-${idAbono}`, true);
    });

    // 2. Traer Fantasmas de BD
    const resDb = await pool.query(`
        SELECT folio, identificador_abono, monto_neto, fecha, created_at
        FROM abono 
        WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
    `);

    const ghosts = [];
    let debugged = false;
    for (const row of resDb.rows) {
        const f = String(row.folio || '').trim();
        const i = String(row.identificador_abono || '').trim();
        const key = `${f}-${i}`;

        if (!excelMap.has(key)) {
            ghosts.push(row);
            if (!debugged) {
                console.log('🐞 DEBUG FIRST MISMATCH after fix:');
                console.log(`   DB Key: "${key}"`);
                console.log(`   In Map? ${excelMap.has(key)}`);
                debugged = true;
            }
        }
    }

    console.log(`\n🔎 Total Fantasmas: ${ghosts.length} `);

    // Agrupar por Fecha de Creación para ver de dónde vinieron
    const sourceMap = {};
    ghosts.forEach(g => {
        const dateStr = new Date(g.created_at).toISOString().split('T')[0];
        const timeStr = new Date(g.created_at).toISOString().substring(11, 16); // HH:MM
        const group = `${dateStr} ${timeStr} `;
        if (!sourceMap[group]) sourceMap[group] = { count: 0, sum: 0 };
        sourceMap[group].count++;
        sourceMap[group].sum += Number(g.monto_neto);
    });

    console.log('\n📅 Fuentes de Datos Fantasma (Created_at):');
    console.table(sourceMap);

    // Verificar si son duplicados de Folio con distinto ID
    console.log('\n🧐 Chequeo de "Casi Duplicados" (Mismo Folio en Excel, distinto ID en BD):');
    let partialMatchCount = 0;

    for (const g of ghosts) {
        // Buscar si este folio existe en Excel con OTRO id
        // Iterar todo el mapa es lento, mejor construir mapa de folios
    }
    // Optimization: Build Folio Map
    const excelFolioMap = new Map();
    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };
        const folio = String(getVal([/^Folio$/i]) || '').trim();
        const id = String(getVal([/^Identificador_1$/i, /^Identificador.*abono/i]) || '').trim();
        if (folio) {
            if (!excelFolioMap.has(folio)) excelFolioMap.set(folio, []);
            excelFolioMap.get(folio).push(id);
        }
    });

    const examples = [];
    for (const g of ghosts) {
        if (excelFolioMap.has(g.folio)) {
            partialMatchCount++;
            const excelIds = excelFolioMap.get(g.folio);
            if (examples.length < 10) {
                examples.push({
                    folio: g.folio,
                    bd_id: g.identificador_abono,
                    excel_ids: excelIds.join(', '),
                    monto: g.monto_neto
                });
            }
        }
    }

    console.log(`   ${partialMatchCount} fantasmas tienen el Folio en Excel pero ID diferente.`);
    if (examples.length > 0) {
        console.table(examples);
    }

    // Conclusion Logic
    const totalGhostSum = ghosts.reduce((acc, g) => acc + Number(g.monto_neto), 0);
    console.log(`\n💰 Suma Total Sobrante: $${totalGhostSum.toLocaleString('es-CL')} `);

    pool.end();
}

detailedGhostAnalysis();
