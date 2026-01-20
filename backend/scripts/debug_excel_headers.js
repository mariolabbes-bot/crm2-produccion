const XLSX = require('xlsx');
const path = require('path');

const FILES = [
    '../bulk_data/VENTAS_19-01-2026.xlsx',
    '../bulk_data/ABONOS_19-01-2026.xlsx'
];

FILES.forEach(f => {
    const p = path.join(__dirname, f);
    console.log(`\n--- Inspecting: ${f} ---`);
    try {
        const wb = XLSX.readFile(p);
        const sn = wb.SheetNames[0];
        console.log(`Sheet Name: ${sn}`);
        const ws = wb.Sheets[sn];

        // Peek at range
        console.log(`Range: ${ws['!ref']}`);

        // Dump first 5 rows (raw)
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });
        console.log('First 5 rows (Array of Arrays):');
        console.table(data.slice(0, 5));

    } catch (e) {
        console.error(`Error reading ${f}:`, e.message);
    }
});
