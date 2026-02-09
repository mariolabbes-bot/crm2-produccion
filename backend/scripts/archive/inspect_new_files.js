
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
    'ABONOS_19-01-2026.xlsx',
    'CLIENTES_19-01-2026.xlsx',
    'SALDOCREDITO_19-01-2026.xlsx',
    'VENTAS_19-01-2026.xlsx'
];

const bulkDir = path.join(__dirname, '../bulk_data');

console.log('--- INSPECTING HEADERS FOR 19-01-2026 FILES ---');

files.forEach(file => {
    const filePath = path.join(bulkDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`[MISSING] ${file}`);
        return;
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
        console.log(`\n[FILE] ${file}`);
        console.log(`[HEADERS] ${JSON.stringify(headers)}`);

        // Check for Vendor-like columns
        const vendorCols = headers.filter(h =>
            String(h).toLowerCase().includes('vendedor') ||
            String(h).toLowerCase().includes('vend')
        );
        console.log(`[VENDOR COLS] ${JSON.stringify(vendorCols)}`);

    } catch (err) {
        console.error(`[ERROR] reading ${file}:`, err.message);
    }
});
