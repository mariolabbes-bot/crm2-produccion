const xlsx = require('xlsx');
const path = require('path');
const FILE_PATH = path.join(__dirname, '../bulk_data/VENTAS 2025.xlsx');
const workbook = xlsx.readFile(FILE_PATH);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

const data = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });

console.log('--- First 15 rows ---');
data.slice(0, 15).forEach((row, i) => {
    console.log(`[Row ${i}]`, JSON.stringify(row));
});
