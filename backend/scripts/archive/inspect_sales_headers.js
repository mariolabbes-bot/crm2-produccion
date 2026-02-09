const XLSX = require('xlsx');
const path = require('path');
const file = path.join(__dirname, '../bulk_data/VENTAS 2024.xlsx');
const wb = XLSX.readFile(file);
const headers = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, range: 0 })[0];
console.log(JSON.stringify(headers, null, 2));
