const XLSX = require('xlsx');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../bulk_data/SALDOCREDITO_19-01-2026.xlsx');

const workbook = XLSX.readFile(FILE_PATH);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

console.log('--- HEADERS ---');
console.log(data[0]);

console.log('--- SCANNING FOR VENDOR DATA ---');
const headerRow = data[0];
const vendorColIndex = headerRow.findIndex(h => /vendedor_nombre/i.test(h));
console.log(`Vendor Column Index: ${vendorColIndex} (Header: ${headerRow[vendorColIndex]})`);

let count = 0;
let examples = [];
for (let i = 1; i < data.length; i++) {
    const val = data[i][vendorColIndex];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
        count++;
        if (examples.length < 5) examples.push(val);
    }
}
console.log(`Rows with Vendor Data: ${count} / ${data.length - 1}`);
console.log('Examples:', examples);
