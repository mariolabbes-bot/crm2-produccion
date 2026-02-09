const xlsx = require('xlsx');
const path = require('path');
const pool = require('../src/db');

async function repairSkus(fileName, year) {
    try {
        const FILE_PATH = path.join(__dirname, `../bulk_data/${fileName}`);
        const START_DATE = `${year}-01-01`;
        const END_DATE = `${year}-12-31`;

        console.log(`🚀 Reparando SKUs para Año ${year} usando ${fileName}...`);

        // 1. Cargar Ventas DB del Año
        console.log(`📥 Cargando ventas BD entre ${START_DATE} y ${END_DATE}...`);
        const res = await pool.query(`SELECT id, folio, descripcion, sku FROM venta WHERE fecha_emision BETWEEN $1 AND $2`, [START_DATE, END_DATE]);
        const dbSales = res.rows;
        console.log(`   -> Encontradas ${dbSales.length} ventas en BD.`);

        if (dbSales.length === 0) {
            console.log('⚠️ No hay ventas en BD para este periodo. Saltando.');
            return;
        }

        // 2. Cargar Excel
        console.log(`📂 Leyendo Excel...`);
        const workbook = xlsx.readFile(FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log(`   -> Encontradas ${rows.length} filas en Excel.`);

        // 3. Crear Mapa de BD (Key: Folio|DescripcionNormalizada)
        const dbMap = new Map();
        const clean = (s) => s ? s.toString().toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

        dbSales.forEach(row => {
            const key = `${row.folio}|${clean(row.descripcion)}`;
            // En caso de duplicados de folio+desc, esto sobreescribirá, pero asumimos unicidad por ahora (revisado en 2026)
            dbMap.set(key, row);
        });

        // 4. Identificar Updates
        const updates = [];
        let matches = 0;

        for (const row of rows) {
            const folio = row['Folio'];
            const rawDesc = row['Descripci√≥n'] || row['Descripción'] || row['Descripcion'];
            const sku = row['SKU'];

            if (!folio || !sku) continue;

            const key = `${folio}|${clean(rawDesc)}`;
            const dbRow = dbMap.get(key);

            if (dbRow) {
                matches++;
                // Solo actualizar si estaba nulo o diferente
                if (!dbRow.sku || dbRow.sku !== sku) {
                    updates.push([dbRow.id, sku]);
                }
            }
        }

        console.log(`✅ Match Rate: ${matches}/${rows.length}`);
        console.log(`📝 Updates necesarios: ${updates.length}`);

        // 5. Aplicar Updates
        if (updates.length > 0) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const BATCH_SIZE = 1000;
                for (let i = 0; i < updates.length; i += BATCH_SIZE) {
                    const batch = updates.slice(i, i + BATCH_SIZE);

                    const valuesList = [];
                    const params = [];
                    batch.forEach((u, idx) => {
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
                    process.stdout.write(`.`);
                }
                console.log('\n');
                await client.query('COMMIT');
                console.log(`✅ ${year}: Reparación completada con éxito.`);

            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } else {
            console.log(`✨ ${year}: Todo estaba actualizado.`);
        }

    } catch (e) {
        console.error(`❌ Error en ${year}:`, e);
    }
}

async function run() {
    await repairSkus('VENTAS 2025.xlsx', 2025);
    await repairSkus('VENTAS 2024.xlsx', 2024);
    pool.end();
}

run();
