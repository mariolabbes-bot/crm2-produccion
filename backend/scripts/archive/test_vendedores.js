const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testVendedores() {
  try {
    console.log('🔍 Probando consulta de vendedores...\n');
    
    // Listar todas las tablas
    console.log('1️⃣ Tablas en la base de datos:');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(tables.rows.map(r => `   - ${r.table_name}`).join('\n'));
    
    // Intentar con tabla 'users'
    console.log('\n2️⃣ Intentando con tabla "users":');
    try {
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
        ORDER BY ordinal_position
      `);
      console.log('   Columnas:');
      columns.rows.forEach(c => console.log(`   - ${c.column_name} (${c.data_type})`));
      
      const queryUsers = `
        SELECT 
          id,
          nombre_vendedor as nombre,
          email as correo,
          rol
        FROM users
        WHERE LOWER(rol) = 'vendedor'
        ORDER BY nombre_vendedor ASC
        LIMIT 5
      `;
      const vendedores = await pool.query(queryUsers);
      console.log(`\n   ✓ Encontrados ${vendedores.rows.length} vendedores:`);
      vendedores.rows.forEach(v => console.log(`   - ${v.nombre} (${v.correo})`));
    } catch (err) {
      console.log(`   ✗ Error: ${err.message}`);
    }
    
    // Intentar con tabla 'usuario'
    console.log('\n3️⃣ Intentando con tabla "usuario":');
    try {
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usuario'
        ORDER BY ordinal_position
      `);
      console.log('   Columnas:');
      columns.rows.forEach(c => console.log(`   - ${c.column_name} (${c.data_type})`));
      
      const queryUsuario = `
        SELECT 
          rut as id,
          nombre_vendedor as nombre,
          correo,
          rol_usuario as rol,
          nombre_completo
        FROM usuario
        WHERE LOWER(rol_usuario) = 'vendedor'
        AND nombre_vendedor IS NOT NULL
        ORDER BY nombre_vendedor ASC
        LIMIT 5
      `;
      const vendedores = await pool.query(queryUsuario);
      console.log(`\n   ✓ Encontrados ${vendedores.rows.length} vendedores:`);
      vendedores.rows.forEach(v => console.log(`   - ${v.nombre} (${v.correo})`));
    } catch (err) {
      console.log(`   ✗ Error: ${err.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testVendedores();
