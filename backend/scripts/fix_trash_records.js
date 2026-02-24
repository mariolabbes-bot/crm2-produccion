const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate } = require('../src/services/importers/utils');

async function fixTrash() {
    console.log('🧹 Eliminando Registros Basura (Trash)...');

    // 1. Re-identificar Basura (Copia de la lógica para seguridad)
    const filePath = path.join(__dirname, '../temp_recaudacion.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    const expectedKeys = new Set();
    const tempKeyTracker = new Map();

    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };

        const folio = String(getVal([/^Folio$/i]) || '').trim();
        const rawId = String(getVal([/^Identificador_1$/i, /^Identificador.*abono/i]) || '').trim();
        const fechaRaw = getVal([/^Fecha$/i, /Fecha.*abono/i]);

        if (!folio) return;
        const fecha = parseExcelDate(fechaRaw);
        if (fecha && fecha.getMonth() === 1 && fecha.getFullYear() === 2026) {
            let baseKey = `${folio}-${rawId}`;
            let finalKey = baseKey;
            let counter = 1;
            while (tempKeyTracker.has(finalKey)) {
                finalKey = `${baseKey}_${counter}`;
                counter++;
            }
            tempKeyTracker.set(finalKey, true);
            expectedKeys.add(finalKey);
        }
    });

    const resDb = await pool.query(`
        SELECT id, folio, identificador_abono, monto_neto, fecha 
        FROM abono 
        WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
    `);

    const idsToDelete = [];
    let trashSum = 0;

    for (const row of resDb.rows) {
        const f = String(row.folio || '').trim();
        const i = String(row.identificador_abono || '').trim();
        const dbKey = `${f}-${i}`;

        if (!expectedKeys.has(dbKey)) {
            idsToDelete.push(row.id);
            trashSum += Number(row.monto_neto);
        }
    }

    console.log(`🔍 Basura Detectada: ${idsToDelete.length} registros.`);
    console.log(`💰 Monto a Eliminar: $${trashSum.toLocaleString('es-CL')}`);

    if (idsToDelete.length > 0) {
        // DELETE
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Delete in chunks if needed, but 29 is small
            const sql = `DELETE FROM abono WHERE id = ANY($1::int[])`;
            await client.query(sql, [idsToDelete]);

            await client.query('COMMIT');
            console.log('✅ Eliminación exitosa.');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('❌ Error eliminando:', e);
        } finally {
            client.release();
        }
    } else {
        console.log('✨ Nada que eliminar.');
    }

    pool.end();
}

fixTrash();
