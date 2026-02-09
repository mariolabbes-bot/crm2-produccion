const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../bulk_data/VENTAS 2025.xlsx');

const workbook = xlsx.readFile(FILE_PATH);
const sheetName = workbook.SheetNames[0]; // Assume first sheet
console.log(`Sheet Name: ${sheetName}`);

const sheet = workbook.Sheets[sheetName];
const range = xlsx.utils.decode_range(sheet['!ref']);

// Headers
const headers = [];
for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = sheet[xlsx.utils.encode_cell({ r: 0, c: C })];
    headers.push(cell ? cell.v : `UKN_${C}`);
}
console.log('Headers:', headers);

// Sample Row (row 1)
const row1 = [];
for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = sheet[xlsx.utils.encode_cell({ r: 1, c: C })];
    row1.push(cell ? cell.v : null);
}
console.log('Row 1:', row1);
