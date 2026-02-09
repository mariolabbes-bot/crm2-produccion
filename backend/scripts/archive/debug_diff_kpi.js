const pool = require('../src/db');
const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../bulk_data/VERIFICADOR VENTA 01-2026.xlsx');

async function debugDiff() {
    try {
        console.log('--- Diagnóstico de Diferencias ---');

        // 1. Listar subfamilias que hacen match con '%TBR%'
        const resTBR = await pool.query("SELECT DISTINCT subfamilia FROM clasificacion_productos WHERE UPPER(subfamilia) LIKE '%TBR%'");
        console.log('Subfamilias capturadas por LIKE %TBR%:', resTBR.rows.map(r => r.subfamilia));

        // 2. Identificar registros de Reencauche en Excel que NO están cruzando en BD
        // Cargar Excel de nuevo
        const workbook = xlsx.readFile(FILE_PATH);
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets['BASE VENTAS']);

        // Cargar Map de DB (Folio|Desc -> SKU_actual_en_BD)
        const resDB = await pool.query("SELECT folio, descripcion, sku FROM venta WHERE fecha_emision BETWEEN '2026-01-01' AND '2026-01-31'");
        const dbMap = new Map();
        const clean = (s) => s ? s.toString().toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        resDB.rows.forEach(r => dbMap.set(`${r.folio}|${clean(r.descripcion)}`, r.sku));

        let reencaucheMiss = 0;
        let missingSkusSample = [];

        rows.forEach(row => {
            const linea = row['L√≠nea'] || row['Linea'];
            if (linea && (linea.includes('Reencauche') || linea.includes('Reformados'))) {
                const folio = row['Folio'];
                const desc = row['Descripci√≥n'] || row['Descripcion'];
                const key = `${folio}|${clean(desc)}`;
                const skuInDB = dbMap.get(key);

                // Check if SKU in DB exists in clasificacion_productos
                // Actually, I can't check that easily here without loading the whole master table.
                // But if skuInDB matches row['SKU'], we assume it's good.
                // If skuInDB is NULL or different, that's a miss.

                if (!skuInDB || skuInDB !== row['SKU']) {
                    reencaucheMiss++;
                    if (missingSkusSample.length < 5) missingSkusSample.push({
                        folio, desc, xlsSku: row['SKU'], dbSku: skuInDB
                    });
                }
            }
        });

        console.log(`\nReencauche Rows con SKU incorrecto/faltante en BD: ${reencaucheMiss}`);
        console.log('Sample Misses:', missingSkusSample);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debugDiff();
