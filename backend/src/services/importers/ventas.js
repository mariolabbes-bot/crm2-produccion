const pool = require('../../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { updateJobStatus } = require('../jobManager');
const { norm, parseExcelDate, parseNumeric } = require('./utils');

async function processVentasFileAsync(jobId, filePath, originalname) {
    const client = await pool.connect();

    try {
        console.log(`🔵 [Job ${jobId}] Iniciando procesamiento: ${originalname}`);
        await updateJobStatus(jobId, 'processing');

        // Leer Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

        console.log(`📊 [Job ${jobId}] Total filas en Excel: ${data.length}`);
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('El archivo Excel no contiene filas para procesar');
        }

        // Detectar columnas
        const headers = Object.keys(data[0] || {});
        const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;

        const colFolio = findCol([/^Folio$/i]);
        const colTipoDoc = findCol([/^Tipo.*documento$/i, /^Tipo$/i]);
        const colFecha = findCol([/^Fecha$/i, /^Fecha.*emision$/i]);
        const colSucursal = findCol([/^Sucursal$/i]);
        const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i]);
        const colCliente = findCol([/^Cliente$/i]);
        const colVendedorCliente = findCol([/^Vendedor.*cliente$/i, /^Alias.*vendedor$/i]);
        const colVendedorDoc = findCol([/^Vendedor.*documento$/i, /^Vendedor$/i]);
        const colEstadoSistema = findCol([/^Estado.*sistema$/i]);
        const colEstadoComercial = findCol([/^Estado.*comercial$/i]);
        const colEstadoSII = findCol([/^Estado.*SII$/i, /^Estado.*sii$/i]);
        const colIndice = findCol([/^Indice$/i, /^Index$/i]);
        const colSKU = findCol([/^SKU$/i, /^Codigo$/i]);
        const colDescripcion = findCol([/^Descripcion$/i, /^Descripción$/i]);
        const colCantidad = findCol([/^Cantidad$/i]);
        const colPrecio = findCol([/^Precio$/i]);
        const colValorTotal = findCol([/^Valor.*total$/i, /^Total$/i]);

        if (!colFolio || !colTipoDoc || !colFecha) {
            const faltantes = [
                !colFolio ? 'Folio' : null,
                !colTipoDoc ? 'Tipo documento' : null,
                !colFecha ? 'Fecha' : null
            ].filter(Boolean);
            throw new Error(`Faltan columnas requeridas: ${faltantes.join(', ')}`);
        }

        // Cargar usuarios existentes
        const usersRes = await client.query("SELECT nombre_vendedor, nombre_completo FROM usuario WHERE nombre_vendedor IS NOT NULL");
        const usersByNormFull = new Map();
        const usersByFirstWord = new Map();
        const usersByFirstTwo = new Map();

        usersRes.rows.filter(u => u.nombre_vendedor).forEach(u => {
            const nombreNorm = norm(u.nombre_vendedor);
            const palabras = nombreNorm.split(/\s+/);
            usersByNormFull.set(nombreNorm, u.nombre_vendedor);
            if (palabras.length > 0) usersByFirstWord.set(palabras[0], u.nombre_vendedor);
            if (palabras.length >= 2) usersByFirstTwo.set(`${palabras[0]} ${palabras[1]}`, u.nombre_vendedor);
        });

        // Cargar clientes existentes
        const clientsRes = await client.query("SELECT rut, nombre FROM cliente");
        const clientsByRut = new Map(clientsRes.rows.filter(c => c.rut).map(c => [norm(c.rut), c.rut]));

        // Verificar duplicados existentes
        const existingSales = await client.query(
            "SELECT folio, tipo_documento, indice FROM venta WHERE folio IS NOT NULL AND tipo_documento IS NOT NULL"
        );
        const existingKeys = new Set(
            existingSales.rows.map(s => `${norm(s.tipo_documento)}|${norm(s.folio)}|${norm(s.indice || '')}`)
        );

        const toImport = [];
        const duplicates = [];
        const missingVendors = new Set();
        const missingClients = new Set();
        const observations = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const excelRow = i + 2;
            const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
            const tipoDoc = row[colTipoDoc] ? String(row[colTipoDoc]).trim() : null;
            const fecha = parseExcelDate(row[colFecha]);
            const indice = colIndice && row[colIndice] ? String(row[colIndice]).trim() : '';

            if (!folio || !tipoDoc || !fecha) continue;

            const key = `${norm(tipoDoc)}|${norm(folio)}|${norm(indice)}`;
            if (existingKeys.has(key)) {
                duplicates.push({ folio, tipoDoc, indice, fecha });
                continue;
            }

            const sucursal = colSucursal && row[colSucursal] ? String(row[colSucursal]).trim() : null;
            const identificador = colIdentificador && row[colIdentificador] ? String(row[colIdentificador]).trim() : null;
            const clienteNombre = colCliente && row[colCliente] ? String(row[colCliente]).trim() : null;
            const vendedorClienteAlias = colVendedorCliente && row[colVendedorCliente] ? String(row[colVendedorCliente]).trim() : null;
            const vendedorDocNombre = colVendedorDoc && row[colVendedorDoc] ? String(row[colVendedorDoc]).trim() : null;
            const estadoSistema = colEstadoSistema && row[colEstadoSistema] ? String(row[colEstadoSistema]).trim() : null;
            const estadoComercial = colEstadoComercial && row[colEstadoComercial] ? String(row[colEstadoComercial]).trim() : null;
            const estadoSII = colEstadoSII && row[colEstadoSII] ? String(row[colEstadoSII]).trim() : null;
            const sku = colSKU && row[colSKU] ? String(row[colSKU]).trim() : null;
            const descripcion = colDescripcion && row[colDescripcion] ? String(row[colDescripcion]).trim() : null;
            const cantidad = colCantidad ? parseNumeric(row[colCantidad]) : null;
            const precio = colPrecio ? parseNumeric(row[colPrecio]) : null;
            const valorTotal = colValorTotal ? parseNumeric(row[colValorTotal]) : null;

            let vendedorAlias = null;
            if (vendedorClienteAlias) {
                const vendedorNorm = norm(vendedorClienteAlias);
                const palabras = vendedorNorm.split(/\s+/);
                let found = null;
                if (usersByNormFull.has(vendedorNorm)) found = usersByNormFull.get(vendedorNorm);
                else if (palabras.length >= 2) {
                    const dosPalabras = `${palabras[0]} ${palabras[1]}`;
                    if (usersByFirstTwo.has(dosPalabras)) found = usersByFirstTwo.get(dosPalabras);
                }
                if (!found && palabras.length > 0 && usersByFirstWord.has(palabras[0])) found = usersByFirstWord.get(palabras[0]);

                if (found) {
                    vendedorAlias = found;
                } else {
                    missingVendors.add(vendedorClienteAlias);
                    observations.push({ fila: excelRow, folio, campo: 'vendedor_cliente', detalle: `Vendedor no encontrado: ${vendedorClienteAlias}` });
                }
            }

            let clienteRut = null;
            if (identificador && /^\d{7,8}-[\dkK]$/.test(identificador)) {
                if (clientsByRut.has(norm(identificador))) clienteRut = identificador;
            }
            if (!clienteRut && (clienteNombre || identificador)) {
                missingClients.add(clienteNombre || identificador);
                observations.push({ fila: excelRow, folio, campo: 'identificador', detalle: `Cliente no encontrado: ${clienteNombre || identificador}` });
            }

            toImport.push({
                sucursal, tipoDoc, folio, fecha, identificador: clienteRut, clienteNombre,
                vendedorClienteAlias: vendedorAlias, vendedorDocNombre,
                estadoSistema, estadoComercial, estadoSII, indice,
                sku, descripcion, cantidad, precio, valorTotal
            });
        }

        // Reports logic
        let pendingReportPath = null;
        if (missingVendors.size > 0 || missingClients.size > 0) {
            const reportWB = XLSX.utils.book_new();
            if (missingVendors.size > 0) {
                const vendorData = Array.from(missingVendors).map(v => ({ 'Nombre o Alias Vendedor': v, 'Email': '', 'Rol': 'vendedor' }));
                XLSX.utils.book_append_sheet(reportWB, XLSX.utils.json_to_sheet(vendorData), 'Vendedores Faltantes');
            }
            if (missingClients.size > 0) {
                const clientData = Array.from(missingClients).map(c => {
                    const rutRegex = /^\d{7,8}-[\dkK]$/;
                    return rutRegex.test(c) ? { 'RUT': c, 'Nombre': '', 'Email': '', 'Teléfono': '' } : { 'RUT': '', 'Nombre': c, 'Email': '', 'Teléfono': '' };
                });
                XLSX.utils.book_append_sheet(reportWB, XLSX.utils.json_to_sheet(clientData), 'Clientes Faltantes');
            }
            const reportDir = 'uploads/reports';
            if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
            pendingReportPath = path.join(reportDir, `faltantes_${jobId}.xlsx`);
            XLSX.writeFile(reportWB, pendingReportPath);
        }

        let importedCount = 0;
        let observationsReportPath = null;

        if (toImport.length > 0) {
            console.log(`✅ [Job ${jobId}] Importando ${toImport.length} ventas...`);
            let productoMap = new Map();
            try {
                const productosRes = await client.query('SELECT sku, litros_por_unidad FROM producto WHERE litros_por_unidad IS NOT NULL');
                productosRes.rows.forEach(p => productoMap.set(p.sku ? p.sku.toUpperCase().trim() : '', parseFloat(p.litros_por_unidad) || 0));
            } catch (e) {
                console.warn(`⚠️ [Job ${jobId}] No se pudieron cargar productos:`, e.message);
            }

            const BATCH_SIZE = 500;
            for (let batchStart = 0; batchStart < toImport.length; batchStart += BATCH_SIZE) {
                const batchEnd = Math.min(batchStart + BATCH_SIZE, toImport.length);
                const batch = toImport.slice(batchStart, batchEnd);

                try {
                    let placeholders = [], params = [], paramIndex = 1;
                    for (let item of batch) {
                        let litrosVendidos = 0;
                        if (item.sku && item.cantidad) {
                            const lp = productoMap.get(item.sku.toUpperCase().trim());
                            if (lp > 0) litrosVendidos = item.cantidad * lp;
                        }
                        placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
                        params.push(item.sucursal, item.tipoDoc, item.folio, item.fecha, item.identificador, item.clienteNombre, item.vendedorClienteAlias, null, item.estadoSistema, item.estadoComercial, item.estadoSII, item.indice, item.sku, item.descripcion, item.cantidad, item.precio, item.valorTotal, litrosVendidos);
                    }

                    if (placeholders.length > 0) {
                        const query = `INSERT INTO venta (sucursal, tipo_documento, folio, fecha_emision, identificador, cliente, vendedor_cliente, vendedor_documento, estado_sistema, estado_comercial, estado_sii, indice, sku, descripcion, cantidad, precio, valor_total, litros_vendidos) VALUES ${placeholders.join(', ')}`;
                        const result = await client.query(query, params);
                        importedCount += result.rowCount;
                        console.log(`📊 [Job ${jobId}] Progreso: ${importedCount}/${toImport.length}`);
                    }
                } catch (err) {
                    console.error(`❌ [Job ${jobId}] Error en lote:`, err.message);
                    observations.push({ fila: `Lote ${batchStart}-${batchEnd}`, folio: null, campo: 'DB', detalle: err.detail || err.message });
                }
            }
        }

        if (observations.length > 0) {
            const wbObs = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wbObs, XLSX.utils.json_to_sheet(observations.map(o => ({ 'Fila Excel': o.fila, 'Folio': o.folio, 'Campo': o.campo, 'Detalle': o.detalle }))), 'Observaciones');
            const reportDir = 'uploads/reports';
            if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
            observationsReportPath = path.join(reportDir, `observaciones_ventas_${jobId}.xlsx`);
            XLSX.writeFile(wbObs, observationsReportPath);
        }

        const result = {
            success: true,
            totalRows: data.length,
            toImport: toImport.length,
            imported: importedCount,
            duplicates: duplicates.length,
            duplicatesList: duplicates.slice(0, 10),
            missingVendors: Array.from(missingVendors),
            missingClients: Array.from(missingClients),
            pendingReportUrl: pendingReportPath ? `/api/import/download-report/${path.basename(pendingReportPath)}` : null,
            observationsReportUrl: observationsReportPath ? `/api/import/download-report/${path.basename(observationsReportPath)}` : null,
            dataImported: importedCount > 0
        };

        await updateJobStatus(jobId, 'completed', {
            totalRows: data.length, importedRows: importedCount, duplicateRows: duplicates.length, errorRows: observations.length,
            resultData: result, reportFilename: pendingReportPath ? path.basename(pendingReportPath) : null, observationsFilename: observationsReportPath ? path.basename(observationsReportPath) : null
        });

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.log(`✅ [Job ${jobId}] Terminado exitosamente`);
        return result;

    } catch (error) {
        console.error(`❌ [Job ${jobId}] Falló:`, error);
        await updateJobStatus(jobId, 'failed', { errorMessage: error.message });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { processVentasFileAsync };
