const pool = require('../../db');
const XLSX = require('xlsx');
const { updateJobStatus } = require('../jobManager');

async function processStockFileAsync(jobId, filePath, originalname) {
    const client = await pool.connect();
    try {
        console.log(`🔵 [Job ${jobId}] Procesando Stock: ${originalname}`);
        await updateJobStatus(jobId, 'processing');

        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

        if (data.length === 0) throw new Error('Archivo vacío');

        const headers = Object.keys(data[0] || {});

        // Find SKU column
        const colSku = headers.find(h => /^ART[IÍ]CULO$/i.test(h) || /^SKU$/i.test(h) || /^C[OÓ]DIGO$/i.test(h));
        if (!colSku) throw new Error('Falta columna ARTICULO, SKU o CÓDIGO');

        // Identify branch columns (numeric or specific patterns like '001', '003', etc.)
        // Usually they are numbers like 001, 002, or "Sucursal 001"
        const branchColumns = headers.filter(h => /^\d{3}$/.test(String(h).trim()) || /^Sucursal/i.test(h));

        if (branchColumns.length === 0) {
            console.warn(`⚠️ [Job ${jobId}] No se detectaron columnas de sucursal obvias. Usaremos todas las numéricas.`);
        }

        let updated = 0;
        let notFound = 0;

        await client.query('BEGIN');

        for (const row of data) {
            const sku = row[colSku] ? String(row[colSku]).trim() : null;
            if (!sku) continue;

            const stockObj = {};

            // Build stock map for this product
            const colsToUse = branchColumns.length > 0 ? branchColumns : headers.filter(h => h !== colSku && !/[A-Za-z]/.test(h));

            for (const branchCol of colsToUse) {
                const stockVal = parseFloat(row[branchCol]);
                if (!isNaN(stockVal)) {
                    stockObj[branchCol] = stockVal;
                }
            }

            // Update database
            const res = await client.query(`
                UPDATE producto 
                SET stock_por_sucursal = $1
                WHERE sku = $2
                RETURNING sku;
            `, [stockObj, sku]);

            if (res.rowCount > 0) {
                updated++;
            } else {
                notFound++;
            }
        }

        await client.query('COMMIT');

        console.log(`✅ [Job ${jobId}] Stock: ${updated} productos actualizados, ${notFound} no encontrados`);

        const result = { success: true, updated, notFound };
        await updateJobStatus(jobId, 'completed', { resultData: result });

        return result;

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ [Job ${jobId}] Error Stock:`, err);
        await updateJobStatus(jobId, 'failed', { errorMessage: err.message });
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { processStockFileAsync };
