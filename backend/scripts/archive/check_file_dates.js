const XLSX = require('xlsx');
const path = require('path');

const FILES = [
    'VENTAS 2025.xlsx',
    'ABONO 2025.xlsx'
];
const BULK_DIR = path.join(__dirname, '../bulk_data');

FILES.forEach(fileName => {
    try {
        const filePath = path.join(BULK_DIR, fileName);
        console.log(`\nScanning ${fileName}...`);
        const wb = XLSX.readFile(filePath);
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        let minDate = '9999-99-99';
        let maxDate = '0000-00-00';
        let count2026 = 0;

        data.forEach(row => {
            // Try to find a date column
            const dateVal = row['Fecha'] || row['fecha'] || row['FECHA'];
            let dateStr = '';
            if (typeof dateVal === 'number') {
                // Excel date
                dateStr = new Date(Math.round((dateVal - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
            } else if (typeof dateVal === 'string') {
                dateStr = dateVal; // Assume format is okay or skip
            }

            if (dateStr < minDate) minDate = dateStr;
            if (dateStr > maxDate) maxDate = dateStr;
            if (dateStr.startsWith('2026')) count2026++;
        });

        console.log(`Range: ${minDate} to ${maxDate}`);
        console.log(`Rows in 2026: ${count2026}`);

    } catch (e) {
        console.error(`Error scanning ${fileName}:`, e.message);
    }
});
