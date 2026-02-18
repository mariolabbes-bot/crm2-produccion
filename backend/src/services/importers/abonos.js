const pool = require('../../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { updateJobStatus } = require('../jobManager');
const { norm, parseExcelDate, parseNumeric } = require('./utils');
const { resolveVendorName } = require('../../utils/vendorAlias'); // Standard Vendor Resolution

async function processAbonosFileAsync(jobId, filePath, originalname, options = {}) {
    const client = await pool.connect();
    const updateMissing = !!options.updateMissing;

    if (updateMissing) console.log(`🛠️ [Job ${jobId}] updateMissing ACTIVADO`);

    try {
        console.log(`🔵 [Job ${jobId}] Procesando Abonos (Smart Merge): ${originalname}`);
        await updateJobStatus(jobId, 'processing');

        // 1. Read Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

        console.log(`📊 Total filas: ${data.length}`);
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

        // 3. Prepare Staging Data
        const toImport = [];
        const observations = [];

        // Vendor Alias Cache
        const vendorMap = new Map(); // TODO: Load if needed, currently using resolveVendorName per row or cache it?
        // Optimizing with simple cache if needed, but for now standard resolve is fine or we can reuse map from Ventas if shared. 
        // Let's stick to simple resolution for now to avoid complexity, or bulk load user aliases if perf is key.

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
            const fecha = parseExcelDate(row[colFecha]);
            const montoExcel = parseNumeric(row[colMonto]);

            if (!folio || !fecha || !montoExcel) continue;

            const idAbonoRaw = colIdentificadorAbono && row[colIdentificadorAbono] ? String(row[colIdentificadorAbono]).trim() : '';
            // If ID is empty, we flag it but we MUST import it. We'll use '' as ID.

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

        // 4. TEMP TABLE & BULK INSERT
        const tempTable = `temp_abono_import_${jobId}`;
        await client.query(`
            CREATE TEMP TABLE ${tempTable} (
                sucursal text, folio text, fecha date, identificador text, cliente text, 
                vendedor_cliente text, caja_operacion text, usuario_ingreso text, monto_total numeric, 
                saldo_a_favor numeric, saldo_a_favor_total numeric, tipo_pago text, estado_abono text, 
                identificador_abono text, fecha_vencimiento date, monto numeric, monto_neto numeric
            ) ON COMMIT DROP
        `);

        console.log(`⚡ Insertando ${toImport.length} filas en Staging Table...`);

        // Batch Insert into Temp
        const BATCH_SIZE = 1000;
        for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
            const batch = toImport.slice(i, i + BATCH_SIZE);
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

            await client.query(
                `INSERT INTO ${tempTable} VALUES ${placeholders.join(', ')}`,
                params
            );
        }

        // 5. SMART MERGE (The Magic)
        console.log('🔮 Ejecutando MERGE (Update Existing + Insert New)...');

        // A. UPDATE existing records (Correct Dates based on Key: Folio + ID)
        const updateQuery = `
            UPDATE abono t
            SET 
                fecha = s.fecha,
                monto = s.monto,
                monto_neto = s.monto_neto,
                estado_abono = s.estado_abono,
                updated_at = NOW()
            FROM ${tempTable} s
            WHERE t.folio = s.folio 
              AND t.identificador_abono = s.identificador_abono
              AND (t.fecha <> s.fecha OR t.monto <> s.monto)
        `;
        const resUpdate = await client.query(updateQuery);
        console.log(`   🔄 Actualizados (Corregidos): ${resUpdate.rowCount}`);

        // B. INSERT New records
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
        console.log(`   ✨ Nuevos Insertados: ${resInsert.rowCount}`);

        const result = {
            success: true,
            totalRows: data.length,
            toImport: toImport.length,
            updated: resUpdate.rowCount,
            inserted: resInsert.rowCount,
            observationsReportUrl: null, // No obs report for now, assumed clean or just db errors thrown
            dataImported: (resUpdate.rowCount + resInsert.rowCount) > 0
        };

        await updateJobStatus(jobId, 'completed', {
            totalRows: data.length,
            importedRows: resInsert.rowCount,
            updatedRows: resUpdate.rowCount,
            resultData: result
        });

        console.log(`✅ [Job ${jobId}] Abonos Finalizado.`);
        return result;

    } catch (error) {
        console.error(`❌ [Job ${jobId}] Falló abonos:`, error);
        await updateJobStatus(jobId, 'failed', { errorMessage: error.message });
        throw error;
    } finally {
        client.release();
    }
}
module.exports = { processAbonosFileAsync };
