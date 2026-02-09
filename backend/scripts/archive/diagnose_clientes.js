const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function diagnosticar() {
  try {
    console.log('🔍 DIAGNÓSTICO DE CLIENTES\n');
    
    // 1. Total de clientes
    const totalClientes = await pool.query('SELECT COUNT(*) FROM cliente');
    console.log(`1️⃣ Total clientes: ${totalClientes.rows[0].count}`);
    
    // 2. Total de ventas
    const totalVentas = await pool.query('SELECT COUNT(*) FROM venta WHERE fecha_emision >= NOW() - INTERVAL \'12 months\'');
    console.log(`2️⃣ Ventas últimos 12 meses: ${totalVentas.rows[0].count}`);
    
    // 3. Vendedores únicos en ventas
    const vendedores = await pool.query(`
      SELECT DISTINCT vendedor_cliente, COUNT(*) as cantidad
      FROM venta 
      WHERE fecha_emision >= NOW() - INTERVAL '12 months'
      GROUP BY vendedor_cliente
      ORDER BY cantidad DESC
      LIMIT 10
    `);
    console.log('\n3️⃣ Top 10 vendedores en ventas:');
    vendedores.rows.forEach(v => console.log(`   - ${v.vendedor_cliente}: ${v.cantidad} ventas`));
    
    // 4. Usuarios vendedores en tabla usuario
    const usuariosVendedores = await pool.query(`
      SELECT nombre_vendedor, alias, correo 
      FROM usuario 
      WHERE LOWER(rol_usuario) = 'vendedor'
      LIMIT 10
    `);
    console.log('\n4️⃣ Usuarios vendedores en BD:');
    usuariosVendedores.rows.forEach(u => console.log(`   - ${u.nombre_vendedor} (alias: ${u.alias}) - ${u.correo}`));
    
    // 5. Top 20 clientes sin filtro
    const topClientes = await pool.query(`
      SELECT 
        c.rut,
        c.nombre,
        COALESCE(SUM(v.valor_total), 0) as total_ventas,
        COUNT(v.id) as cantidad_ventas
      FROM cliente c
      INNER JOIN venta v ON c.rut = v.rut_cliente
      WHERE v.fecha_emision >= NOW() - INTERVAL '12 months'
      GROUP BY c.rut, c.nombre
      ORDER BY total_ventas DESC
      LIMIT 5
    `);
    console.log('\n5️⃣ Top 5 clientes por ventas:');
    topClientes.rows.forEach(c => console.log(`   - ${c.nombre}: $${parseInt(c.total_ventas).toLocaleString()} (${c.cantidad_ventas} ventas)`));
    
    // 6. Búsqueda de ejemplo
    const busqueda = await pool.query(`
      SELECT rut, nombre
      FROM cliente
      WHERE UPPER(nombre) LIKE UPPER('%SOC%')
      LIMIT 5
    `);
    console.log('\n6️⃣ Búsqueda "SOC" en nombres:');
    busqueda.rows.forEach(c => console.log(`   - ${c.nombre} (${c.rut})`));
    
    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

diagnosticar();
