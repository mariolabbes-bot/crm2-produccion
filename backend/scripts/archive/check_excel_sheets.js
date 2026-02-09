const XLSX = require('xlsx');
const path = require('path');

// Ruta al archivo Excel
const excelPath = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';

console.log('📂 Leyendo archivo Excel...\n');

try {
  const workbook = XLSX.readFile(excelPath);
  
  console.log('✅ Archivo leído exitosamente');
  console.log('\n📊 Hojas disponibles en el archivo:\n');
  
  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const rowCount = range.e.r - range.s.r + 1;
    
    console.log(`${index + 1}. "${sheetName}"`);
    console.log(`   └─ ${rowCount} filas\n`);
    
    // Si es una hoja pequeña, mostrar las primeras columnas
    if (rowCount < 20) {
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (data[0]) {
        console.log(`   Columnas: ${data[0].join(', ')}\n`);
      }
    }
  });
  
  console.log('\n💡 Busca la hoja que contenga datos de abonos/pagos');
  
} catch (error) {
  console.error('❌ Error al leer el archivo:', error.message);
}
