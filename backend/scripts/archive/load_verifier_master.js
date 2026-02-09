const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require('../src/db');
// const format = require('pg-format'); REMOVED
// Try manual construction to avoid dependency issues if pg-format isn't there.

const FILE_PATH = path.join(__dirname, '../bulk_data/VERIFICADOR VENTA 01-2026.xlsx');

async function loadVerifierMaster() {
    try {
        console.log('🚀 Iniciando carga MASIVA de Maestro desde Verificador...');

        if (!fs.existsSync(FILE_PATH)) throw new Error(`Archivo no encontrado: ${FILE_PATH}`);
        const workbook = xlsx.readFile(FILE_PATH);
        const sheet = workbook.Sheets['base producto'];
        if (!sheet) throw new Error(`Hoja 'base producto' no encontrada.`);
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        const rows = data.slice(1);

        console.log(`📊 Total filas: ${rows.length}`);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            console.log('🧹 Truncando tabla...');
            await client.query('TRUNCATE TABLE clasificacion_productos');

            const BATCH_SIZE = 500;
            let batch = [];
            let totalInserted = 0;

            const cleanStr = (s) => s ? s.toString().trim()
                .replace(/√°/g, 'á').replace(/√©/g, 'é').replace(/√≠/g, 'í')
                .replace(/√≥/g, 'ó').replace(/√∫/g, 'ú').replace(/√±/g, 'ñ')
                .replace(/√•/g, 'a').replace(/√°/g, 'á') : '';

            for (const row of rows) {
                const sku = row[0] ? row[0].toString().trim() : null;
                if (!sku) continue;

                // 0: SKU, 1: Desc, 2: Marca, 3: Linea, 4: Sublinea, 5: Litros
                // Note: Ensure handle undefined
                const r = [
                    sku,
                    row[1] ? row[1].toString().trim() : '',                 // descripcion
                    row[2] ? row[2].toString().trim() : 'GENERICO',         // marca
                    cleanStr(row[3] || 'SIN CLASIFICAR'),                   // familia
                    cleanStr(row[4] || 'SIN CLASIFICAR'),                   // subfamilia
                    row[5] ? parseFloat(row[5]) : 0,                        // litros
                    'VERIFICADOR'
                ];

                batch.push(r);

                if (batch.length >= BATCH_SIZE) {
                    await insertBatch(client, batch);
                    totalInserted += batch.length;
                    console.log(`... Insertados ${totalInserted}`);
                    batch = [];
                }
            }

            if (batch.length > 0) {
                await insertBatch(client, batch);
                totalInserted += batch.length;
            }

            await client.query('COMMIT');
            console.log(`✅ Carga completada. Total: ${totalInserted}`);

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error fatal:', error);
    } finally {
        pool.end();
    }
}

async function insertBatch(client, rows) {
    // Construct query: VALUES ($1, $2, ...), ($8, $9, ...)
    // 7 params per row
    const params = [];
    const chunks = [];

    rows.forEach((row, i) => {
        const offset = i * 7;
        chunks.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
        params.push(...row);
    });

    const query = `
        INSERT INTO clasificacion_productos 
        (sku, descripcion, marca, familia, subfamilia, litros, origen)
        VALUES ${chunks.join(', \n')}
    `;

    await client.query(query, params);
}

loadVerifierMaster();
