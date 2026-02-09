const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../bulk_data/VERIFICADOR VENTA 01-2026.xlsx');
const workbook = xlsx.readFile(FILE_PATH);
const sheet = workbook.Sheets['BASE VENTAS'];
const data = xlsx.utils.sheet_to_json(sheet);

const lineas = new Set();
const sublineas = new Set();

data.forEach(row => {
    const linea = row['L√≠nea'] || row['Linea'];
    const sublinea = row['Sublinea'] || row['Subl√≠nea']; // Adivinando posible encoding

    if (linea) lineas.add(linea);
    if (sublinea) sublineas.add(sublinea);
});

console.log('--- Unique Lineas ---');
console.log([...lineas]);
console.log('\n--- Unique Sublineas ---');
console.log([...sublineas]);
