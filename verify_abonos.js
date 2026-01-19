
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });
const pool = require('./backend/src/db');

async function verifyCounts() {
    const files = [
        'ABONO 2024.xlsx',
        'ABONO 2025.xlsx'
    ];

    let totalExcelRows = 0;
    console.log('--- EXCEL COUNTS ---');

    for (const f of files) {
        try {
            const p = path.join(__dirname, 'backend/bulk_data', f);
            const wb = XLSX.readFile(p);
            const sheet = wb.Sheets[wb.SheetNames[0]];
            // Count rows manually to be sure, or use range
            const data = XLSX.utils.sheet_to_json(sheet);
            console.log(`${f}: ${data.length} rows`);
            totalExcelRows += data.length;
        } catch (e) {
            console.log(`${f}: Error reading or not found - ${e.message}`);
        }
    }
    console.log(`TOTAL EXCEL ROWS: ${totalExcelRows}`);

    console.log('\n--- DB COUNT (abono) ---');
    try {
        const res = await pool.query('SELECT count(*) FROM abono');
        console.log(`DB Total: ${res.rows[0].count}`);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

verifyCounts();
