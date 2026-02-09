const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const FILE_PATH = path.join(__dirname, '../bulk_data/VERIFICADOR VENTA 01-2026.xlsx');

if (!fs.existsSync(FILE_PATH)) {
    console.error(`❌ Archivo no encontrado en: ${FILE_PATH}`);
    process.exit(1);
}

const workbook = xlsx.readFile(FILE_PATH);

console.log('📂 Sheets found:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];

    // Obtener headers de la fila 1
    const range = xlsx.utils.decode_range(worksheet['!ref']);
    const headers = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: C })];
        headers.push(cell ? cell.v : `UNKNOWN_${C}`);
    }
    console.log('Headers:', headers);

    // Muestra la primera fila de datos (fila 2)
    if (range.e.r >= 1) {
        const firstRow = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = worksheet[xlsx.utils.encode_cell({ r: 1, c: C })];
            firstRow.push(cell ? cell.v : null);
        }
        console.log('Sample Row 1:', firstRow);
    }
});
