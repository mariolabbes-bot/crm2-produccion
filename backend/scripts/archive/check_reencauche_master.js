const pool = require('../src/db');
const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../bulk_data/VERIFICADOR VENTA 01-2026.xlsx');

async function checkReencaucheMaster() {
    try {
        const workbook = xlsx.readFile(FILE_PATH);
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets['BASE VENTAS']);

        // Find distinct SKUs for Linea=Reencauche in Excel
        const reencaucheSkus = new Set();
        rows.forEach(r => {
            const linea = r['L√≠nea'] || r['Linea'];
            if (linea && (linea.includes('Reencauche') || linea.includes('Reformados'))) {
                reencaucheSkus.add(r['SKU']);
            }
        });

        console.log(`Unique Reencauche SKUs in Excel: ${reencaucheSkus.size}`);

        // Check classification for these SKUs in DB
        const skusArray = [...reencaucheSkus];
        if (skusArray.length === 0) return;

        // Query DB
        const res = await pool.query(`
            SELECT sku, familia, subfamilia 
            FROM clasificacion_productos 
            WHERE sku = ANY($1)
        `, [skusArray]);

        console.log(`Found ${res.rowCount} matches in Master.`);

        const counts = {};
        res.rows.forEach(r => {
            const key = `${r.familia}|${r.subfamilia}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        console.table(counts);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkReencaucheMaster();
