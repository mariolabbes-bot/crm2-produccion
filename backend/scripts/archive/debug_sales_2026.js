const XLSX = require('xlsx');
const path = require('path');

const FILE = path.join(__dirname, '../bulk_data/VENTAS_19-01-2026.xlsx');

console.log(`\n--- Inspecting: VENTAS_19-01-2026.xlsx ---`);
try {
    const wb = XLSX.readFile(FILE);
    const sn = wb.SheetNames[0];
    const ws = wb.Sheets[sn];

    // Dump first 5 rows (raw)
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });
    console.log('First 5 rows (Array of Arrays):');
    console.table(data.slice(0, 5));

} catch (e) {
    console.error(`Error reading file:`, e.message);
}
