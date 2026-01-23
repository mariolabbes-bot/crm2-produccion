const XLSX = require('xlsx');
const path = require('path');

const FILE = path.join(__dirname, '../bulk_data/PROCESSED_PRODUCTOS.xlsx');
try {
    const workbook = XLSX.readFile(FILE);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    const rows = XLSX.utils.sheet_to_json(sheet).slice(0, 3);

    console.log('--- HEADERS ---');
    console.log(headers);
    console.log('\n--- DATA SAMPLE ---');
    console.log(rows);
} catch (e) {
    console.error('Error:', e.message);
}
