const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const baseDir = '/Users/mariolabbe/Desktop/TRABAJO IA/CRM2/backend/bulk_data/IMPORTACION 08-02-2026';
const files = [
    'ABONO AL 08-02-2026.xlsx',
    'CLIENTES AL 08-02-2026.xlsx',
    'SALDO CREDITO .xlsx',
    'VENTA AL 08-02-2026.xlsx'
];

files.forEach(file => {
    const filePath = path.join(baseDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`❌ FILE NOT FOUND: ${file}`);
        return;
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to array of arrays
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, limit: 10 });

        // Find header row: first row with reasonable number of string columns
        let headerRow = null;
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row && row.length > 2 && row.some(c => typeof c === 'string')) {
                headerRow = row;
                console.log(`\n📂 FILE: ${file} (Headers detected at row ${i + 1})`);
                console.log(JSON.stringify(headerRow));
                break;
            }
        }

        if (!headerRow) console.log(`⚠️  Could not detect headers for ${file}`);

    } catch (err) {
        console.error(`❌ Error reading ${file}: ${err.message}`);
    }
});
