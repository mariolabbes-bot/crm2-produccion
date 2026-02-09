require('dotenv').config();
const pool = require('../src/db');

async function diagnose() {
  try {
    console.log('🔍 DIAGNÓSTICO DE TABLAS PARA CLIENTDETAIL\n');

    // 1. Estructura de tabla cliente
    console.log('1️⃣ TABLA: cliente');
    const clienteStructure = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'cliente' ORDER BY ordinal_position
    `);
    clienteStructure.rows.forEach(row => console.log(`   ${row.column_name}: ${row.data_type}`));

    // 2. Estructura de tabla saldo_credito
    console.log('\n2️⃣ TABLA: saldo_credito');
    const saldoStructure = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'saldo_credito' ORDER BY ordinal_position
    `);
    saldoStructure.rows.forEach(row => console.log(`   ${row.column_name}: ${row.data_type}`));

    // 3. Estructura de tabla venta
    console.log('\n3️⃣ TABLA: venta');
    const ventaStructure = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'venta' ORDER BY ordinal_position
    `);
    ventaStructure.rows.forEach(row => console.log(`   ${row.column_name}: ${row.data_type}`));

    // 4. Contar registros en saldo_credito
    console.log('\n4️⃣ DATOS EN SALDO_CREDITO:');
    const saldoCount = await pool.query('SELECT COUNT(*) FROM saldo_credito');
    console.log(`   Total registros: ${saldoCount.rows[0].count}`);

    // 5. Sample de un cliente
    console.log('\n5️⃣ SAMPLE DE UN CLIENTE:');
    const sampleCliente = await pool.query('SELECT * FROM cliente LIMIT 1');
    if (sampleCliente.rows.length > 0) {
      console.log('   Cliente sample:', sampleCliente.rows[0]);
    }

    // 6. Buscar saldo_credito para ese cliente
    if (sampleCliente.rows.length > 0) {
      const nombreCliente = sampleCliente.rows[0].nombre;
      console.log(`\n6️⃣ BUSCAR SALDO_CREDITO PARA: "${nombreCliente}"`);
      
      // Intenta diferentes formatos de búsqueda
      const saldoSearch = await pool.query(`
        SELECT * FROM saldo_credito 
        WHERE UPPER(TRIM(cliente)) = UPPER(TRIM($1))
        LIMIT 5
      `, [nombreCliente]);
      
      if (saldoSearch.rows.length > 0) {
        console.log(`   ✅ Encontrado: ${saldoSearch.rows.length} registros`);
        console.log('   Sample:', saldoSearch.rows[0]);
      } else {
        console.log('   ❌ No encontrado con coincidencia exacta');
        
        // Intentar búsqueda parcial
        const saldoPartial = await pool.query(`
          SELECT * FROM saldo_credito 
          WHERE UPPER(cliente) LIKE UPPER($1)
          LIMIT 5
        `, [`%${nombreCliente.substring(0, 5)}%`]);
        
        if (saldoPartial.rows.length > 0) {
          console.log(`   ⚠️ Encontrado con búsqueda parcial: ${saldoPartial.rows.length} registros`);
          console.log('   Ejemplos de clientes en saldo_credito:');
          saldoPartial.rows.slice(0, 3).forEach(row => {
            console.log(`      - "${row.cliente}"`);
          });
        } else {
          console.log('   ❌ No encontrado con búsqueda parcial');
          
          // Mostrar algunos clientes que sí existen
          const allSaldo = await pool.query('SELECT DISTINCT cliente FROM saldo_credito LIMIT 5');
          console.log('   Ejemplos de clientes en saldo_credito:');
          allSaldo.rows.forEach(row => console.log(`      - "${row.cliente}"`));
        }
      }
    }

    // 7. Buscar ventas para ese cliente
    if (sampleCliente.rows.length > 0) {
      const nombreCliente = sampleCliente.rows[0].nombre;
      console.log(`\n7️⃣ BUSCAR VENTAS PARA: "${nombreCliente}"`);
      
      const ventasSearch = await pool.query(`
        SELECT COUNT(*) FROM venta 
        WHERE UPPER(TRIM(cliente)) = UPPER(TRIM($1))
      `, [nombreCliente]);
      
      console.log(`   Total ventas: ${ventasSearch.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

diagnose();
