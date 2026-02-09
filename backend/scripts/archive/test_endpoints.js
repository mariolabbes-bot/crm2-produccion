const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function testTopVentas() {
  try {
    console.log('🔍 Probando query top-ventas...\n');
    
    // Simular exactamente el query del endpoint sin filtro de vendedor
    const vendedorFilter = ''; // Manager sin filtro
    const params = [];
    
    const query = `
      SELECT 
        c.rut,
        c.nombre,
        c.direccion,
        c.ciudad,
        c.telefono_principal as telefono,
        c.email,
        COALESCE(SUM(v.valor_total), 0) as total_ventas,
        COUNT(v.id) as cantidad_ventas
      FROM cliente c
      INNER JOIN venta v ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(v.cliente))
      WHERE v.fecha_emision >= NOW() - INTERVAL '12 months'
      ${vendedorFilter}
      GROUP BY c.rut, c.nombre, c.direccion, c.ciudad, c.telefono_principal, c.email
      ORDER BY total_ventas DESC
      LIMIT 20
    `;
    
    console.log('Query:', query);
    const result = await pool.query(query, params);
    console.log(`✅ Top Ventas: ${result.rows.length} clientes encontrados\n`);
    
    if (result.rows.length > 0) {
      console.log('Primeros 3:');
      result.rows.slice(0, 3).forEach((c, i) => {
        console.log(`${i+1}. ${c.nombre} - $${parseFloat(c.total_ventas).toLocaleString('es-CL')}`);
      });
    }
    
    return result.rows;
  } catch (err) {
    console.error('❌ Error en top-ventas:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  }
}

async function testFacturasImpagas() {
  try {
    console.log('\n🔍 Probando query facturas-impagas...\n');
    
    const vendedorFilter = '';
    const params = [];
    
    const query = `
      WITH ventas_recientes AS (
        SELECT DISTINCT v.cliente
        FROM venta v
        WHERE v.fecha_emision >= NOW() - INTERVAL '3 months'
        ${vendedorFilter}
      ),
      facturas_antiguas AS (
        SELECT 
          v.cliente,
          COUNT(*) as cantidad_facturas_impagas,
          SUM(v.valor_total) as monto_total_facturado,
          MIN(v.fecha_emision) as factura_mas_antigua
        FROM venta v
        WHERE v.fecha_emision <= NOW() - INTERVAL '30 days'
        ${vendedorFilter}
        GROUP BY v.cliente
      ),
      abonos_por_cliente AS (
        SELECT 
          a.rut_cliente as rut,
          SUM(COALESCE(a.monto, a.monto_abono, 0)) as total_abonado
        FROM abono a
        GROUP BY a.rut_cliente
      )
      SELECT 
        c.rut,
        c.nombre,
        c.direccion,
        c.ciudad,
        c.telefono_principal as telefono,
        c.email,
        fa.cantidad_facturas_impagas,
        fa.monto_total_facturado,
        COALESCE(ab.total_abonado, 0) as total_abonado,
        (fa.monto_total_facturado - COALESCE(ab.total_abonado, 0)) as monto_total_impago,
        fa.factura_mas_antigua,
        EXTRACT(DAY FROM NOW() - fa.factura_mas_antigua)::INTEGER as dias_mora
      FROM cliente c
      INNER JOIN ventas_recientes vr ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(vr.cliente))
      INNER JOIN facturas_antiguas fa ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(fa.cliente))
      LEFT JOIN abonos_por_cliente ab ON c.rut = ab.rut
      WHERE (fa.monto_total_facturado - COALESCE(ab.total_abonado, 0)) > 0
      ORDER BY monto_total_impago DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query, params);
    console.log(`✅ Facturas Impagas: ${result.rows.length} clientes encontrados\n`);
    
    if (result.rows.length > 0) {
      console.log('Primeros 3:');
      result.rows.slice(0, 3).forEach((c, i) => {
        console.log(`${i+1}. ${c.nombre} - Impago: $${parseFloat(c.monto_total_impago).toLocaleString('es-CL')} - ${c.dias_mora} días`);
      });
    }
    
    return result.rows;
  } catch (err) {
    console.error('❌ Error en facturas-impagas:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  }
}

(async () => {
  try {
    await testTopVentas();
    await testFacturasImpagas();
    console.log('\n✅ Todas las pruebas exitosas');
  } catch (err) {
    console.error('\n❌ Error en las pruebas');
  } finally {
    await pool.end();
  }
})();
