const pool = require('../src/db');

async function fixEncoding() {
  console.log('🔧 Corrigiendo encoding de ñ en tablas VENTA y ABONO\n');
  
  try {
    // Corregir en VENTA
    console.log('📊 Actualizando tabla VENTA...');
    const ventaResult = await pool.query(`
      UPDATE venta 
      SET vendedor_cliente = 'Nelson Antonio Muñoz Cortes'
      WHERE vendedor_cliente LIKE '%Mu%oz%'
      RETURNING folio
    `);
    console.log(`✅ ${ventaResult.rowCount} filas actualizadas en VENTA`);
    
    // Corregir en ABONO
    console.log('\n📊 Actualizando tabla ABONO...');
    const abonoResult = await pool.query(`
      UPDATE abono 
      SET vendedor_cliente = 'Nelson Antonio Muñoz Cortes'
      WHERE vendedor_cliente LIKE '%Mu%oz%'
      RETURNING folio
    `);
    console.log(`✅ ${abonoResult.rowCount} filas actualizadas en ABONO`);
    
    // Verificar resultado final
    console.log('\n📊 Verificando resultado final...');
    const noMatch = await pool.query(`
      SELECT DISTINCT v.vendedor_cliente, COUNT(*) as cantidad_ventas
      FROM venta v
      WHERE v.vendedor_cliente IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM usuario u 
        WHERE TRIM(u.nombre_vendedor) = TRIM(v.vendedor_cliente)
      )
      GROUP BY v.vendedor_cliente
      ORDER BY cantidad_ventas DESC
    `);
    
    if (noMatch.rows.length === 0) {
      console.log('✅ ¡PERFECTO! Todos los vendedores en VENTA ahora matchean con USUARIO.nombre_vendedor');
    } else {
      console.log('⚠️  Aún hay vendedores sin match:');
      console.table(noMatch.rows);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
  
  console.log('\n✅ Corrección de encoding completada');
}

fixEncoding().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
