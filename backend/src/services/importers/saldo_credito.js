
const XLSX = require('xlsx');
const pool = require('../../db');
const { updateJobStatus } = require('../jobManager');
const { norm, parseExcelDate, parseNumeric } = require('./utils');

async function processSaldoCreditoFileAsync(jobId, filePath, originalname) {
    const client = await pool.connect();

    try {
        console.log(`🔵 [Job ${jobId}] Procesando Saldo Credito: ${originalname}`);
        await updateJobStatus(jobId, 'processing');

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

        console.log(`📊 Total filas: ${data.length}`);
        if (!Array.isArray(data) || data.length === 0) throw new Error('Excel vacío');

        // Fix: Read headers correctly from the first row of the sheet, not from the first data object.
        const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, limit: 1 })[0];
        const headers = headerRow || [];
        console.log('Detected Headers:', headers);

        // Helper to find column by regex
        const findCol = (patterns) => headers.find(h => h && patterns.some(p => p.test(String(h).trim()))) || null;

        // Mappings based on Verified Schema and Implementation Plan
        const colRut = findCol([/^Rut$/i, /^Rut.*cliente$/i]);
        const colDv = findCol([/^Dv$/i, /^Digito/i]);
        const colTipo = findCol([/^Tipo$/i, /^Tipo.*documento$/i]);
        const colFolio = findCol([/^Folio$/i]);
        const colFechaEmision = findCol([/^Fecha.*emision$/i, /^Fecha$/i]);
        const colTotal = findCol([/^Total$/i, /^Monto.*total$/i]);
        const colDeudaCancelada = findCol([/^Deuda.*cancelada$/i, /^Cancelado$/i]);
        const colSaldoFactura = findCol([/^Deuda.*cliente$/i, /^Saldo.*factura$/i, /^Saldo.*pendiente$/i]); // Critical field
        const colSaldoFavor = findCol([/^Saldo.*favor$/i, /^Saldo.*favor.*disponible$/i]);
        const colVendedor = findCol([/^Vendedor.*nombre$/i, /^Nombre.*vendedor$/i, /^Vendedor$/i]);

        if (!colFolio || !colRut) {
            throw new Error(`Faltan columnas requeridas: Folio, Rut`);
        }

        // We will process row by row.
        // Strategy: TRUNCATE (Snapshot) + INSERT.
        // This ensures that debts not present in the new file (paid) are removed.

        let inserted = 0;
        let errors = 0;

        await client.query('BEGIN');

        // CRITICAL: Clear table for snapshot
        await client.query('TRUNCATE TABLE saldo_credito RESTART IDENTITY');

        // Pre-fetch Vendors to build a map: Name/Alias/CreditName -> Standard Full Name
        const usersRes = await client.query("SELECT nombre_vendedor, alias, nombre_credito FROM usuario");
        const vendorMap = new Map();

        usersRes.rows.forEach(u => {
            const standardName = u.nombre_vendedor; // The Source of Truth Full Name
            if (u.nombre_vendedor) vendorMap.set(u.nombre_vendedor.toLowerCase(), standardName);
            if (u.alias) vendorMap.set(u.alias.toLowerCase(), standardName);
            if (u.nombre_credito) vendorMap.set(u.nombre_credito.toLowerCase(), standardName);
        });

        const BATCH_SIZE = 500;
        let batchRows = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];

            // Extract Values
            const rawRut = row[colRut];
            const dv = colDv ? row[colDv] : '';
            const rut = rawRut ? String(rawRut).trim() + (dv ? `-${dv}` : '') : null;

            const folio = row[colFolio] ? parseInt(row[colFolio]) : null;
            if (!folio || !rut) continue;

            const tipo = colTipo ? String(row[colTipo]).trim() : 'FACTURA';
            const fechaEmision = parseExcelDate(row[colFechaEmision]);
            const totalFactura = colTotal ? parseNumeric(row[colTotal]) : 0;
            const deudaCancelada = colDeudaCancelada ? parseNumeric(row[colDeudaCancelada]) : 0;
            const saldoFactura = colSaldoFactura ? parseNumeric(row[colSaldoFactura]) : 0;
            const saldoFavorDisponible = colSaldoFavor ? parseNumeric(row[colSaldoFavor]) : 0;
            // Name from Excel (e.g. "Alex Mondaca")
            const rawVendorName = colVendedor ? String(row[colVendedor]).trim() : null;

            // Resolve Standard Name
            let finalVendorName = null;
            if (rawVendorName) {
                const key = rawVendorName.toLowerCase();
                if (vendorMap.has(key)) {
                    finalVendorName = vendorMap.get(key);
                } else {
                    finalVendorName = rawVendorName;
                }
            }

            // Add to batch
            batchRows.push([
                rut,
                tipo,
                folio,
                fechaEmision,
                totalFactura,
                deudaCancelada,
                saldoFactura,
                saldoFavorDisponible,
                finalVendorName,
                new Date() // created_at
            ]);

            // Execute Batch if full
            if (batchRows.length >= BATCH_SIZE) {
                const valuesClause = batchRows.map((_, idx) => {
                    const offset = idx * 10;
                    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`;
                }).join(', ');

                const flatParams = batchRows.flat();

                await client.query(
                    `INSERT INTO saldo_credito (
                        rut, tipo_documento, folio, fecha_emision, 
                        total_factura, deuda_cancelada, saldo_factura, 
                        saldo_favor_disponible, nombre_vendedor, created_at
                    ) VALUES ${valuesClause}`,
                    flatParams
                );

                inserted += batchRows.length;
                batchRows = []; // Clear batch
            }
        }

        // Insert remaining rows
        if (batchRows.length > 0) {
            const valuesClause = batchRows.map((_, idx) => {
                const offset = idx * 10;
                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`;
            }).join(', ');

            const flatParams = batchRows.flat();

            await client.query(
                `INSERT INTO saldo_credito (
                    rut, tipo_documento, folio, fecha_emision, 
                    total_factura, deuda_cancelada, saldo_factura, 
                    saldo_favor_disponible, nombre_vendedor, created_at
                ) VALUES ${valuesClause}`,
                flatParams
            );
            inserted += batchRows.length;
        }

        await client.query('COMMIT');

        console.log(`✅ [Job ${jobId}] Finalizado. Insertados: ${inserted} (Tabla truncada previamente)`);
        await updateJobStatus(jobId, 'completed', {
            summary: `Carga completa (Snapshot). Insertados: ${inserted}`
        });

        return { inserted };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ [Job ${jobId}] Error:`, error);
        await updateJobStatus(jobId, 'failed', { error: error.message });
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { processSaldoCreditoFileAsync };
