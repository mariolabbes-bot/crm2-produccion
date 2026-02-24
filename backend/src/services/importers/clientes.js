const pool = require('../../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { updateJobStatus } = require('../jobManager');
const { norm, parseNumeric } = require('./utils');
const { resolveVendorName } = require('../../utils/vendorAlias');

async function processClientesFileAsync(jobId, filePath, originalname) {
    const client = await pool.connect();

    try {
        console.log(`🟣 [Job ${jobId}] Procesando Clientes: ${originalname}`);
        await updateJobStatus(jobId, 'processing');

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

        console.log(`📊 [Job ${jobId}] Total filas: ${data.length}`);
        if (!Array.isArray(data) || data.length === 0) throw new Error('Excel vacío');

        const headers = Object.keys(data[0] || {});
        const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;

        const colRUT = findCol([/^RUT$/i, /^Rut$/i, /^Identificador$/i]);
        const colNombre = findCol([/^Nombre$/i, /^Razon.*social$/i, /^Cliente$/i]);
        const colEmail = findCol([/^Email$/i, /^Correo$/i, /^E-mail$/i]);
        const colTelefono = findCol([/^Telefono.*principal$/i, /^Telefono$/i, /^Tel$/i, /^Fono$/i]);
        const colSucursal = findCol([/^Sucursal$/i]);
        const colCategoria = findCol([/^Categoria$/i, /^Categoría$/i]);
        const colSubcategoria = findCol([/^Subcategoria$/i, /^Subcategoría$/i]);
        const colComuna = findCol([/^Comuna$/i]);
        const colCiudad = findCol([/^Ciudad$/i]);
        const colDireccion = findCol([/^Direccion$/i, /^Dirección$/i]);
        const colNumero = findCol([/^Numero$/i, /^Número$/i, /^N°$/i, /^Nro$/i]);
        const colVendedor = findCol([/^Nombre.*vendedor$/i, /^Vendedor$/i]);
        const colCupo = findCol([/^Cupo$/i, /^L[ií]mite.*Cr[eé]dito$/i]);
        const colCupoUtilizado = findCol([/^Cupo.*Utilizado$/i, /^Utilizado$/i, /^Deuda$/i, /^Saldo.*Utilizado$/i]);
        const colCircuito = findCol([/^Circuito$/i, /^Ruta$/i, /^Zona$/i]);

        if (!colRUT || !colNombre) {
            throw new Error('Faltan columnas requeridas: RUT, Nombre');
        }

        // --- PRE-IMPORT: LOAD VENDOR ALIAS MAP ---
        const usersRes = await client.query("SELECT alias, nombre_vendedor FROM usuario");
        const aliasMap = new Map();
        usersRes.rows.forEach(u => {
            const fullName = u.nombre_vendedor;
            if (u.alias) aliasMap.set(u.alias.toLowerCase().trim(), fullName);
            if (u.nombre_vendedor) aliasMap.set(u.nombre_vendedor.toLowerCase().trim(), fullName);
        });

        // --- LOAD VENDOR MAPPING CSV (NORMALIZATION) ---
        const mapPath = path.join(__dirname, '../../../outputs/mapeo_vendedores.csv');
        const normalizationMap = new Map();
        if (fs.existsSync(mapPath)) {
            try {
                const csvData = fs.readFileSync(mapPath, 'utf8');
                const lines = csvData.split(/\r?\n/);
                // CSV Header: RUT_USUARIO;NOMBRE_USUARIO_LOGIN;CORREO;ASIGNAR_NOMBRE_VENTAS_EXACTO
                // We map Index 1 (Original) -> Index 3 (Target)

                lines.forEach((line, idx) => {
                    if (!line.trim() || idx === 0) return;
                    const cols = line.split(';');
                    if (cols.length >= 4) {
                        const original = cols[1];
                        const target = cols[3];
                        if (original && target) {
                            normalizationMap.set(original.toLowerCase().trim(), target.trim());
                            // Heuristic: If original has 'ñ', also add the '√±' version just in case
                            if (original.includes('ñ')) {
                                const bad = original.replace(/ñ/g, '√±');
                                normalizationMap.set(bad.toLowerCase().trim(), target.trim());
                            }
                        }
                    }
                });
                console.log(`🗺️ [Job ${jobId}] Cargado mapa de normalización: ${normalizationMap.size} entradas`);
            } catch (err) {
                console.warn(`⚠️ [Job ${jobId}] Error cargando mapa de vendedores: ${err.message}`);
            }
        }

        // --- PRE-SCAN FOR MISSING VENDORS (STUBS) ---
        const newAliases = new Set();
        if (colVendedor) {
            for (const row of data) {
                const v = row[colVendedor];
                if (v) {
                    let s = String(v).trim();
                    // Apply Normalization
                    if (normalizationMap.has(s.toLowerCase())) {
                        s = normalizationMap.get(s.toLowerCase());
                    }
                    if (!aliasMap.has(s.toLowerCase())) newAliases.add(s);
                }
            }
        }
        if (newAliases.size > 0) {
            for (const originalAlias of newAliases) {
                try {
                    const dummyRut = `STUB-${Math.floor(Math.random() * 100000000)}-${Date.now()}`;
                    await client.query(`
                        INSERT INTO usuario (rut, nombre_completo, nombre_vendedor, rol_usuario, password, alias)
                        VALUES ($1, $2, $2, 'VENDEDOR', '123456', $2)
                        ON CONFLICT (rut) DO NOTHING
                     `, [dummyRut.slice(0, 12), originalAlias]);
                    aliasMap.set(originalAlias.toLowerCase(), originalAlias);
                } catch (e) { console.warn(e.message); }
            }
        }

        const toImport = [];
        const observations = [];
        let skippedInvalid = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rut = row[colRUT] ? String(row[colRUT]).trim() : null;
            const nombre = row[colNombre] ? String(row[colNombre]).trim() : null;

            if (!rut || !nombre) {
                skippedInvalid++;
                continue;
            }

            let finalVendedor = null;
            if (colVendedor && row[colVendedor]) {
                let rawV = String(row[colVendedor]).trim();
                finalVendedor = await resolveVendorName(rawV);
            }

            toImport.push({
                rut, nombre,
                email: colEmail && row[colEmail] ? String(row[colEmail]).trim() : null,
                telefono: colTelefono && row[colTelefono] ? String(row[colTelefono]).trim() : null,
                sucursal: colSucursal && row[colSucursal] ? String(row[colSucursal]).trim() : null,
                categoria: colCategoria && row[colCategoria] ? String(row[colCategoria]).trim() : null,
                subcategoria: colSubcategoria && row[colSubcategoria] ? String(row[colSubcategoria]).trim() : null,
                comuna: colComuna && row[colComuna] ? String(row[colComuna]).trim() : null,
                ciudad: colCiudad && row[colCiudad] ? String(row[colCiudad]).trim() : null,
                direccion: colDireccion && row[colDireccion] ? String(row[colDireccion]).trim() : null,
                numero: colNumero && row[colNumero] ? String(row[colNumero]).trim() : null,
                vendedor: finalVendedor,
                cupo: colCupo ? parseNumeric(row[colCupo]) || 0 : 0,
                cupo_utilizado: colCupoUtilizado ? parseNumeric(row[colCupoUtilizado]) || 0 : 0,
                circuito: colCircuito && row[colCircuito] ? String(row[colCircuito]).trim().toUpperCase() : null
            });
        }

        let insertedCount = 0;
        // Deduplicate toImport by RUT (keep last) to avoid "ON CONFLICT ... cannot affect row a second time"
        const uniqueClients = new Map();
        toImport.forEach(item => {
            if (item.rut) {
                uniqueClients.set(norm(item.rut), item);
            }
        });
        const cleanToImport = Array.from(uniqueClients.values());

        console.log(`🧹 Deduplicación: ${toImport.length} -> ${cleanToImport.length} registros únicos.`);

        let importedCount = 0;
        let updatedCount = 0;

        if (cleanToImport.length > 0) {
            console.log(`🔄 [Job ${jobId}] Iniciando UPSERT masivo de ${cleanToImport.length} registros...`);

            // Batch size for processing
            const BATCH_SIZE = 500;

            for (let batchStart = 0; batchStart < cleanToImport.length; batchStart += BATCH_SIZE) {
                const batchEnd = Math.min(batchStart + BATCH_SIZE, cleanToImport.length);
                const batch = cleanToImport.slice(batchStart, batchEnd);
                const values = [];
                const params = [];
                let paramIndex = 1;

                batch.forEach(item => {
                    params.push(
                        item.rut, item.nombre, item.email, item.telefono, item.sucursal,
                        item.categoria, item.subcategoria, item.comuna, item.ciudad, item.direccion,
                        item.numero, item.vendedor, item.cupo, item.cupo_utilizado, item.circuito
                    );

                    const rowPlaceholders = Array.from({ length: 15 }, () => `$${paramIndex++}`).join(', ');
                    values.push(`(${rowPlaceholders})`);
                });

                const query = `
                    INSERT INTO cliente (
                        rut, nombre, email, telefono_principal, sucursal,
                        categoria, subcategoria, comuna, ciudad, direccion,
                        numero, nombre_vendedor, cupo, cupo_utilizado, circuito
                    ) VALUES ${values.join(', ')}
                    ON CONFLICT (rut) DO UPDATE
                    SET nombre = EXCLUDED.nombre,
                        email = EXCLUDED.email,
                        telefono_principal = EXCLUDED.telefono_principal,
                        sucursal = EXCLUDED.sucursal,
                        categoria = EXCLUDED.categoria,
                        subcategoria = EXCLUDED.subcategoria,
                        comuna = EXCLUDED.comuna,
                        ciudad = EXCLUDED.ciudad,
                        direccion = EXCLUDED.direccion,
                        numero = EXCLUDED.numero,
                        nombre_vendedor = EXCLUDED.nombre_vendedor,
                        cupo = EXCLUDED.cupo,
                        cupo_utilizado = EXCLUDED.cupo_utilizado,
                        circuito = COALESCE(EXCLUDED.circuito, cliente.circuito)
                    RETURNING (xmax = 0) AS inserted
                `;

                try {
                    const res = await client.query(query, params);
                    res.rows.forEach(row => {
                        if (row.inserted) insertedCount++; else updatedCount++;
                    });
                    importedCount += res.rowCount;
                    console.log(`📊 [Job ${jobId}] Progreso: ${importedCount}/${cleanToImport.length}`);
                } catch (err) {
                    console.error(`❌ Error en batch ${batchStart}:`, err.message);
                    // Fallback: If batch fails, try one by one to isolate error (or just log generic error for batch)
                    // For now, logging general error and continuing is safer to avoid crashing everything, 
                    // but ideally, we should retry row-by-row if critical.
                    // Adding generic observation for the batch range
                    observations.push({
                        fila: `${batchStart + 2} - ${batchStart + batch.length + 1}`,
                        rut: 'BATCH ERROR',
                        campo: 'DB',
                        detalle: `Error en lote: ${err.message}`
                    });
                }
            }
        }

        let observationsReportPath = null;
        if (observations.length > 0) {
            const wbObs = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wbObs, XLSX.utils.json_to_sheet(observations), 'Observaciones');
            const reportDir = 'uploads/reports';
            if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
            observationsReportPath = path.join(reportDir, `observaciones_clientes_${jobId}.xlsx`);
            XLSX.writeFile(wbObs, observationsReportPath);
        }

        const result = {
            success: true, totalRows: data.length, toImport: toImport.length,
            inserted: insertedCount, updated: updatedCount, errors: observations.length,
            skippedInvalid,
            observationsReportUrl: observationsReportPath ? `/api/import/download-report/${path.basename(observationsReportPath)}` : null,
            dataImported: (insertedCount + updatedCount) > 0
        };

        await updateJobStatus(jobId, 'completed', {
            totalRows: data.length, importedRows: insertedCount + updatedCount,
            resultData: result, observationsFilename: observationsReportPath ? path.basename(observationsReportPath) : null
        });

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.log(`✅ [Job ${jobId}] Clientes finalizado`);
        return result;

    } catch (error) {
        console.error(`❌ [Job ${jobId}] Falló clientes:`, error);
        await updateJobStatus(jobId, 'failed', { errorMessage: error.message });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { processClientesFileAsync };
