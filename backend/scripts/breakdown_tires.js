const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../bulk_data/VERIFICADOR VENTA 01-2026.xlsx');
const workbook = xlsx.readFile(FILE_PATH);
const sheet = workbook.Sheets['BASE VENTAS'];
const data = xlsx.utils.sheet_to_json(sheet);

const sublineaCounts = {};

data.forEach(row => {
    const linea = row['L√≠nea'] || row['Linea'];
    const sublinea = row['Sublinea'];
    const cantidad = parseFloat(row['Cantidad'] || 0);

    if (!linea) return;

    if (linea.includes('Neum') || linea.includes('neum')) {
        if (!sublineaCounts[sublinea]) sublineaCounts[sublinea] = 0;
        sublineaCounts[sublinea] += cantidad;
    }
});

console.log('--- Breakdown of Neumáticos by Sublinea ---');
for (const [sub, count] of Object.entries(sublineaCounts)) {
    console.log(`${sub}: ${count}`);
}
