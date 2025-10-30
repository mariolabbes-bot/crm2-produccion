const pool = require('./src/db');

async function testQuery() {
  try {
    // Test 1: Ver estructura de usuario
    console.log('=== Estructura tabla usuario ===');
    const usuario = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usuario' 
      ORDER BY ordinal_position
    `);
    console.log(JSON.stringify(usuario.rows, null, 2));

    // Test 2: Ver un usuario de ejemplo
    console.log('\n=== Usuario ejemplo ===');
    const userSample = await pool.query('SELECT * FROM usuario LIMIT 1');
    console.log(JSON.stringify(userSample.rows, null, 2));

    // Test 3: Ver un cliente de ejemplo
    console.log('\n=== Cliente ejemplo ===');
    const clienteSample = await pool.query('SELECT * FROM cliente LIMIT 1');
    console.log(JSON.stringify(clienteSample.rows, null, 2));

    // Test 4: Probar la query de inactivos simplificada
    console.log('\n=== Test query inactivos (sin filtro vendedor) ===');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const mesActualIni = `${year}-${String(month).padStart(2, '0')}-01`;
    const mesActualFin = new Date(year, month, 0);
    const mesActualFinStr = `${year}-${String(month).padStart(2, '0')}-${String(mesActualFin.getDate()).padStart(2, '0')}`;
    const hace12m = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const hace12mStr = `${hace12m.getFullYear()}-${String(hace12m.getMonth() + 1).padStart(2, '0')}-01`;
    
    console.log('Fechas:', { hace12mStr, mesActualIni, mesActualFinStr });
    
    const inactivos = await pool.query(`
      SELECT c.rut, c.nombre, c.email, c.telefono, c.vendedor_alias
      FROM cliente c
      WHERE EXISTS (
        SELECT 1 FROM venta v
        WHERE v.cliente = c.nombre
          AND v.fecha_emision >= $1 AND v.fecha_emision < $2
      )
      AND NOT EXISTS (
        SELECT 1 FROM venta v2
        WHERE v2.cliente = c.nombre
          AND v2.fecha_emision >= $2 AND v2.fecha_emision <= $3
      )
      LIMIT 5
    `, [hace12mStr, mesActualIni, mesActualFinStr]);
    
    console.log('Clientes inactivos encontrados:', inactivos.rows.length);
    console.log(JSON.stringify(inactivos.rows, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testQuery();
