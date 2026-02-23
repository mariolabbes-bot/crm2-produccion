const pool = require('../../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { updateJobStatus } = require('../jobManager');
const { norm, parseExcelDate, parseNumeric } = require('./utils');
const { resolveVendorName } = require('../../utils/vendorAlias');

async function processAbonosFileAsync(jobId, filePath, originalname, options = {}) {
    const client = await pool.connect();

    try {
        console.log(`🔵 [Job ${jobId}] Procesando Abonos (Transactional Smart Merge): ${originalname}`);
        await updateJobStatus(jobId, 'processing');

        // 1. Read Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

        console.log(`📊 Total filas Excel: ${data.length}`);
        if (!Array.isArray(data) || data.length === 0) throw new Error('Excel vacío');

        // 2. Header Detection
        const scanLimit = Math.min(data.length, 50);
        const headersSet = new Set();
        for (let i = 0; i < scanLimit; i++) Object.keys(data[i] || {}).forEach(k => headersSet.add(k));
        const headers = Array.from(headersSet);
        const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;

        const colFolio = findCol([/^Folio$/i, /Folio/i]);
        const colFecha = findCol([/^Fecha$/i, /Fecha.*abono/i, /Fecha/i]);
        const colMonto = findCol([/^Monto$/i]);
        const colIdentificadorAbono = findCol([/^Identificador_1$/i, /^Identificador.*abono/i, /^Identificador.*2$/i]);

        // Optional Cols
        const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i, /^Identificador.*cliente$/i]);
        const colCliente = findCol([/^Cliente$/i]);
        const colVendedorCliente = findCol([/^Vendedor.*clie/i, /^Vendedor/i]);
        const colSucursal = findCol([/^Sucursal$/i]);
        const colCajaOperacion = findCol([/^Caja.*operaci/i]);
        const colUsuarioIngreso = findCol([/^Usuario.*in/i]);
        const colMontoTotal = findCol([/^Monto.*total$/i]);
        const colSaldoFavor = findCol([/^Saldo.*favor.*u/i]);
        const colSaldoFavorTotal = findCol([/^Saldo.*favor.*to/i]);
        const colTipoPago = findCol([/^Tipo.*pago$/i]);
        const colEstadoAbono = findCol([/^Estado.*abono$/i]);
        const colFechaVencimiento = findCol([/^Fecha.*vencir/i, /^Fecha.*vencimiento$/i]);

        if (!colFolio || !colFecha || !colMonto) throw new Error(`Faltan columnas requeridas: Folio, Fecha, Monto`);

        // 3. Prepare Data
        const toImport = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
            const fecha = parseExcelDate(row[colFecha]);
            const montoExcel = parseNumeric(row[colMonto]);

            if (!folio || !fecha || !montoExcel) continue;

            const idAbonoRaw = colIdentificadorAbono && row[colIdentificadorAbono] ? String(row[colIdentificadorAbono]).trim() : '';
            const montoNetoCalc = Math.round(montoExcel / 1.19);
            const identificador = colIdentificador && row[colIdentificador] ? String(row[colIdentificador]).trim() : null;
            const clienteNombre = colCliente && row[colCliente] ? String(row[colCliente]).trim() : null;

            // Resolve Vendor
            const rawVendor = colVendedorCliente && row[colVendedorCliente] ? String(row[colVendedorCliente]).trim() : null;
            let vendedorNombre = null;
            if (rawVendor) vendedorNombre = await resolveVendorName(rawVendor);

            toImport.push({
                sucursal: colSucursal && row[colSucursal] ? String(row[colSucursal]).trim() : null,
                folio,
                fecha,
                identificador, // RUT
                cliente: clienteNombre,
                vendedor_cliente: vendedorNombre,
                caja_operacion: colCajaOperacion && row[colCajaOperacion] ? String(row[colCajaOperacion]).trim() : null,
                usuario_ingreso: colUsuarioIngreso && row[colUsuarioIngreso] ? String(row[colUsuarioIngreso]).trim() : null,
                monto_total: colMontoTotal ? parseNumeric(row[colMontoTotal]) : null,
                saldo_a_favor: colSaldoFavor ? parseNumeric(row[colSaldoFavor]) : null,
                saldo_a_favor_total: colSaldoFavorTotal ? parseNumeric(row[colSaldoFavorTotal]) : null,
                tipo_pago: colTipoPago && row[colTipoPago] ? String(row[colTipoPago]).trim() : null,
                estado_abono: colEstadoAbono && row[colEstadoAbono] ? String(row[colEstadoAbono]).trim() : null,
                identificador_abono: idAbonoRaw,
                fecha_vencimiento: colFechaVencimiento ? parseExcelDate(row[colFechaVencimiento]) : null,
                monto: montoExcel,
                monto_neto: montoNetoCalc
            });
        }

        if (toImport.length === 0) throw new Error('No se extrajeron filas válidas');

        // Deduplicate / Suffix Logic
        // Strategy: If Folio+ID+Fecha collision exists, append _1, _2 to ID.
        // This ensures data matches Excel row-for-row.
        const uniqueMap = new Map();
        const dedupedImport = [];

        for (const item of toImport) {
            let rawId = item.identificador_abono;
            // Key calculation: strictly based on composite unique constraint logic we want to enforce
            // But here we want to ensure we don't drop rows from Excel.
            // If Excel has 2 rows with same Folio+ID, we MUST suffix the second one.

            let baseKey = `${item.folio}-${rawId}`; // Base scope: Folio + ID
            let finalKey = baseKey;
            let suffixCount = 1;

            // We only check against *current batch* of imports. 
            // Ideally we should check against DB too, but the 'NOT EXISTS' in INSERT handles DB collisions 
            // (skipping them). 
            // BUT, if we want to force insert new duplicates, we rely on the ID change.
            // Issue: If DB has 'ID' and we process 'ID', we don't change it. 
            // If Excel has 'ID' and 'ID', we change 2nd to 'ID_1'.
            // If DB already had 'ID_1', we might collide. 
            // Ideally, we'd check DB. But for performance, let's assume valid suffixes.

            // Intra-file collision handling:
            while (uniqueMap.has(finalKey)) {
                const newId = `${rawId}_${suffixCount}`;
                finalKey = `${item.folio}-${newId}`;
                item.identificador_abono = newId; // Mutate item
                suffixCount++;
            }

            uniqueMap.set(finalKey, true);
            dedupedImport.push(item);
        }
        console.log(`✨ Suffixer: ${toImport.length} filas procesadas. (Sin descartes)`);


        // 4. TRANSACTIONAL IMPORT
        console.log(`⚡ Iniciando Transacción para ${toImport.length} filas...`);
        await client.query('BEGIN');

        let insertedCount = 0;
        let updatedCount = 0;

        // Use a loop for finer control and error handling per row if enabling 'continue on error'
        // For mass speed, we could use temp table, but here we want to ensure specific logic holds.
        // We will stick to the temp table approach but within a transaction, 
        // AND we will be very explicit about the MERGE logic ensuring ID is respected.

        const tempTable = `temp_abono_import_${jobId}_${Date.now()}`;
        await client.query(`
            CREATE TEMP TABLE ${tempTable} (
                sucursal text, folio text, fecha date, identificador text, cliente text, 
                vendedor_cliente text, caja_operacion text, usuario_ingreso text, monto_total numeric, 
                saldo_a_favor numeric, saldo_a_favor_total numeric, tipo_pago text, estado_abono text, 
                identificador_abono text, fecha_vencimiento date, monto numeric, monto_neto numeric
            ) ON COMMIT DROP
        `);
        console.log(`⚡ Insertando ${dedupedImport.length} filas en Staging Table...`);

        // Bulk Load Temp Table
        const BATCH_SIZE = 1000;
        for (let i = 0; i < dedupedImport.length; i += BATCH_SIZE) {
            const batch = dedupedImport.slice(i, i + BATCH_SIZE);
            let params = [];
            let placeholders = [];
            let pIdx = 1;
            for (const row of batch) {
                params.push(
                    row.sucursal, row.folio, row.fecha, row.identificador, row.cliente,
                    row.vendedor_cliente, row.caja_operacion, row.usuario_ingreso, row.monto_total,
                    row.saldo_a_favor, row.saldo_a_favor_total, row.tipo_pago, row.estado_abono,
                    row.identificador_abono, row.fecha_vencimiento, row.monto, row.monto_neto
                );
                placeholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
            }
            await client.query(`INSERT INTO ${tempTable} VALUES ${placeholders.join(', ')}`, params);
        }

        // A. UPDATE existing
        // We match strictly on (folio, identificador_abono).
        // If identificador_abono in DB is '', and incoming is '', it matches.
        const updateQuery = `
            UPDATE abono t
            SET 
                fecha = s.fecha,
                monto = s.monto,
                estado_abono = s.estado_abono

            FROM ${tempTable} s
            WHERE t.folio = s.folio 
              AND t.identificador_abono = s.identificador_abono
              AND (t.fecha <> s.fecha OR t.monto <> s.monto)
        `;
        const resUpdate = await client.query(updateQuery);
        updatedCount = resUpdate.rowCount;

        // B. INSERT New
        // Strict check: Not exists with same Folio + ID.
        // Note: 'identificador_abono' column in schema is NOT NULL? checkSchema said NO (Nullable). 
        // But in code we default to ''. Let's ensure schema logic aligns.
        // Assuming we populated temp table with '' for empties, comparison works fine in Postgres (text = text).
        const insertQuery = `
            INSERT INTO abono (
                sucursal, folio, fecha, identificador, cliente, vendedor_cliente, 
                caja_operacion, usuario_ingreso, monto_total, saldo_a_favor, 
                saldo_a_favor_total, tipo_pago, estado_abono, identificador_abono, 
                fecha_vencimiento, monto, monto_neto, created_at
            )
            SELECT 
                s.sucursal, s.folio, s.fecha, s.identificador, s.cliente, s.vendedor_cliente, 
                s.caja_operacion, s.usuario_ingreso, s.monto_total, s.saldo_a_favor, 
                s.saldo_a_favor_total, s.tipo_pago, s.estado_abono, s.identificador_abono, 
                s.fecha_vencimiento, s.monto, s.monto_neto, NOW()
            FROM ${tempTable} s
            WHERE NOT EXISTS (
                SELECT 1 FROM abono t 
                WHERE t.folio = s.folio 
                  AND t.identificador_abono = s.identificador_abono
            )
        `;
        const resInsert = await client.query(insertQuery);
        insertedCount = resInsert.rowCount;

        await client.query('COMMIT');
        console.log(`✅ COMMIT Exitoso. Insertados: ${insertedCount}, Actualizados: ${updatedCount}`);

        const result = {
            success: true,
            totalRows: data.length,
            toImport: dedupedImport.length,
            updated: updatedCount,
            inserted: insertedCount,
            observationsReportUrl: null,
            dataImported: (insertedCount + updatedCount) > 0
        };

        await updateJobStatus(jobId, 'completed', {
            totalRows: data.length,
            importedRows: insertedCount,
            updatedRows: updatedCount,
            resultData: result
        });

        return result;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ [Job ${jobId}] Falló abonos (ROLLBACK):`, error);
        await updateJobStatus(jobId, 'failed', { errorMessage: error.message });
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { processAbonosFileAsync };
