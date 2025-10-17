const XLSX = require('xlsx');
const pool = require('../src/db');

async function updateLitros() {
  try {
    console.log('📂 Leyendo tabla de litros...');
    const workbook = XLSX.readFile('/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx');
    const worksheet = workbook.Sheets['LITROS POR UNIDAD DE VENTA'];
    const litrosData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Total de registros con litros: ${litrosData.length}`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const row of litrosData) {
      const descripcion = row.DESCRIPCION?.trim();
      const litros = row.LITROS;
      
      if (!descripcion || !litros) continue;
      
      // Buscar producto por descripción exacta
      const result = await pool.query(
        'UPDATE products SET litros = $1 WHERE UPPER(articulo) = UPPER($2) RETURNING id',
        [litros, descripcion]
      );
      
      if (result.rows.length > 0) {
        updatedCount++;
        console.log(`  ✅ ${descripcion.substring(0, 50)}... → ${litros}L`);
      } else {
        notFoundCount++;
        console.log(`  ⚠️  No encontrado: ${descripcion.substring(0, 50)}...`);
      }
    }
    
    console.log(`\n✅ Actualización completada:`);
    console.log(`   🔄 Productos actualizados: ${updatedCount}`);
    console.log(`   ⚠️  No encontrados: ${notFoundCount}`);
    
    const stats = await pool.query('SELECT COUNT(*) as total FROM products WHERE litros IS NOT NULL');
    console.log(`\n💧 Total de productos con litros: ${stats.rows[0].total}`);
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateLitros();
