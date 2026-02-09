const XLSX = require('xlsx');
const path = require('path');

const FILE = path.join(__dirname, '../bulk_data/IMPORTACION 21-01-2026/VENTAS.xlsx');

const workbook = XLSX.readFile(FILE);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Headers
const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
console.log('--- HEADERS REALES ---');
console.log(headers);

// Sample row
const rows = XLSX.utils.sheet_to_json(sheet);
console.log('--- FILA MUESTRA ---');
console.log(rows[0]);
