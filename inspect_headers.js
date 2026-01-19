
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'backend/bulk_data/VENTAS 2024.xlsx');
try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length > 0) {
        console.log('--- HEADERS ROW 1 ---');
        console.log(JSON.stringify(data[0]));
        if (data.length > 1) {
            console.log('--- HEADERS ROW 2 (Possible metadata skip) ---');
            console.log(JSON.stringify(data[1]));
        }
    } else {
        console.log('Empty JSON');
    }
} catch (e) {
    console.error(e);
}
