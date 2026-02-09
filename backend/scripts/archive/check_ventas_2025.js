const pool = require('../src/db');

async function checkVentas2025() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Consultando ventas por vendedor por mes en 2025...\n');
    
    // Consulta para ventas por vendedor y mes en 2025
    const ventasPorVendedorMes = await client.query(`
      SELECT 
        TO_CHAR(s.fecha_emision, 'YYYY-MM') as mes,
        s.vendedor_id,
        u.nombre as vendedor_nombre,
        COUNT(*) as cantidad_ventas,
        SUM(s.total_venta) as total_ventas
      FROM sales s
      LEFT JOIN users u ON s.vendedor_id = u.id
      WHERE s.fecha_emision BETWEEN '2025-01-01' AND '2025-12-31'
      GROUP BY mes, s.vendedor_id, u.nombre
      ORDER BY mes, vendedor_nombre
    `);
    
    if (ventasPorVendedorMes.rows.length === 0) {
      console.log('❌ No hay ventas registradas para 2025\n');
    } else {
      console.log(`✅ ${ventasPorVendedorMes.rows.length} registros encontrados:\n`);
      console.table(ventasPorVendedorMes.rows);
    }
    
    // Resumen por mes
    console.log('\n📊 Resumen por mes:');
    const resumenPorMes = await client.query(`
      SELECT 
        TO_CHAR(fecha_emision, 'YYYY-MM') as mes,
        COUNT(*) as cantidad_ventas,
        SUM(total_venta) as total_ventas
      FROM sales
      WHERE fecha_emision BETWEEN '2025-01-01' AND '2025-12-31'
      GROUP BY mes
      ORDER BY mes
    `);
    console.table(resumenPorMes.rows);
    
    // Resumen por vendedor
    console.log('\n👥 Resumen por vendedor:');
    const resumenPorVendedor = await client.query(`
      SELECT 
        u.nombre as vendedor_nombre,
        COUNT(*) as cantidad_ventas,
        SUM(s.total_venta) as total_ventas
      FROM sales s
      LEFT JOIN users u ON s.vendedor_id = u.id
      WHERE s.fecha_emision BETWEEN '2025-01-01' AND '2025-12-31'
      GROUP BY u.nombre
      ORDER BY total_ventas DESC
    `);
    console.table(resumenPorVendedor.rows);
    
  } catch (error) {
    console.error('❌ Error al consultar ventas:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkVentas2025();
