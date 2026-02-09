
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
    'ABONOS_19-01-2026.xlsx',
    'VENTAS_19-01-2026.xlsx',
    'CLIENTES_19-01-2026.xlsx',
    'SALDOCREDITO_19-01-2026.xlsx'
];

const baseDir = path.join(__dirname, '../bulk_data');

function inspect() {
    console.log('--- INSPECTING BULK FILES (19-01-2026) ---\n');

    files.forEach(file => {
        const fullPath = path.join(baseDir, file);
        if (!fs.existsSync(fullPath)) {
            console.log(`[MISSING] ${file}`);
            return;
        }

        console.log(`FILE: ${file}`);
        try {
            const workbook = XLSX.readFile(fullPath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (data.length > 0) {
                console.log('HEADERS:', data[0]);
                console.log('ROW 1:', data[1]);
                if (data.length > 2) console.log('ROW 2:', data[2]);
            } else {
                console.log('EMPTY SHEET');
            }
        } catch (e) {
            console.log('ERROR READING:', e.message);
        }
        console.log('-'.repeat(40) + '\n');
    });
}

inspect();
