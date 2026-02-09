const xlsx = require('xlsx');
const path = require('path');
const pool = require('../src/db');

const FILE_PATH = path.join(__dirname, '../bulk_data/VERIFICADOR VENTA 01-2026.xlsx');

async function backfillMaster() {
    try {
        console.log('🚀 Iniciando Backfill de Maestro desde BASE VENTAS...');

        // 1. Get existing SKUs in Master
        const resMaster = await pool.query('SELECT sku FROM clasificacion_productos');
        const masterSkus = new Set(resMaster.rows.map(r => r.sku));
        console.log(`📚 SKUs actuales en Maestro: ${masterSkus.size}`);

        // 2. Read Sales Excel
        const workbook = xlsx.readFile(FILE_PATH);
        const sheet = workbook.Sheets['BASE VENTAS'];
        const rows = xlsx.utils.sheet_to_json(sheet);

        const newProducts = new Map(); // SKU -> {desc, fam, sub, marca, litros}

        const cleanStr = (s) => s ? s.toString().trim()
            .replace(/√°/g, 'á').replace(/√©/g, 'é').replace(/√≠/g, 'í')
            .replace(/√≥/g, 'ó').replace(/√∫/g, 'ú').replace(/√±/g, 'ñ')
            .replace(/√•/g, 'a').replace(/√°/g, 'á') : '';

        for (const row of rows) {
            const sku = row['SKU'];
            if (!sku) continue;

            if (!masterSkus.has(sku) && !newProducts.has(sku)) {
                // Found a missing SKU!
                const desc = row['Descripci√≥n'] || row['Descripcion'] || '';
                const marca = row['Marca'] || 'GENERICO';
                const familia = cleanStr(row['L√≠nea'] || row['Linea'] || 'SIN CLASIFICAR');
                const subfamilia = cleanStr(row['Sublinea'] || 'SIN CLASIFICAR');
                let litros = parseFloat(row['LITROS'] || 0);

                // Check simple unit heuristic if Litros is 0? 
                // No, trust Excel. If 0, it's 0. (For Reencauche/Tire it is 0/null).
                // Wait, in Sales, 'LITROS' might be Total Litros for the row (Qty * UnitLiters).
                // Master needs UnitLiters.
                // Assuming Qty is available?
                const qty = parseFloat(row['Cantidad'] || 1);
                if (litros > 0 && qty > 0) {
                    // Normalize to per-unit
                    // BUT, verify logic. Usually Master has 'Litros por unidad'.
                    // If Sales sheet has 'LITROS', likely it's Total.
                    // Let's assume Unit Liters = RowLitros / Qty.
                    litros = litros / qty;
                }

                newProducts.set(sku, {
                    sku,
                    descripcion: desc,
                    marca: cleanStr(marca),
                    familia,
                    subfamilia,
                    litros
                });
            }
        }

        console.log(`🆕 Nuevos productos a insertar: ${newProducts.size}`);

        if (newProducts.size > 0) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const batch = Array.from(newProducts.values());
                const BATCH_SIZE = 500;

                for (let i = 0; i < batch.length; i += BATCH_SIZE) {
                    const chunk = batch.slice(i, i + BATCH_SIZE);

                    const valuesList = [];
                    const params = [];
                    chunk.forEach((p, idx) => {
                        const base = idx * 7;
                        valuesList.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`);
                        params.push(p.sku, p.descripcion, p.marca, p.familia, p.subfamilia, p.litros, 'BACKFILL_VENTAS');
                    });

                    const query = `
                        INSERT INTO clasificacion_productos (sku, descripcion, marca, familia, subfamilia, litros, origen)
                        VALUES ${valuesList.join(', ')}
                        ON CONFLICT (sku) DO NOTHING
                    `;

                    await client.query(query, params);
                }

                await client.query('COMMIT');
                console.log('✅ Backfill completado.');
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

backfillMaster();
