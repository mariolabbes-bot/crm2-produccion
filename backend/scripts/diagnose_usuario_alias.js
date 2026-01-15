/**
 * Script para diagnosticar estructura de usuario_alias
 */
const pool = require('../src/db');

async function diagnose() {
  try {
    console.log('🔍 Diagnosticando tabla usuario_alias...\n');

    // Ver estructura de la tabla
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'usuario_alias'
      ORDER BY ordinal_position
    `);

    console.log('📋 Estructura de usuario_alias:');
    console.table(structureResult.rows);

    // Ver datos de ejemplo
    const dataResult = await pool.query('SELECT * FROM usuario_alias LIMIT 5');
    console.log('\n📝 Datos de ejemplo:');
    console.table(dataResult.rows);

    // Ver todos los campos disponibles
    if (dataResult.rows.length > 0) {
      console.log('\n🔑 Campos disponibles en usuario_alias:');
      const firstRow = dataResult.rows[0];
      Object.keys(firstRow).forEach(key => {
        console.log(`  - ${key}: ${typeof firstRow[key]} = ${JSON.stringify(firstRow[key])}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

diagnose();
