
const pool = require('../../db');
const XLSX = require('xlsx');
const fs = require('fs');
const { updateJobStatus } = require('../jobManager');
const { norm } = require('./utils');

async function processProductosFileAsync(jobId, filePath, originalname) {
    const client = await pool.connect();
    try {
        console.log(`🔵 [Job ${jobId}] Procesando Productos: ${originalname}`);
        await updateJobStatus(jobId, 'processing');

        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

        if (data.length === 0) throw new Error('Archivo vacío');

        const headers = Object.keys(data[0] || {});
        const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;

        const colSku = findCol([/^SKU$/i, /^Codigo$/i, /^Código$/i]);
        const colDesc = findCol([/^Descripcion$/i, /^Descripción$/i, /^Nombre$/i]);
        const colMarca = findCol([/^Marca$/i, /^Brand$/i]);
        const colFamilia = findCol([/^Familia$/i, /^Family$/i, /^Categor[ií]a$/i]);
        const colSubfamilia = findCol([/^Subfamilia$/i, /^Sub-Familia$/i]);
        const colUnidad = findCol([/^Unidad.*medida$/i, /^Unidad$/i, /^U\.M\.$/i]);

        if (!colSku) throw new Error('Falta columna SKU');

        let inserted = 0;
        let updated = 0;

        await client.query('BEGIN');

        for (const row of data) {
            const sku = row[colSku] ? String(row[colSku]).trim() : null;
            if (!sku) continue;

            const descripcion = colDesc && row[colDesc] ? String(row[colDesc]).trim() : 'Sin Nombre';
            const marca = colMarca && row[colMarca] ? String(row[colMarca]).trim() : 'GENERICO';
            const familia = colFamilia && row[colFamilia] ? String(row[colFamilia]).trim() : 'SIN CLASIFICAR';
            const subfamilia = colSubfamilia && row[colSubfamilia] ? String(row[colSubfamilia]).trim() : 'SIN CLASIFICAR';
            const unidad = colUnidad && row[colUnidad] ? String(row[colUnidad]).trim() : null;

            // Upsert - Removed created_at
            const res = await client.query(`
                INSERT INTO producto (sku, descripcion, marca, familia, subfamilia, unidad_medida)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (sku) DO UPDATE SET
                    descripcion = EXCLUDED.descripcion,
                    marca = COALESCE(NULLIF(EXCLUDED.marca, 'GENERICO'), producto.marca),
                    familia = COALESCE(NULLIF(EXCLUDED.familia, 'SIN CLASIFICAR'), producto.familia),
                    subfamilia = COALESCE(NULLIF(EXCLUDED.subfamilia, 'SIN CLASIFICAR'), producto.subfamilia),
                    unidad_medida = COALESCE(EXCLUDED.unidad_medida, producto.unidad_medida)
                RETURNING (xmax = 0) AS inserted
            `, [sku, descripcion, marca, familia, subfamilia, unidad]);

            if (res.rows[0].inserted) inserted++;
            else updated++;
        }

        await client.query('COMMIT');

        console.log(`✅ [Job ${jobId}] Productos: ${inserted} insertados, ${updated} actualizados`);

        const result = { success: true, inserted, updated };
        await updateJobStatus(jobId, 'completed', { resultData: result });

        // Removed fs.unlinkSync because bulk_import handles the file move
        return result;

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ [Job ${jobId}] Error Productos:`, err);
        await updateJobStatus(jobId, 'failed', { errorMessage: err.message });
        // Removed fs.unlinkSync to allow retry
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { processProductosFileAsync };
