const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../bulk_data/VERIFICADOR VENTA 01-2026.xlsx');
const workbook = xlsx.readFile(FILE_PATH);
const sheet = workbook.Sheets['BASE VENTAS'];
const data = xlsx.utils.sheet_to_json(sheet);

const set = new Set();
let duplicates = 0;

data.forEach(row => {
    const folio = row['Folio'];
    const desc = row['Descripci√≥n'] || row['Descripción'] || row['Descripcion'];
    // Note: Excel inspection showed 'Descripci√≥n'

    const key = `${folio}|${desc}`;
    if (set.has(key)) {
        duplicates++;
    } else {
        set.add(key);
    }
});

console.log(`Total Rows: ${data.length}`);
console.log(`Unique Keys (Folio+Desc): ${set.size}`);
console.log(`Potential collisions: ${duplicates}`);
