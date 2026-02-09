const XLSX = require('xlsx');
const pool = require('../src/db');

async function importProducts(filePath) {
  console.log('📂 Leyendo archivo:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  
  // 1. Leer productos de la hoja "TABLA PRODUCTOS"
  const sheetName = 'TABLA PRODUCTOS';
  const worksheet = workbook.Sheets[sheetName];
  const productsData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Total de productos en Excel: ${productsData.length}`);
  
  // 2. Leer litros de la hoja "LITROS POR UNIDAD DE VENTA"
  const litrosSheet = 'LITROS POR UNIDAD DE VENTA';
  const litrosWorksheet = workbook.Sheets[litrosSheet];
  const litrosData = XLSX.utils.sheet_to_json(litrosWorksheet);
  
  console.log(`📊 Total de productos con litros: ${litrosData.length}`);
  
  // Crear mapa de litros por descripción
  const litrosByDescripcion = new Map();
  litrosData.forEach(row => {
    const desc = row.DESCRIPCION?.trim().toUpperCase();
    if (desc && row.LITROS) {
      litrosByDescripcion.set(desc, row.LITROS);
    }
  });
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('💾 Insertando productos...');
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    for (const row of productsData) {
      try {
        const sku = row.SKU?.toString().trim();
        if (!sku) {
          skippedCount++;
          continue;
        }
        
        const articulo = row['Artículo'] || row.Articulo || 'Sin descripción';
        const marca = row.Marca || null;
        const linea = row['Línea'] || row.Linea || null;
        const sublinea = row.Sublinea || null;
        
        // Buscar litros por descripción
        const articuloUpper = articulo.trim().toUpperCase();
        const litros = litrosByDescripcion.get(articuloUpper) || null;
        
        // Insertar o actualizar producto
        const result = await client.query(`
          INSERT INTO products (sku, articulo, marca, linea, sublinea, litros)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (sku) DO UPDATE SET
            articulo = EXCLUDED.articulo,
            marca = EXCLUDED.marca,
            linea = EXCLUDED.linea,
            sublinea = EXCLUDED.sublinea,
            litros = COALESCE(EXCLUDED.litros, products.litros)
          RETURNING (xmax = 0) AS inserted
        `, [sku, articulo, marca, linea, sublinea, litros]);
        
        if (result.rows[0].inserted) {
          insertedCount++;
        } else {
          updatedCount++;
        }
        
        if ((insertedCount + updatedCount) % 500 === 0) {
          console.log(`  ⏳ Procesados ${insertedCount + updatedCount} productos...`);
        }
        
      } catch (err) {
        errors.push({ sku: row.SKU, motivo: err.message });
        skippedCount++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Importación de productos completada:');
    console.log(`   📥 Productos nuevos insertados: ${insertedCount}`);
    console.log(`   🔄 Productos actualizados: ${updatedCount}`);
    console.log(`   ⏭️  Productos omitidos: ${skippedCount}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errores (primeros 10):`);
      errors.slice(0, 10).forEach(err => {
        console.log(`   - SKU ${err.sku}: ${err.motivo}`);
      });
    }
    
    // Mostrar estadísticas
    const stats = await client.query(`
      SELECT 
        linea,
        COUNT(*) as total_productos,
        COUNT(litros) as con_litros
      FROM products
      WHERE linea IS NOT NULL
      GROUP BY linea
      ORDER BY total_productos DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Top 10 líneas de productos:');
    console.table(stats.rows);
    
    const totalWithLitros = await client.query('SELECT COUNT(*) as total FROM products WHERE litros IS NOT NULL');
    console.log(`\n💧 Productos con litros definidos: ${totalWithLitros.rows[0].total}`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la importación:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Ejecutar importación
const filePath = process.argv[2] || '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';

importProducts(filePath)
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
  });
