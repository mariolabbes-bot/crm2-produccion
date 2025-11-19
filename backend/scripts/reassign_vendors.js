require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function reassignVendors() {
  const client = await pool.connect();
  
  try {
    // Buscar abonos con Alejandra
    console.log('🔍 Buscando abonos con Alejandra...');
    const alejandraCheck = await client.query(`
      SELECT COUNT(*), vendedor_cliente 
      FROM abono 
      WHERE vendedor_cliente ILIKE '%alejandra%'
      GROUP BY vendedor_cliente
    `);
    console.log('Resultados Alejandra:', alejandraCheck.rows);
    
    // Buscar abonos con Octavio
    console.log('\n🔍 Buscando abonos con Octavio...');
    const octavioCheck = await client.query(`
      SELECT COUNT(*), vendedor_cliente 
      FROM abono 
      WHERE vendedor_cliente ILIKE '%octavio%'
      GROUP BY vendedor_cliente
    `);
    console.log('Resultados Octavio:', octavioCheck.rows);
    
    // UPDATE Alejandra → Luis Ramon Esquivel Oyamadel
    console.log('\n🔄 Reasignando Alejandra → Luis Ramon Esquivel Oyamadel...');
    const alejandraUpdate = await client.query(`
      UPDATE abono 
      SET vendedor_cliente = 'Luis Ramon Esquivel Oyamadel'
      WHERE vendedor_cliente ILIKE '%alejandra%'
    `);
    console.log(`✅ ${alejandraUpdate.rowCount} abonos actualizados`);
    
    // UPDATE Octavio → JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA
    console.log('\n🔄 Reasignando Octavio → JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA...');
    const octavioUpdate = await client.query(`
      UPDATE abono 
      SET vendedor_cliente = 'JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA'
      WHERE vendedor_cliente ILIKE '%octavio%'
    `);
    console.log(`✅ ${octavioUpdate.rowCount} abonos actualizados`);
    
    // Verificar resultado
    console.log('\n🔍 Verificando que no queden registros...');
    const finalCheck = await client.query(`
      SELECT COUNT(*) 
      FROM abono 
      WHERE vendedor_cliente ILIKE '%alejandra%' OR vendedor_cliente ILIKE '%octavio%'
    `);
    console.log(`Restantes: ${finalCheck.rows[0].count}`);
    
    console.log('\n✅ Reasignación completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

reassignVendors();
