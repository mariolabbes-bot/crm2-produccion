const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
console.log('📂 Leyendo Headers de:', filePath);

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

if (data.length > 0) {
    console.log('Headers (Fila 0):', data[0]);
    // A veces los headers están en la fila 1 o 2
    console.log('Fila 1:', data[1]);
}
