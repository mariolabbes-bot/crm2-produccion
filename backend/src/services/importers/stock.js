const pool = require('../../db');
const XLSX = require('xlsx');
const { updateJobStatus } = require('../jobManager');
const { resolveBranch } = require('../sucursalAliasService');

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
        const colSku = headers.find(h => /^ART.*CULO$/i.test(h) || /^SKU$/i.test(h) || /^C.*DIGO$/i.test(h));
        if (!colSku) throw new Error('Falta columna ARTICULO, SKU o CÓDIGO');

        // Identify branch columns (numeric or specific patterns like '001', '003', etc.)
        // Usually they are numbers like 001, 002, or "Sucursal 001"
        const branchColumns = headers.filter(h => /^\d{3}$/.test(String(h).trim()) || /^Sucursal/i.test(h));

        if (branchColumns.length === 0) {
            console.warn(`⚠️ [Job ${jobId}] No se detectaron columnas de sucursal obvias. Usaremos todas las numéricas.`);
        }

        let updated = 0;
        let notFound = 0;
        let processed = 0;
        const totalRows = data.length;

        console.log(`📊 [Job ${jobId}] Total filas en Excel de Stock a procesar secuencialmente: ${totalRows}`);

        await client.query('BEGIN');

        for (const row of data) {
            const sku = row[colSku] ? String(row[colSku]).trim() : null;
            if (!sku) {
                processed++;
                continue;
            }

            const stockObj = {};
            const colsToUse = branchColumns.length > 0 ? branchColumns : headers.filter(h => h !== colSku && !/[A-Za-z]/.test(h));

            for (const branchCol of colsToUse) {
                const stockVal = parseFloat(row[branchCol]);
                if (!isNaN(stockVal)) {
                    const realBranch = resolveBranch(branchCol);
                    stockObj[realBranch] = (stockObj[realBranch] || 0) + stockVal;
                }
            }

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

            processed++;
            if (processed % 500 === 0 || processed === totalRows) {
                console.log(`📊 [Job ${jobId}] Progreso Stock: ${processed}/${totalRows}`);
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
