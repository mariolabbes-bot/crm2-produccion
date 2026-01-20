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

        // Robust header detection: scan first 50 rows to find all potential keys
        // (XLSX fails to include keys for empty cells in the first row)
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

        // Headers specific handling for duplicates (Identificador)
        // XLSX usually dedupes headers as 'Identificador', 'Identificador_1'
        const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i]);
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

        console.log('--- Debug Columns ---');
        console.log('Headers:', headers);
        console.log('colIdentificadorAbono detected:', colIdentificadorAbono);
        console.log('colFolio:', colFolio);
        console.log('---------------------');

        if (!colFolio || !colFecha || !colMonto) {
            throw new Error(`Faltan columnas requeridas: Folio, Fecha, Monto`);
        }

        // --- 1. Usarios map (Alias) ---
        const usersRes = await client.query("SELECT alias, nombre_vendedor FROM usuario WHERE alias IS NOT NULL");
        const aliasMap = new Map();
        usersRes.rows.forEach(u => {
            const a = (u.alias || u.nombre_vendedor || '').trim();
            if (a) aliasMap.set(a.toLowerCase(), a);
        });

        // --- 2. Client map ---
        const clientsRes = await client.query("SELECT rut, nombre FROM cliente");
        const clientsByRut = new Map(clientsRes.rows.filter(c => c.rut).map(c => [norm(c.rut), c.rut]));

        // --- 3. Existing abonos logic ---
        const existingAbonos = await client.query(`SELECT id, folio, fecha, identificador_abono, identificador, cliente, vendedor_cliente FROM abono WHERE folio IS NOT NULL`);
        const existingByFolio = new Map();
        const existingKeys = new Set();
        existingAbonos.rows.forEach(a => {
            const f = norm(a.folio || '');
            existingByFolio.set(f, a);
            const d = new Date(a.fecha);
            const dateStr = !isNaN(d) ? d.toISOString().split('T')[0] : '';
            const key = `${f}|${dateStr}|${norm(a.identificador_abono || '')}`;
            existingKeys.add(key);
        });

        const toImport = [];
        const duplicates = [];
        // Missing sets
        const missingVendors = new Set();
        const missingClients = new Set();
        const observations = [];
        const updates = [];
        let updatedMissing = 0;
        const updatedDetails = [];

        // Pre-scan for stubs (Vendors)
        const newAliases = new Set();
        const processedKeys = new Set(); // Track keys processed in this batch to handle split payments
        const scanVendor = (val) => {
            if (!val) return;
            const s = String(val).trim();
            if (s && !aliasMap.has(s.toLowerCase())) {
                newAliases.add(s);
            }
        };
        for (const r of data) {
            if (colVendedorCliente && r[colVendedorCliente]) scanVendor(r[colVendedorCliente]);
        }
        if (newAliases.size > 0) {
            console.log(`🛠️ [Job ${jobId}] Creando ${newAliases.size} stubs de vendedor (Abonos)...`);
            for (const originalAlias of newAliases) {
                try {
                    const dummyRut = `STUB-${Math.floor(Math.random() * 100000000)}-${Date.now()}`;
                    await client.query(`INSERT INTO usuario (rut, nombre_completo, nombre_vendedor, rol_usuario, password, alias) VALUES ($1, $2, $2, 'VENDEDOR', '123456', $2) ON CONFLICT (rut) DO NOTHING`, [dummyRut.slice(0, 12), originalAlias]);
                    aliasMap.set(originalAlias.toLowerCase(), originalAlias);
                } catch (e) {
                    console.warn(`Could not create stub for alias ${originalAlias}: ${e.message}`);
                }
            }
        }

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const excelRow = i + 2;
            const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
            const fecha = parseExcelDate(row[colFecha]);

            // Logic: Monto in Excel is Total. We need Net -> Monto / 1.19
            const montoExcel = parseNumeric(row[colMonto]);
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
                            clientsByRut.set(rutNorm, identificador);
                            missingClients.add(rutNorm);
                        } catch (e) { console.error(e); }
                    }
                }
            }

            const vendedorClienteAlias = colVendedorCliente && row[colVendedorCliente] ? String(row[colVendedorCliente]).trim() : null;

            // Resolve Vendor
            let vendedorNombre = null;
            if (vendedorClienteAlias) {
                const lower = vendedorClienteAlias.toLowerCase();
                if (aliasMap.has(lower)) vendedorNombre = aliasMap.get(lower);
                else {
                    // Should be covered by pre-scan but just in case
                    missingVendors.add(vendedorClienteAlias);
                }
            }

            // ... (rest of logic mostly same)
            const cajaOperacion = colCajaOperacion && row[colCajaOperacion] ? String(row[colCajaOperacion]).trim() : null;
            const usuarioIngreso = colUsuarioIngreso && row[colUsuarioIngreso] ? String(row[colUsuarioIngreso]).trim() : null;
            const montoTotalExcel = colMontoTotal ? parseNumeric(row[colMontoTotal]) : null;
            const saldoFavor = colSaldoFavor ? parseNumeric(row[colSaldoFavor]) : null;
            const saldoFavorTotal = colSaldoFavorTotal ? parseNumeric(row[colSaldoFavorTotal]) : null;
            const tipoPago = colTipoPago && row[colTipoPago] ? String(row[colTipoPago]).trim() : null;
            const estadoAbono = colEstadoAbono && row[colEstadoAbono] ? String(row[colEstadoAbono]).trim() : null;
            const identificadorAbono = colIdentificadorAbono && row[colIdentificadorAbono] ? String(row[colIdentificadorAbono]).trim() : '';
            const fechaVencimiento = colFechaVencimiento ? parseExcelDate(row[colFechaVencimiento]) : null;

            if (i < 5) {
                console.log(`Row ${i} - Folio: ${folio} - ID Abono Raw: ${row[colIdentificadorAbono]} - ID Extracted: ${identificadorAbono}`);
            }

            let clienteRut = null;
            if (identificador && /^\d{7,8}-[\dkK]$/.test(identificador) && clientsByRut.has(norm(identificador))) clienteRut = identificador;

            // ... (check dup, push)

            const folioNorm = norm(folio);
            const rawId = norm(identificadorAbono || '');
            let finalKey = `${folioNorm}|${fecha}|${rawId}`;
            let idAbonoFinal = identificadorAbono || '';

            if (processedKeys.has(finalKey)) {
                // Intra-batch duplicate
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
                sucursal, folio, fecha, identificador: clienteRut, clienteNombre, vendedorClienteNombre: vendedorNombre,
                cajaOperacion, usuarioIngreso, montoTotal: montoTotalExcel, saldoFavor, saldoFavorTotal, tipoPago,
                estadoAbono, identificadorAbono: idAbonoFinal, fechaVencimiento, monto: montoExcel, montoNeto: montoNetoCalc
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
            console.log(`✅ [Job ${jobId}] Insertando ${toImport.length} abonos (Row-by-Row)...`);

            for (let i = 0; i < toImport.length; i++) {
                const item = toImport[i];
                const query = `
                    INSERT INTO abono (sucursal, folio, fecha, identificador, cliente, vendedor_cliente, caja_operacion, usuario_ingreso, monto_total, saldo_a_favor, saldo_a_favor_total, tipo_pago, estado_abono, identificador_abono, fecha_vencimiento, monto, monto_neto, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
                    ON CONFLICT (folio, identificador_abono, fecha) DO UPDATE SET
                        identificador = COALESCE(EXCLUDED.identificador, abono.identificador),
                        cliente = COALESCE(EXCLUDED.cliente, abono.cliente),
                        vendedor_cliente = COALESCE(EXCLUDED.vendedor_cliente, abono.vendedor_cliente),
                        estado_abono = EXCLUDED.estado_abono,
                        monto = EXCLUDED.monto,
                        monto_neto = EXCLUDED.monto_neto
                    RETURNING (xmax = 0) AS inserted
                `;
                const values = [
                    item.sucursal, item.folio, item.fecha, item.identificador, item.clienteNombre,
                    item.vendedorClienteNombre, item.cajaOperacion, item.usuarioIngreso, item.montoTotal,
                    item.saldoFavor, item.saldoFavorTotal, item.tipoPago, item.estadoAbono,
                    item.identificadorAbono, item.fechaVencimiento, item.monto, item.montoNeto
                ];

                try {
                    const res = await client.query(query, values);
                    if (res.rows[0].inserted) importedCount++;
                } catch (err) {
                    console.error(`❌ [Job ${jobId}] Row insert error (Folio ${item.folio}):`, err.message);
                    observations.push({ fila: i + 2, folio: item.folio, campo: 'DB', detalle: err.detail || err.message });
                }

                if (i % 100 === 0) console.log(`   [Progress] ${i} / ${toImport.length}`);
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

        console.log(`✅ [Job ${jobId}] Abonos finalizado`);
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
