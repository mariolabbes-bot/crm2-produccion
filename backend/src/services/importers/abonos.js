const pool = require('../../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { updateJobStatus } = require('../jobManager');
const { norm, parseExcelDate, parseNumeric } = require('./utils');

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

        const headers = Object.keys(data[0] || {});
        const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;

        const colFolio = findCol([/^Folio$/i, /Folio/i]);
        const colFecha = findCol([/^Fecha$/i, /Fecha.*abono/i, /Fecha/i]);
        const colMontoNeto = findCol([/^Monto.*neto$/i, /Monto.*neto/i]);

        if (!colFolio || !colFecha || !colMontoNeto) {
            throw new Error(`Faltan columnas requeridas: Folio, Fecha, Monto Neto`);
        }

        const colSucursal = findCol([/^Sucursal$/i]);
        const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i]);
        const colCliente = findCol([/^Cliente$/i]);
        const colVendedorCliente = findCol([/^Alias.*vendedor$/i, /^Vendedor.*cliente$/i, /^Vendedor$/i]);
        const colCajaOperacion = findCol([/^Caja.*operacion$/i]);
        const colUsuarioIngreso = findCol([/^Usuario.*ingreso$/i]);
        const colMonto = findCol([/^Monto$/i, /Monto.*abono/i]);
        const colMontoTotal = findCol([/^Monto.*total$/i]);
        const colSaldoFavor = findCol([/^Saldo.*favor$/i]);
        const colSaldoFavorTotal = findCol([/^Saldo.*favor.*total$/i]);
        const colTipoPago = findCol([/^Tipo.*pago$/i]);
        const colEstadoAbono = findCol([/^Estado.*abono$/i]);
        const colIdentificadorAbono = findCol([/^Identificador.*abono$/i]);
        const colFechaVencimiento = findCol([/^Fecha.*vencimiento$/i]);

        // Usarios map
        const usersRes = await client.query("SELECT nombre_vendedor FROM usuario WHERE nombre_vendedor IS NOT NULL");
        const usersByNormFull = new Map();
        const usersByFirstTwo = new Map();
        const usersByFirstWord = new Map();
        usersRes.rows.forEach(u => {
            const fullNorm = norm(u.nombre_vendedor);
            const words = fullNorm.split(/\s+/).filter(w => w.length > 0);
            usersByNormFull.set(fullNorm, u.nombre_vendedor);
            if (words.length >= 2) usersByFirstTwo.set(words.slice(0, 2).join(' '), u.nombre_vendedor);
            if (words.length >= 1) usersByFirstWord.set(words[0], u.nombre_vendedor);
        });

        // Client map
        const clientsRes = await client.query("SELECT rut, nombre FROM cliente");
        const clientsByRut = new Map(clientsRes.rows.map(c => [norm(c.rut), c.rut]));

        // Existing abonos logic
        const existingAbonos = await client.query(`SELECT id, folio, fecha, identificador_abono, identificador, cliente, vendedor_cliente FROM abono WHERE folio IS NOT NULL`);
        const existingKeys = new Set();
        const existingByFolio = new Map();
        existingAbonos.rows.forEach(a => {
            const f = norm(a.folio || '');
            // existingKeys is roughly check, logic is redundant if we check existingByFolio
            existingByFolio.set(f, a);
            existingKeys.add(`${f}|${a.fecha}|${norm(a.identificador_abono || '')}`);
        });

        const toImport = [];
        const duplicates = [];
        const missingVendors = new Set();
        const missingClients = new Set();
        const observations = [];
        const updates = [];
        let updatedMissing = 0;
        const updatedDetails = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const excelRow = i + 2;
            const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
            const fecha = parseExcelDate(row[colFecha]);
            const montoNeto = parseNumeric(row[colMontoNeto]);

            if (!folio || !fecha || !montoNeto || montoNeto <= 0) continue;

            const sucursal = colSucursal && row[colSucursal] ? String(row[colSucursal]).trim() : null;
            const identificador = colIdentificador && row[colIdentificador] ? String(row[colIdentificador]).trim() : null;
            const clienteNombre = colCliente && row[colCliente] ? String(row[colCliente]).trim() : null;
            const vendedorClienteAlias = colVendedorCliente && row[colVendedorCliente] ? String(row[colVendedorCliente]).trim() : null;
            const cajaOperacion = colCajaOperacion && row[colCajaOperacion] ? String(row[colCajaOperacion]).trim() : null;
            const usuarioIngreso = colUsuarioIngreso && row[colUsuarioIngreso] ? String(row[colUsuarioIngreso]).trim() : null;
            const monto = colMonto ? parseNumeric(row[colMonto]) : null;
            const montoTotal = colMontoTotal ? parseNumeric(row[colMontoTotal]) : null;
            const saldoFavor = colSaldoFavor ? parseNumeric(row[colSaldoFavor]) : null;
            const saldoFavorTotal = colSaldoFavorTotal ? parseNumeric(row[colSaldoFavorTotal]) : null;
            const tipoPago = colTipoPago && row[colTipoPago] ? String(row[colTipoPago]).trim() : null;
            const estadoAbono = colEstadoAbono && row[colEstadoAbono] ? String(row[colEstadoAbono]).trim() : null;
            const identificadorAbono = colIdentificadorAbono && row[colIdentificadorAbono] ? String(row[colIdentificadorAbono]).trim() : null;
            const fechaVencimiento = colFechaVencimiento ? parseExcelDate(row[colFechaVencimiento]) : null;

            let vendedorNombre = null;
            if (vendedorClienteAlias) {
                const vendorNorm = norm(vendedorClienteAlias);
                const vendorWords = vendorNorm.split(/\s+/).filter(w => w.length > 0);
                if (usersByNormFull.has(vendorNorm)) vendedorNombre = usersByNormFull.get(vendorNorm);
                else if (vendorWords.length >= 2 && usersByFirstTwo.has(vendorWords.slice(0, 2).join(' '))) vendedorNombre = usersByFirstTwo.get(vendorWords.slice(0, 2).join(' '));
                else if (vendorWords.length >= 1 && usersByFirstWord.has(vendorWords[0])) vendedorNombre = usersByFirstWord.get(vendorWords[0]);

                if (!vendedorNombre) {
                    missingVendors.add(vendedorClienteAlias);
                    observations.push({ fila: excelRow, folio, campo: 'vendedor_cliente', detalle: `Vendedor no encontrado: ${vendedorClienteAlias}` });
                }
            }

            let clienteRut = null;
            if (identificador && /^\d{7,8}-[\dkK]$/.test(identificador) && clientsByRut.has(norm(identificador))) clienteRut = identificador;
            if (!clienteRut && clienteNombre) {
                missingClients.add(clienteNombre);
                observations.push({ fila: excelRow, folio, campo: 'identificador', detalle: `Cliente no encontrado (${clienteNombre})` });
            }

            const folioNorm = norm(folio);
            const dupKey = `${folioNorm}|${fecha}|${norm(identificadorAbono || '')}`;
            const existingRow = existingByFolio.get(folioNorm);

            if (existingKeys.has(dupKey) || existingRow) {
                if (updateMissing && existingRow) {
                    const needsId = (!existingRow.identificador && clienteRut);
                    const needsVend = (!existingRow.vendedor_cliente && vendedorNombre);
                    if (needsId || needsVend) {
                        updates.push({ id: existingRow.id, folio, identificador: needsId ? clienteRut : null, clienteNombre: needsId ? clienteNombre : null, vendedorClienteNombre: needsVend ? vendedorNombre : null });
                        updatedMissing++;
                        continue;
                    }
                }
                duplicates.push({ folio, fecha, identificadorAbono, monto: montoNeto });
                continue;
            }

            toImport.push({
                sucursal, folio, fecha, identificador: clienteRut, clienteNombre, vendedorClienteNombre: vendedorNombre,
                cajaOperacion, usuarioIngreso, montoTotal, saldoFavor, saldoFavorTotal, tipoPago,
                estadoAbono, identificadorAbono, fechaVencimiento, monto, montoNeto
            });
        }

        // Reports
        let pendingReportPath = null;
        if (missingVendors.size > 0 || missingClients.size > 0) {
            const reportWB = XLSX.utils.book_new();
            if (missingVendors.size > 0) XLSX.utils.book_append_sheet(reportWB, XLSX.utils.json_to_sheet(Array.from(missingVendors).map(v => ({ 'Alias Vendedor': v }))), 'Vendedores Faltantes');
            if (missingClients.size > 0) XLSX.utils.book_append_sheet(reportWB, XLSX.utils.json_to_sheet(Array.from(missingClients).map(c => ({ 'Cliente': c }))), 'Clientes Faltantes');
            const reportDir = 'uploads/reports';
            if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
            pendingReportPath = path.join(reportDir, `faltantes_abonos_${jobId}.xlsx`);
            XLSX.writeFile(reportWB, pendingReportPath);
        }

        let importedCount = 0;
        if (toImport.length > 0) {
            console.log(`✅ [Job ${jobId}] Insertando ${toImport.length} abonos...`);
            for (const item of toImport) {
                try {
                    await client.query(`INSERT INTO abono (sucursal, folio, fecha, identificador, cliente, vendedor_cliente, caja_operacion, usuario_ingreso, monto_total, saldo_a_favor, saldo_a_favor_total, tipo_pago, estado_abono, identificador_abono, fecha_vencimiento, monto, monto_neto) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                        [item.sucursal, item.folio, item.fecha, item.identificador, item.clienteNombre, item.vendedorClienteNombre, item.cajaOperacion, item.usuarioIngreso, item.montoTotal, item.saldoFavor, item.saldoFavorTotal, item.tipoPago, item.estadoAbono, item.identificadorAbono, item.fechaVencimiento, item.monto, item.montoNeto]);
                    importedCount++;
                } catch (err) {
                    console.error(`❌ [Job ${jobId}] Insert error row:`, err.message);
                    observations.push({ fila: 'N/A', folio: item.folio, campo: 'DB', detalle: err.detail || err.message });
                }
            }
        }

        // Updates
        let updatedReportPath = null;
        if (updates.length > 0) {
            console.log(`🛠️ [Job ${jobId}] Aplicando ${updates.length} updates...`);
            for (const u of updates) {
                try {
                    const beforeRes = await client.query('SELECT identificador, cliente, vendedor_cliente FROM abono WHERE id=$1', [u.id]);
                    const before = beforeRes.rows[0] || {};
                    await client.query(`UPDATE abono SET identificador = COALESCE($2, identificador), cliente = COALESCE($3, cliente), vendedor_cliente = COALESCE($4, vendedor_cliente) WHERE id = $1`, [u.id, u.identificador, u.clienteNombre, u.vendedorClienteNombre]);
                    const afterRes = await client.query('SELECT identificador, cliente, vendedor_cliente FROM abono WHERE id=$1', [u.id]);
                    const after = afterRes.rows[0] || {};
                    updatedDetails.push({ folio: u.folio, identificador_antes: before.identificador, identificador_despues: after.identificador, vendedor_antes: before.vendedor_cliente, vendedor_despues: after.vendedor_cliente });
                } catch (e) {
                    observations.push({ fila: null, folio: u.folio, campo: 'UPDATE', detalle: e.message });
                }
            }
            if (updatedDetails.length > 0) {
                const wbUpd = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wbUpd, XLSX.utils.json_to_sheet(updatedDetails), 'Actualizados');
                const reportDir = 'uploads/reports';
                if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
                updatedReportPath = path.join(reportDir, `actualizados_abonos_${jobId}.xlsx`);
                XLSX.writeFile(wbUpd, updatedReportPath);
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
            totalRows: data.length, toImport: toImport.length, imported: importedCount, duplicates: duplicates.length,
            missingVendors: Array.from(missingVendors), missingClients: Array.from(missingClients),
            pendingReportUrl: pendingReportPath ? `/api/import/download-report/${path.basename(pendingReportPath)}` : null,
            observationsReportUrl: observationsReportPath ? `/api/import/download-report/${path.basename(observationsReportPath)}` : null,
            updatedReportUrl: updatedReportPath ? `/api/import/download-report/${path.basename(updatedReportPath)}` : null,
            updatedMissing,
            dataImported: importedCount > 0
        };

        await updateJobStatus(jobId, 'completed', {
            totalRows: data.length, importedRows: importedCount, duplicateRows: duplicates.length, errorRows: observations.length,
            resultData: result, reportFilename: pendingReportPath ? path.basename(pendingReportPath) : null, observationsFilename: observationsReportPath ? path.basename(observationsReportPath) : null
        });

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.log(`✅ [Job ${jobId}] Abonos finalizado`);
        return result;

    } catch (error) {
        console.error(`❌ [Job ${jobId}] Falló abonos:`, error);
        await updateJobStatus(jobId, 'failed', { errorMessage: error.message });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { processAbonosFileAsync };
