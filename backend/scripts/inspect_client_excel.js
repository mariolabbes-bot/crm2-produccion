const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../bulk_data/CLIENTES 15-01-26.xlsx');

try {
    console.log(`Reading file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read first 10 rows
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });

    console.log('\n--- HEADERS (Row 0) ---');
    console.log(JSON.stringify(data[0], null, 2));

    console.log('\n--- SAMPLE DATA (Rows 1-5) ---');
    for (let i = 1; i < Math.min(data.length, 6); i++) {
        console.log(`Row ${i}:`, JSON.stringify(data[i], null, 2));
    }

} catch (err) {
    console.error("Error reading file:", err.message);
}
