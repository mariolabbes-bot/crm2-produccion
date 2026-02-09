const xlsx = require('xlsx');
const path = require('path');
const pool = require('../src/db');

const FILE_PATH = path.join(__dirname, '../bulk_data/VERIFICADOR VENTA 01-2026.xlsx');

async function fixSkus() {
    try {
        console.log('🚀 Iniciando corrección de SKUs (BULK V2)...');

        const res = await pool.query(`SELECT id, folio, descripcion, sku FROM venta WHERE fecha_emision BETWEEN '2026-01-01' AND '2026-01-31'`);
        const dbSales = res.rows;

        const workbook = xlsx.readFile(FILE_PATH);
        const sheet = workbook.Sheets['BASE VENTAS'];
        const excelRows = xlsx.utils.sheet_to_json(sheet);

        const dbMap = new Map();
        const clean = (s) => s ? s.toString().toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

        dbSales.forEach(row => {
            const key = `${row.folio}|${clean(row.descripcion)}`;
            dbMap.set(key, row);
        });

        const updates = [];
        for (const row of excelRows) {
            const folio = row['Folio'];
            const rawDesc = row['Descripci√≥n'] || row['Descripción'] || row['Descripcion'];
            const sku = row['SKU'];

            if (!folio || !sku) continue;

            const key = `${folio}|${clean(rawDesc)}`;
            const dbRow = dbMap.get(key);

            if (dbRow) {
                if (!dbRow.sku || dbRow.sku !== sku) {
                    updates.push([dbRow.id, sku]);
                }
            }
        }

        console.log(`📝 Updates masivos pendientes: ${updates.length}`);

        if (updates.length > 0) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Construct ONE giant query
                // UPDATE venta AS v SET sku = c.sku FROM (VALUES (id, 'sku'), ...) AS c(id, sku) WHERE v.id = c.id

                // Chunk it just in case of query size limits (e.g. 1000)
                const BATCH_SIZE = 1000;
                for (let i = 0; i < updates.length; i += BATCH_SIZE) {
                    const batch = updates.slice(i, i + BATCH_SIZE);

                    const valuesList = [];
                    const params = [];
                    batch.forEach((u, idx) => {
                        // idx is offset in this batch
                        // params index starts at 1
                        const pIdx = idx * 2;
                        valuesList.push(`($${pIdx + 1}::int, $${pIdx + 2}::text)`);
                        params.push(u[0], u[1]);
                    });

                    const query = `
                        UPDATE venta AS v
                        SET sku = c.sku
                        FROM (VALUES ${valuesList.join(',')}) AS c(id, sku)
                        WHERE v.id = c.id
                    `;

                    await client.query(query, params);
                    console.log(`... Updated batch ${i} - ${i + batch.length}`);
                }

                await client.query('COMMIT');
                console.log('✅ Updates aplicados exitosamente.');

            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } else {
            console.log('Nada que actualizar.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

fixSkus();
