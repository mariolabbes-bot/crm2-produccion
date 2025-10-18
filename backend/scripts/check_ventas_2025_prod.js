const { Pool } = require('pg');

// Usar la base de datos de producción en Render
const DATABASE_URL = process.env.DATABASE_URL_PROD || 'postgresql://crm2_db_9fbs_user:jG4Lh3HtnZwPbNjPJf1PfAT9WHRxvHAQ@dpg-cs49q9rtq21c73blhgdg-a.oregon-postgres.render.com/crm2_db_9fbs';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

async function checkVentas2025() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Consultando ventas por vendedor por mes en 2025 (Base de datos de producción)...\n');
    
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
    console.log('\n👥 Resumen por vendedor (2025):');
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
    
    // Verificar el endpoint comparativo
    console.log('\n🔗 Probando el endpoint comparativo...');
    const comparativo = await client.query(`
      WITH ventas_agrupadas AS (
        SELECT 
          TO_CHAR(fecha_emision, 'YYYY-MM') as periodo,
          vendedor_id,
          SUM(total_venta) as total_ventas,
          COUNT(*) as cantidad_ventas
        FROM sales
        WHERE fecha_emision BETWEEN '2025-01-01' AND '2025-12-31'
        GROUP BY TO_CHAR(fecha_emision, 'YYYY-MM'), vendedor_id
      ),
      abonos_agrupados AS (
        SELECT 
          TO_CHAR(fecha_abono, 'YYYY-MM') as periodo,
          vendedor_id,
          SUM(monto) as total_abonos,
          COUNT(*) as cantidad_abonos
        FROM abonos
        WHERE fecha_abono BETWEEN '2025-01-01' AND '2025-12-31'
        GROUP BY TO_CHAR(fecha_abono, 'YYYY-MM'), vendedor_id
      )
      SELECT 
        COALESCE(v.periodo, a.periodo) as periodo,
        COALESCE(v.vendedor_id, a.vendedor_id) as vendedor_id,
        u.nombre as vendedor_nombre,
        COALESCE(v.total_ventas, 0) as total_ventas,
        COALESCE(v.cantidad_ventas, 0) as cantidad_ventas,
        COALESCE(a.total_abonos, 0) as total_abonos,
        COALESCE(a.cantidad_abonos, 0) as cantidad_abonos
      FROM ventas_agrupadas v
      FULL OUTER JOIN abonos_agrupados a ON v.periodo = a.periodo AND v.vendedor_id = a.vendedor_id
      LEFT JOIN users u ON COALESCE(v.vendedor_id, a.vendedor_id) = u.id
      ORDER BY periodo DESC, vendedor_nombre
      LIMIT 20
    `);
    
    console.log('\n📋 Primeros 20 registros del comparativo (mismo formato que el endpoint):');
    console.table(comparativo.rows);
    
  } catch (error) {
    console.error('❌ Error al consultar ventas:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkVentas2025();
