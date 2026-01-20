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
        const colTipoDoc = findCol([/^Tipo.*doc/i]);
        const colFecha = findCol([/^Fecha/i]);
        const colSucursal = findCol([/^Sucursal$/i]);
        const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i]);
        const colCliente = findCol([/^Cliente$/i]);
        const colVendedorCliente = findCol([/^Vendedor.*cliente$/i, /^Alias.*vendedor$/i]);
        const colVendedorDoc = findCol([/^Vendedor.*documento$/i, /^Vendedor$/i]);
        const colEstadoSistema = findCol([/^Estado.*sistema$/i]);
        const colEstadoComercial = findCol([/^Estado.*comercial$/i]);
        const colEstadoSII = findCol([/^Estado.*SII$/i, /^Estado.*sii$/i]);
        const colIndice = findCol([/ndice$/i, /^Index$/i]);
        const colSKU = findCol([/^SKU$/i, /^Codigo$/i]);
        const colDescripcion = findCol([/^Descripc/i]);
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

        // --- 1. Cargar Usuarios/Vendedores (ALIAS) ---
        const usersRes = await client.query("SELECT alias, nombre_vendedor FROM usuario WHERE alias IS NOT NULL");
        const aliasMap = new Map(); // Lowercase -> RealAlias
        usersRes.rows.forEach(u => {
            const a = (u.alias || u.nombre_vendedor || '').trim();
            if (a) aliasMap.set(a.toLowerCase(), a);
        });

        // --- 2. Pre-scan for Missing Vendors (Stubs) ---
        const newAliases = new Set();
        const scanVendor = (val) => {
            if (!val) return;
            const s = String(val).trim();
            if (s && !aliasMap.has(s.toLowerCase())) {
                newAliases.add(s);
            }
        };

        for (const row of data) {
            if (colVendedorDoc) scanVendor(row[colVendedorDoc]);
            if (colVendedorCliente) scanVendor(row[colVendedorCliente]);
        }

        if (newAliases.size > 0) {
            console.log(`🛠️ [Job ${jobId}] Creando ${newAliases.size} stubs de vendedor...`);
            for (const originalAlias of newAliases) {
                try {
                    const dummyRut = `STUB-${Math.floor(Math.random() * 100000000)}-${Date.now()}`;
                    await client.query(`
                        INSERT INTO usuario (rut, nombre_completo, nombre_vendedor, rol_usuario, password, alias)
                        VALUES ($1, $2, $2, 'VENDEDOR', '123456', $2)
                        ON CONFLICT (rut) DO NOTHING
                    `, [dummyRut.slice(0, 12), originalAlias]);
                    // Update Map
                    aliasMap.set(originalAlias.toLowerCase(), originalAlias);
                } catch (err) {
                    console.warn(`Could not create stub for alias ${originalAlias}: ${err.message}`);
                }
            }
        }

        // --- 3. Cargar Clientes (RUT) ---
        const clientsRes = await client.query("SELECT rut, nombre FROM cliente");
        const clientsByRut = new Map(clientsRes.rows.filter(c => c.rut).map(c => [norm(c.rut), c.rut]));

        // --- 4. Cargar Productos (SKU) ---
        const productsRes = await client.query("SELECT sku, litros_por_unidad FROM producto");
        const productsBySku = new Map(productsRes.rows.map(p => [norm(p.sku), { sku: p.sku, litros: parseFloat(p.litros_por_unidad) || 0 }]));

        // Check Existing Sales to avoid duplicates
        const existingSales = await client.query(
            "SELECT folio, tipo_documento, indice FROM venta WHERE folio IS NOT NULL AND tipo_documento IS NOT NULL"
        );
        const existingKeys = new Set(
            existingSales.rows.map(s => `${norm(s.tipo_documento)}|${norm(s.folio)}|${norm(s.indice || '')}`)
        );

        const toImport = [];
        const duplicates = [];
        const missingVendors = new Set(); // Should be empty now due to stubs
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

            const duplicateKey = `${norm(tipoDoc)}|${norm(folio)}|${norm(indice)}`;
            if (existingKeys.has(duplicateKey)) {
                duplicates.push({ folio, tipoDoc, indice, fecha });
                continue;
            }

            const cantidad = colCantidad ? parseNumeric(row[colCantidad]) : 0;
            const precio = colPrecio ? parseNumeric(row[colPrecio]) : 0;
            let valorTotal = (colValorTotal && row[colValorTotal]) ? parseNumeric(row[colValorTotal]) : (cantidad * precio);

            const sucursal = colSucursal && row[colSucursal] ? String(row[colSucursal]).trim() : null;
            const identificador = colIdentificador && row[colIdentificador] ? String(row[colIdentificador]).trim() : null; // RUT
            const clienteNombre = colCliente && row[colCliente] ? String(row[colCliente]).trim() : null;

            // Strict check: if no identifier/folio, just skip
            if (!identificador && !clienteNombre) {
                observations.push({ fila: excelRow, folio: folio || 'N/A', campo: 'Identificador/Cliente', detalle: 'Fila saltada: No tiene RUT ni Nombre de Cliente' });
                continue;
            }

            // Vendors -> Resolve via AliasMap
            let vendedorDoc = null;
            if (colVendedorDoc && row[colVendedorDoc]) {
                const raw = String(row[colVendedorDoc]).trim();
                if (aliasMap.has(raw.toLowerCase())) vendedorDoc = aliasMap.get(raw.toLowerCase());
                else missingVendors.add(raw);
            }

            let vendedorClienteAlias = null;
            if (colVendedorCliente && row[colVendedorCliente]) {
                const raw = String(row[colVendedorCliente]).trim();
                if (aliasMap.has(raw.toLowerCase())) vendedorClienteAlias = aliasMap.get(raw.toLowerCase());
            }

            const estadoSistema = colEstadoSistema && row[colEstadoSistema] ? String(row[colEstadoSistema]).trim() : null;
            const estadoComercial = colEstadoComercial && row[colEstadoComercial] ? String(row[colEstadoComercial]).trim() : null;
            const estadoSII = colEstadoSII && row[colEstadoSII] ? String(row[colEstadoSII]).trim() : null;
            const sku = colSKU && row[colSKU] ? String(row[colSKU]).trim() : null;
            const descripcion = colDescripcion && row[colDescripcion] ? String(row[colDescripcion]).trim() : null;

            // STUB CLIENT
            let clienteRut = null;
            if (identificador) {
                const rutNorm = norm(identificador);
                if (clientsByRut.has(rutNorm)) {
                    clienteRut = clientsByRut.get(rutNorm);
                } else {
                    // Create Stub
                    if (!missingClients.has(rutNorm)) { // Check if we already tried and failed
                        try {
                            await client.query("INSERT INTO cliente (rut, nombre) VALUES ($1, $2) ON CONFLICT (rut) DO NOTHING", [identificador, clienteNombre || 'Unknown']);
                            clientsByRut.set(rutNorm, identificador);
                            // Log as observation/info but NOT as missing blocking
                            observations.push({ fila: excelRow, campo: 'cliente', detalle: `Cliente Nuevo Creado (Stub): ${identificador}` });
                            clienteRut = identificador;
                        } catch (e) {
                            console.error(e);
                            missingClients.add(rutNorm); // Only add to missing if failed
                            observations.push({ fila: excelRow, campo: 'cliente', detalle: `Error creando cliente: ${e.message}` });
                        }
                    }
                }
            }

            // STUB PRODUCT
            if (sku) {
                const skuNorm = norm(sku);
                if (!productsBySku.has(skuNorm)) {
                    try {
                        await client.query("INSERT INTO producto (sku, descripcion, familia, marca, subfamilia) VALUES ($1, $2, 'SIN CLASIFICAR', 'GENERICO', 'SIN CLASIFICAR') ON CONFLICT (sku) DO NOTHING", [sku, descripcion || 'Sin Descripcion']);
                        productsBySku.set(skuNorm, { sku, litros: 0 });
                        observations.push({ fila: excelRow, campo: 'sku', detalle: `Producto Nuevo Creado (Stub): ${sku}` });
                    } catch (e) { console.error(e); }
                }
            }

            toImport.push({
                sucursal, tipoDoc, folio, fecha, identificador: clienteRut, clienteNombre,
                vendedorClienteAlias, vendedorDocNombre: vendedorDoc,
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
                XLSX.utils.book_append_sheet(reportWB, XLSX.utils.json_to_sheet(clientData), 'Clientes Fallidos');
            }
            const reportDir = 'uploads/reports';
            if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
            pendingReportPath = path.join(reportDir, `faltantes_criticos_${jobId}.xlsx`);
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
                        params.push(item.sucursal, item.tipoDoc, item.folio, item.fecha, item.identificador, item.clienteNombre, item.vendedorClienteAlias, item.vendedorDocNombre, item.estadoSistema, item.estadoComercial, item.estadoSII, item.indice, item.sku, item.descripcion, item.cantidad, item.precio, item.valorTotal, litrosVendidos);
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

        console.log(`✅ [Job ${jobId}] Terminado exitosamente`);
        return result;

    } catch (error) {
        console.error(`❌ [Job ${jobId}] Falló:`, error);
        await updateJobStatus(jobId, 'failed', { errorMessage: error.message });
        throw error;
    } finally {
        client.release();
    }
}
module.exports = { processVentasFileAsync };
