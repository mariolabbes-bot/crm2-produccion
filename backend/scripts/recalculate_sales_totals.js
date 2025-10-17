const pool = require('../src/db');

async function recalcularTotalesVentas() {
  console.log('🔄 Recalculando totales de ventas...\n');
  
  try {
    await pool.query('BEGIN');
    
    // Actualizar total_venta para cada venta
    // Solo sumando items que tienen SKU y valor_total > 0
    const result = await pool.query(`
      UPDATE sales s
      SET total_venta = (
        SELECT COALESCE(SUM(si.valor_total), 0)
        FROM sales_items si
        WHERE si.sale_id = s.id
          AND si.sku IS NOT NULL
          AND si.sku != ''
          AND si.valor_total > 0
          AND si.cantidad > 0
      )
    `);
    
    console.log(`✅ Totales actualizados para ${result.rowCount} ventas`);
    
    await pool.query('COMMIT');
    
    // Mostrar estadísticas
    console.log('\n📊 Estadísticas después del recálculo:\n');
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_ventas,
        COUNT(*) FILTER (WHERE total_venta = 0) as ventas_sin_monto,
        COUNT(*) FILTER (WHERE total_venta > 0) as ventas_con_monto,
        SUM(total_venta) as monto_total,
        AVG(total_venta) FILTER (WHERE total_venta > 0) as promedio_venta,
        MAX(total_venta) as venta_maxima,
        MIN(total_venta) FILTER (WHERE total_venta > 0) as venta_minima
      FROM sales
    `);
    
    console.table(stats.rows);
    
    // Ventas por año con montos
    const ventasPorAnio = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM fecha_emision) as anio,
        COUNT(*) as total_ventas,
        ROUND(SUM(total_venta), 2) as monto_total,
        ROUND(AVG(total_venta), 2) as promedio
      FROM sales
      WHERE total_venta > 0
      GROUP BY EXTRACT(YEAR FROM fecha_emision)
      ORDER BY anio DESC
    `);
    
    console.log('\nVentas por año (con monto):');
    console.table(ventasPorAnio.rows);
    
    // Top 10 ventas más grandes
    const topVentas = await pool.query(`
      SELECT 
        s.folio,
        s.fecha_emision,
        c.nombre as cliente,
        u.nombre as vendedor,
        s.total_venta,
        (SELECT COUNT(*) FROM sales_items WHERE sale_id = s.id AND valor_total > 0) as items
      FROM sales s
      JOIN clients c ON c.id = s.client_id
      JOIN users u ON u.id = s.vendedor_id
      WHERE s.total_venta > 0
      ORDER BY s.total_venta DESC
      LIMIT 10
    `);
    
    console.log('\nTop 10 ventas más grandes:');
    console.table(topVentas.rows);
    
    // Ventas con items pero total = 0 (solo líneas informativas)
    const soloTexto = await pool.query(`
      SELECT COUNT(*) as total
      FROM sales s
      WHERE s.total_venta = 0
        AND EXISTS (SELECT 1 FROM sales_items WHERE sale_id = s.id)
    `);
    
    console.log(`\n📝 Ventas con solo líneas de texto (sin productos): ${soloTexto.rows[0].total}`);
    
    console.log('\n✅ Recálculo completado');
    
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

recalcularTotalesVentas();
