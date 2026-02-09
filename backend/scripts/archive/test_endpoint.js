const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

// Simular un usuario manager
const testManager = {
  rut: '18424992-4',
  rol: 'manager',
  nombre_vendedor: 'MARIO ALBERTO LABBES'
};

// Simular un usuario vendedor
const testVendedor = {
  rut: '12345678-9',
  rol: 'vendedor',
  nombre_vendedor: 'Omar Maldonado'
};

async function testTopVentas(user) {
  try {
    console.log(`\n🧪 Probando top-ventas como ${user.rol.toUpperCase()}...`);
    
    const isManager = user.rol?.toLowerCase() === 'manager';
    
    let vendedorFilter = '';
    let params = [];
    
    if (!isManager) {
      const nombreVendedor = user.nombre_vendedor || user.alias || '';
      if (nombreVendedor) {
        vendedorFilter = 'AND UPPER(v.vendedor_cliente) = UPPER($1)';
        params.push(nombreVendedor);
      }
    }
    
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
      LIMIT 3
    `;
    
    console.log('📋 Query params:', params);
    console.log('📋 Vendedor filter:', vendedorFilter || '(ninguno)');
    
    const result = await pool.query(query, params);
    console.log(`✅ Encontrados ${result.rows.length} clientes`);
    
    result.rows.forEach((c, i) => {
      console.log(`${i+1}. ${c.nombre} - $${parseFloat(c.total_ventas).toLocaleString('es-CL')}`);
    });
    
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
  }
}

(async () => {
  await testTopVentas(testManager);
  await testTopVentas(testVendedor);
  await pool.end();
})();
