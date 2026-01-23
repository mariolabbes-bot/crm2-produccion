const XLSX = require('xlsx');
const path = require('path');

const FILE = path.join(__dirname, '../bulk_data/IMPORTACION 21-01-2026/VENTAS.xlsx');
const workbook = XLSX.readFile(FILE);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

// Buscar una venta de Shell (Lubricante)
const shellRow = data.find(r => JSON.stringify(r).toUpperCase().includes('SHELL'));

console.log('--- INSPECCIÓN ROW SHELL ---');
console.log(shellRow);
console.log('Keys:', Object.keys(shellRow));
