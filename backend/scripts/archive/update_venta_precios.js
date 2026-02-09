require('dotenv').config();
const pool = require('../src/db');
const XLSX = require('xlsx');

async function updateVentaPrecios() {
  console.log('🔄 Actualizando precios y valores totales en tabla venta...\n');
  
  const workbook = XLSX.readFile('../db/modelo_importacion_crm2.xlsx');
  const sheet = workbook.Sheets['VENTAS'];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`📊 Total filas en Excel: ${data.length.toLocaleString()}\n`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar si las columnas existen, si no, agregarlas
    const addCols = await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='venta' AND column_name='precio') THEN
          ALTER TABLE venta ADD COLUMN precio NUMERIC;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='venta' AND column_name='valor_total') THEN
          ALTER TABLE venta ADD COLUMN valor_total NUMERIC;
        END IF;
      END $$;
    `);
    console.log('✓ Columnas verificadas/creadas\n');

    let updated = 0;
    let notFound = 0;
    
    console.log('Procesando en lotes...');
    const BATCH_SIZE = 1000;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      for (const row of batch) {
        const tipo_documento = row['Tipo Documento'];
        const folio = row['Folio'];
        const indice = row['Indice'];
        const precio = row[' Precio '] || row['Precio'];
        const valor_total = row[' Valor Total '] || row['Valor Total'];
        
        if (!tipo_documento || !folio || indice == null) continue;
        
        const result = await client.query(`
          UPDATE venta 
          SET precio = $1, valor_total = $2
          WHERE tipo_documento = $3 AND folio = $4 AND indice = $5
        `, [precio || null, valor_total || null, tipo_documento, folio.toString(), indice]);
        
        if (result.rowCount > 0) {
          updated++;
        } else {
          notFound++;
        }
      }
      
      if ((i + BATCH_SIZE) % 10000 === 0) {
        console.log(`  Procesados: ${(i + BATCH_SIZE).toLocaleString()} / ${data.length.toLocaleString()}`);
      }
    }

    await client.query('COMMIT');
    
    console.log('\n✅ Actualización completada:');
    console.log(`   - Actualizados: ${updated.toLocaleString()}`);
    console.log(`   - No encontrados: ${notFound.toLocaleString()}`);
    
    // Verificar resultados
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(precio) as con_precio,
        COUNT(valor_total) as con_valor_total,
        SUM(valor_total) as suma_total,
        AVG(valor_total) as promedio
      FROM venta
    `);
    
    console.log('\n📊 Estadísticas finales:');
    console.log(`   Total registros: ${parseInt(stats.rows[0].total).toLocaleString()}`);
    console.log(`   Con precio: ${parseInt(stats.rows[0].con_precio).toLocaleString()}`);
    console.log(`   Con valor_total: ${parseInt(stats.rows[0].con_valor_total).toLocaleString()}`);
    console.log(`   Suma total ventas: $${parseFloat(stats.rows[0].suma_total || 0).toLocaleString()}`);
    console.log(`   Promedio: $${parseFloat(stats.rows[0].promedio || 0).toLocaleString()}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateVentaPrecios().catch(err => {
  console.error(err);
  process.exit(1);
});
