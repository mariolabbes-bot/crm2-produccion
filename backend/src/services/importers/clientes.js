const pool = require('../../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { updateJobStatus } = require('../jobManager');
const { norm } = require('./utils');

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

        if (!colRUT || !colNombre) {
            throw new Error('Faltan columnas requeridas: RUT, Nombre');
        }

        const toImport = [];
        const observations = [];
        let skippedInvalid = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const excelRow = i + 2;
            const rut = row[colRUT] ? String(row[colRUT]).trim() : null;
            const nombre = row[colNombre] ? String(row[colNombre]).trim() : null;

            if (!rut || !nombre) {
                skippedInvalid++;
                continue;
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
                vendedor: colVendedor && row[colVendedor] ? String(row[colVendedor]).trim() : null
            });
        }

        let insertedCount = 0;
        let updatedCount = 0;

        if (toImport.length > 0) {
            console.log(`🔄 [Job ${jobId}] Iniciando UPSERT ${toImport.length}...`);
            for (const item of toImport) {
                try {
                    const res = await client.query(
                        `INSERT INTO cliente (
              rut, nombre, email, telefono_principal, sucursal,
              categoria, subcategoria, comuna, ciudad, direccion,
              numero, nombre_vendedor
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
                nombre_vendedor = EXCLUDED.nombre_vendedor
            RETURNING (xmax = 0) AS inserted`,
                        [item.rut, item.nombre, item.email, item.telefono, item.sucursal, item.categoria, item.subcategoria, item.comuna, item.ciudad, item.direccion, item.numero, item.vendedor]
                    );
                    if (res.rows[0].inserted) insertedCount++; else updatedCount++;
                } catch (err) {
                    observations.push({ fila: 'N/A', rut: item.rut, campo: 'DB', detalle: err.message });
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
