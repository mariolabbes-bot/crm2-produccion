const pool = require('../../db');
const XLSX = require('xlsx');
const { updateJobStatus } = require('../jobManager');
const { resolveBranch, isKnownBranchOrAlias } = require('../sucursalAliasService');

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
        const branchColumns = headers.filter(h => isKnownBranchOrAlias(h) || /^\d{3}$/.test(String(h).trim()) || /^Sucursal/i.test(h));

        if (branchColumns.length === 0) {
            console.warn(`⚠️ [Job ${jobId}] No se detectaron columnas de sucursal obvias. Usaremos todas las numéricas.`);
        }

        let updated = 0;
        let notFound = 0;
        let processed = 0;
        const totalRows = data.length;

        console.log(`📊 [Job ${jobId}] Total filas en Excel de Stock a procesar secuencialmente: ${totalRows}`);

        await client.query('BEGIN');

        // SELF-HEALING: Crear la tabla si no existe
        await client.query(`
            CREATE TABLE IF NOT EXISTS stock (
                id SERIAL PRIMARY KEY,
                sku VARCHAR(150) NOT NULL,
                sucursal VARCHAR(150) NOT NULL,
                cantidad DECIMAL(12, 2) DEFAULT 0,
                ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(sku, sucursal)
            );
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_sku ON stock(sku);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_sucursal ON stock(sucursal);`);

        await client.query(`TRUNCATE TABLE stock RESTART IDENTITY;`);
        console.log(`🧹 [Job ${jobId}] Tabla 'stock' purgada (TRUNCATE) exitosamente para nueva importación.`);

        const entriesMap = new Map();
        for (const row of data) {
            const skuRaw = row[colSku];
            if (!skuRaw) continue;
            // Clean the SKU here to ensure consistency
            const sku = String(skuRaw).trim().toUpperCase();
            if (!sku) continue;

            const excludedCols = ['ARTICULO', 'ARTÍCULO', 'SKU', 'CODIGO', 'CÓDIGO', 'DESCRIPCION', 'DESCRIPCIÓN', 'FAMILIA', 'MARCA', 'SUBFAMILIA', 'TOTAL', 'GENERAL', 'STOCK TOTAL', 'TOTAL STOCK', 'CANTIDAD'];
            let colsToUse = headers.filter(h => {
                if (h === colSku) return false;
                const upper = String(h).trim().toUpperCase();
                if (excludedCols.includes(upper)) return false;
                if (/TOTAL/i.test(upper)) return false;
                
                // Bulletproof check for corrupted ARTICULO headers
                if (upper.includes('ART') && upper.includes('CULO')) return false;
                
                return true;
            });

            for (const branchCol of colsToUse) {
                const stockVal = parseFloat(row[branchCol]);
                if (!isNaN(stockVal)) {
                    const sucursal = resolveBranch(branchCol);
                    const key = `${sku}::::${sucursal}`;
                    if (entriesMap.has(key)) {
                        entriesMap.get(key).cantidad += stockVal;
                    } else {
                        entriesMap.set(key, { sku, sucursal, cantidad: stockVal });
                    }
                }
            }
        }

        const entries = Array.from(entriesMap.values());

        const BATCH_SIZE = 5000;

        console.log(`📊 [Job ${jobId}] Iniciando volcado bulk de ${entries.length} registros...`);

        for (let i = 0; i < entries.length; i += BATCH_SIZE) {
            const batch = entries.slice(i, i + BATCH_SIZE);
            const values = [];
            const params = [];
            let pIdx = 1;
            
            for (const entry of batch) {
                values.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, NOW())`);
                params.push(entry.sku, entry.sucursal, entry.cantidad);
            }
            
            const q = `
                INSERT INTO stock (sku, sucursal, cantidad, ultima_actualizacion)
                SELECT sku_in::VARCHAR, sucursal_in::VARCHAR, SUM(cantidad_in::NUMERIC), NOW()
                FROM (
                    VALUES ${values.join(', ')}
                ) AS val(sku_in, sucursal_in, cantidad_in)
                GROUP BY sku_in, sucursal_in
                ON CONFLICT (sku, sucursal) 
                DO UPDATE SET cantidad = EXCLUDED.cantidad, ultima_actualizacion = NOW()
            `;
            await client.query(q, params);
            
            updated += batch.length;
            console.log(`📊 [Job ${jobId}] Progreso Bulk Insert Stock: ${updated}/${entries.length}`);
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
