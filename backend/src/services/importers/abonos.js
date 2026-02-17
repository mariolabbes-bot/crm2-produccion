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
        console.log(`🔵 [Job ${jobId}] Procesando Abonos: ${originalname}`);
        await updateJobStatus(jobId, 'processing');

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

        console.log(`📊 Total filas: ${data.length}`);
        if (!Array.isArray(data) || data.length === 0) throw new Error('Excel vacío');

        // Robust header detection
        const scanLimit = Math.min(data.length, 50);
        const headersSet = new Set();
        for (let i = 0; i < scanLimit; i++) {
            Object.keys(data[i] || {}).forEach(k => headersSet.add(k));
        }
        const headers = Array.from(headersSet);
        const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;

        const colFolio = findCol([/^Folio$/i, /Folio/i]);
        const colFecha = findCol([/^Fecha$/i, /Fecha.*abono/i, /Fecha/i]);
        const colMonto = findCol([/^Monto$/i]); // This is the TOTAL amount column in Excel

        // Headers specific handling
        const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i, /^Identificador.*cliente$/i]);
        const colIdentificadorAbono = findCol([/^Identificador_1$/i, /^Identificador.*abono/i, /^Identificador.*2$/i]);
        const colSucursal = findCol([/^Sucursal$/i]);
        const colCliente = findCol([/^Cliente$/i]);
        const colVendedorCliente = findCol([/^Vendedor.*clie/i, /^Vendedor/i]);
        const colCajaOperacion = findCol([/^Caja.*operaci/i]);
        const colUsuarioIngreso = findCol([/^Usuario.*in/i]);
        const colMontoTotal = findCol([/^Monto.*total$/i]);
        const colSaldoFavor = findCol([/^Saldo.*favor.*u/i]);
        const colSaldoFavorTotal = findCol([/^Saldo.*favor.*to/i]);
        const colTipoPago = findCol([/^Tipo.*pago$/i]);
        const colEstadoAbono = findCol([/^Estado.*abono$/i]);
        const colFechaVencimiento = findCol([/^Fecha.*vencir/i, /^Fecha.*vencimiento$/i]);

        if (!colFolio || !colFecha || !colMonto) {
            throw new Error(`Faltan columnas requeridas: Folio, Fecha, Monto`);
        }

        // --- 1. Client Cache ---
        const clientsRes = await client.query("SELECT rut FROM cliente");
        const clientsByRut = new Set(clientsRes.rows.filter(c => c.rut).map(c => norm(c.rut)));

        // --- 2. Existing abonos logic (for split payments/duplicates) ---
        // Fetch existing keys to avoid collisions
        const existingAbonos = await client.query(`SELECT folio, fecha, identificador_abono FROM abono WHERE folio IS NOT NULL`);
        const existingKeys = new Set();
        existingAbonos.rows.forEach(a => {
            const f = norm(a.folio || '');
            const d = new Date(a.fecha);
            const dateStr = !isNaN(d) ? d.toISOString().split('T')[0] : '';
            const key = `${f}|${dateStr}|${norm(a.identificador_abono || '')}`;
            existingKeys.add(key);
        });

        const toImport = [];
        const observations = [];
        const processedKeys = new Set();
        const missingClients = new Set();

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
            const fecha = parseExcelDate(row[colFecha]);
            const montoExcel = parseNumeric(row[colMonto]);

            // Logic: Monto in Excel is Total. We need Net -> Monto / 1.19
            const montoNetoCalc = montoExcel ? Math.round(montoExcel / 1.19) : 0;

            if (!folio || !fecha || !montoExcel) continue;

            const sucursal = colSucursal && row[colSucursal] ? String(row[colSucursal]).trim() : null;
            const identificador = colIdentificador && row[colIdentificador] ? String(row[colIdentificador]).trim() : null;
            const clienteNombre = colCliente && row[colCliente] ? String(row[colCliente]).trim() : null;

            // STUB CLIENT
            if (identificador) {
                const rutNorm = norm(identificador);
                if (!clientsByRut.has(rutNorm)) {
                    if (!missingClients.has(rutNorm)) {
                        try {
                            await client.query("INSERT INTO cliente (rut, nombre) VALUES ($1, $2) ON CONFLICT (rut) DO NOTHING", [identificador, clienteNombre || 'Unknown']);
                            clientsByRut.add(rutNorm);
                        } catch (e) {
                            observations.push({ fila: i + 2, campo: 'Cliente', detalle: `Error creando stub cliente: ${e.message}` });
                        }
                    }
                }
            }

            // VENDOR RESOLUTION
            const rawVendor = colVendedorCliente && row[colVendedorCliente] ? String(row[colVendedorCliente]).trim() : null;
            let vendedorNombre = null;
            if (rawVendor) {
                // Use Standard Resolution
                vendedorNombre = await resolveVendorName(rawVendor);
            }

            const cajaOperacion = colCajaOperacion && row[colCajaOperacion] ? String(row[colCajaOperacion]).trim() : null;
            const usuarioIngreso = colUsuarioIngreso && row[colUsuarioIngreso] ? String(row[colUsuarioIngreso]).trim() : null;
            const montoTotalExcel = colMontoTotal ? parseNumeric(row[colMontoTotal]) : null;
            const saldoFavor = colSaldoFavor ? parseNumeric(row[colSaldoFavor]) : null;
            const saldoFavorTotal = colSaldoFavorTotal ? parseNumeric(row[colSaldoFavorTotal]) : null;
            const tipoPago = colTipoPago && row[colTipoPago] ? String(row[colTipoPago]).trim() : null;
            const estadoAbono = colEstadoAbono && row[colEstadoAbono] ? String(row[colEstadoAbono]).trim() : null;
            const identificadorAbono = colIdentificadorAbono && row[colIdentificadorAbono] ? String(row[colIdentificadorAbono]).trim() : '';
            const fechaVencimiento = colFechaVencimiento ? parseExcelDate(row[colFechaVencimiento]) : null;

            // Deduplication / Key Generation
            const folioNorm = norm(folio);
            const rawId = norm(identificadorAbono || '');
            let finalKey = `${folioNorm}|${fecha}|${rawId}`;
            let idAbonoFinal = identificadorAbono || '';

            if (processedKeys.has(finalKey)) {
                // Intra-batch duplicate logic
                let dupIndex = 1;
                while (true) {
                    const suffix = `_${dupIndex}`;
                    const candidateId = `${(identificadorAbono || '')}${suffix}`;
                    const candidateIdNorm = `${rawId}${suffix}`;
                    const candidateKey = `${folioNorm}|${fecha}|${candidateIdNorm}`;

                    if (!existingKeys.has(candidateKey) && !processedKeys.has(candidateKey)) {
                        idAbonoFinal = candidateId;
                        finalKey = candidateKey;
                        break;
                    }
                    dupIndex++;
                }
            }

            processedKeys.add(finalKey);
            existingKeys.add(finalKey);

            toImport.push({
                sucursal, folio, fecha, identificador, clienteNombre, vendedorClienteNombre: vendedorNombre,
                cajaOperacion, usuarioIngreso, montoTotal: montoTotalExcel, saldoFavor, saldoFavorTotal, tipoPago,
                estadoAbono, identificadorAbono: idAbonoFinal, fechaVencimiento, monto: montoExcel, montoNeto: montoNetoCalc
            });
        }

        let importedCount = 0;
        if (toImport.length > 0) {
            console.log(`✅ [Job ${jobId}] Insertando ${toImport.length} abonos (Standardized)...`);

            // Using Row-by-Row to support detailed error reporting and ON CONFLICT handling
            if (toImport.length > 0) {
                console.log(`✅ [Job ${jobId}] Insertando ${toImport.length} abonos (Masivo)...`);

                const BATCH_SIZE = 500;
                for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
                    const batch = toImport.slice(i, i + BATCH_SIZE);
                    const values = [];
                    const params = [];
                    let paramIndex = 1;

                    batch.forEach(item => {
                        params.push(
                            item.sucursal, item.folio, item.fecha, item.identificador, item.clienteNombre,
                            item.vendedorClienteNombre, item.cajaOperacion, item.usuarioIngreso, item.montoTotal,
                            item.saldoFavor, item.saldoFavorTotal, item.tipoPago, item.estadoAbono,
                            item.identificadorAbono, item.fechaVencimiento, item.monto, item.montoNeto
                        );

                        // Generate placeholders ($1, $2, ... $17)
                        const rowPlaceholders = Array.from({ length: 17 }, () => `$${paramIndex++}`).join(', ');
                        values.push(`(${rowPlaceholders})`);
                    });

                    const query = `
                    INSERT INTO abono (
                        sucursal, folio, fecha, identificador, cliente, vendedor_cliente, 
                        caja_operacion, usuario_ingreso, monto_total, saldo_a_favor, 
                        saldo_a_favor_total, tipo_pago, estado_abono, identificador_abono, 
                        fecha_vencimiento, monto, monto_neto, created_at
                    ) VALUES ${values.join(', ')}
                    ON CONFLICT (folio, identificador_abono, fecha) DO UPDATE SET
                        identificador = COALESCE(EXCLUDED.identificador, abono.identificador),
                        cliente = COALESCE(EXCLUDED.cliente, abono.cliente),
                        vendedor_cliente = COALESCE(EXCLUDED.vendedor_cliente, abono.vendedor_cliente),
                        estado_abono = EXCLUDED.estado_abono,
                        monto = EXCLUDED.monto,
                        monto_neto = EXCLUDED.monto_neto
                    RETURNING (xmax = 0) AS inserted
                `;

                    try {
                        const res = await client.query(query, params);
                        res.rows.forEach(row => {
                            if (row.inserted) importedCount++;
                        });
                        console.log(`   Processed batch ${i} - ${i + batch.length} / ${toImport.length}`);
                    } catch (err) {
                        console.error(`❌ [Job ${jobId}] Error en batch ${i}:`, err.message);
                        observations.push({
                            fila: `${i + 2} - ${i + batch.length + 1}`,
                            folio: 'BATCH ERROR',
                            campo: 'DB',
                            detalle: `Error en lote: ${err.message}`
                        });
                    }
                }
            }
        }

        let observationsReportPath = null;
        if (observations.length > 0) {
            const wbObs = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wbObs, XLSX.utils.json_to_sheet(observations.map(o => ({ 'Folio': o.folio, 'Error': o.detalle }))), 'Observaciones');
            const reportDir = 'uploads/reports';
            if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
            observationsReportPath = path.join(reportDir, `observaciones_abonos_${jobId}.xlsx`);
            XLSX.writeFile(wbObs, observationsReportPath);
        }

        const result = {
            success: true,
            totalRows: data.length,
            toImport: toImport.length,
            imported: importedCount,
            observationsReportUrl: observationsReportPath ? `/api/import/download-report/${path.basename(observationsReportPath)}` : null,
            dataImported: importedCount > 0
        };

        await updateJobStatus(jobId, 'completed', {
            totalRows: data.length, importedRows: importedCount, errorRows: observations.length,
            resultData: result, observationsFilename: observationsReportPath ? path.basename(observationsReportPath) : null
        });

        console.log(`✅ [Job ${jobId}] Abonos finalizado (Standardized)`);
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
