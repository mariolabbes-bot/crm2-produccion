const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
console.log('📂 Leyendo Archivo:', filePath);

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Debug: Print raw value of cell matching the header "Identificador abono"
// Need to find which column index it is.
const range = XLSX.utils.decode_range(sheet['!ref']);
let idColIndex = -1;
let folioColIndex = -1;

// Scan header row (assume 0)
for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: C })];
    if (!cell) continue;
    if (/Identificador.*abono/i.test(cell.v)) {
        console.log(`✅ Columna 'Identificador abono' encontrada en índice ${C} (${XLSX.utils.encode_col(C)})`);
        idColIndex = C;
    }
    if (/Folio/i.test(cell.v)) {
        folioColIndex = C;
    }
}

if (idColIndex === -1) {
    console.error('❌ No se encontró la columna Identificador abono en los headers.');
}

// Now scan for Folio 223359
console.log('🔍 Buscando filas con Folio 223359...');
const data = XLSX.utils.sheet_to_json(sheet, { raw: true }); // Same config as importer

const matches = data.filter(row => row['Folio'] == 223359 || row['Folio'] == '223359');
console.log(`Encontradas ${matches.length} filas.`);

matches.forEach((row, idx) => {
    console.log(`\nFila ${idx + 1}:`);
    console.log('Keys:', Object.keys(row));
    console.log('Identificador abono (Key Access):', row['Identificador abono']);

    // Check if maybe the key is slightly different
    const fuzzyKey = Object.keys(row).find(k => /Identificador.*abono/i.test(k));
    console.log('Fuzzy Key Found:', fuzzyKey);
    console.log('Value via Fuzzy Key:', row[fuzzyKey]);
});
