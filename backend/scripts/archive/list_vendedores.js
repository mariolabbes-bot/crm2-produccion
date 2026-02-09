const XLSX = require('xlsx');

const EXCEL_PATH = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';

const workbook = XLSX.readFile(EXCEL_PATH);
const ventasSheet = workbook.Sheets['VENTAS 2024-2025'];
const ventasData = XLSX.utils.sheet_to_json(ventasSheet);

const vendedores = new Set();
ventasData.forEach(row => {
  if (row.Vendedor) {
    vendedores.add(row.Vendedor.toString().trim());
  }
});

console.log('Vendedores únicos en el Excel:');
console.log(Array.from(vendedores).sort());
console.log(`\nTotal: ${vendedores.size} vendedores`);
