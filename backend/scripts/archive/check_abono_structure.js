const XLSX = require('xlsx');

const excelPath = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';

console.log('📂 Leyendo hoja de ABONOS 2024-2025...\n');

try {
  const workbook = XLSX.readFile(excelPath, { cellDates: true });
  const sheetName = 'ABONOS 2024-2025';
  const worksheet = workbook.Sheets[sheetName];
  
  // Verificar el contenido raw de las primeras celdas de fecha
  console.log('📋 Analizando celdas de fecha (columna C):\n');
  
  for (let row = 2; row <= 5; row++) {
    const cellAddress = `C${row}`; // Columna C = Fecha
    const cell = worksheet[cellAddress];
    
    if (cell) {
      console.log(`Celda ${cellAddress}:`);
      console.log(`  Valor raw: ${cell.v}`);
      console.log(`  Tipo: ${cell.t}`);
      console.log(`  Formato: ${cell.z || 'sin formato'}`);
      
      if (cell.t === 'd' || cell.t === 'n') {
        if (cell.v instanceof Date) {
          console.log(`  Fecha parseada: ${cell.v.toISOString()}`);
        } else if (typeof cell.v === 'number') {
          // Convertir número de Excel a fecha
          const jsDate = new Date((cell.v - 25569) * 86400 * 1000);
          console.log(`  Fecha desde número: ${jsDate.toISOString()}`);
        }
      }
      console.log('');
    }
  }
  
  // Intentar leer con cellDates
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: true, dateNF: 'yyyy-mm-dd' });
  
  console.log('\n📝 Primer registro completo:');
  console.log(JSON.stringify(data[0], null, 2));
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
