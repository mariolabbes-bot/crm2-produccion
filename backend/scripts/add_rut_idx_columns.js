/**
 * MIGRACIÓN: NORMALIZACIÓN DE RUTS PARA OPTIMIZACIÓN
 * Propósito: Agregar columnas rut_idx indexadas para mejorar el rendimiento de los JOIN.
 */
const pool = require('../src/db');

async function runMigration() {
  console.log('🏗️ Iniciando Migración de Optimización (rut_idx)...');

  try {
    const tables = [
      { name: 'cliente', col: 'rut' },
      { name: 'venta', col: 'identificador' },
      { name: 'abono', col: 'identificador' },
      { name: 'usuario', col: 'rut' },
      { name: 'saldo_credito', col: 'rut' }
    ];

    for (const table of tables) {
      console.log(`\n⚙️ Procesando tabla: ${table.name}...`);
      
      // 1. Agregar columna si no existe
      await pool.query(`
        ALTER TABLE ${table.name} 
        ADD COLUMN IF NOT EXISTS rut_idx VARCHAR(20)
      `);
      console.log(`   ✅ Columna rut_idx agregada (o ya existía).`);

      // 2. Poblar columna
      // Nota: REGEXP_REPLACE(..., '[^a-zA-Z0-9]', '', 'g') remueve todo lo que no sea letra o número.
      console.log(`   🧹 Normalizando datos existentes en ${table.name}...`);
      await pool.query(`
        UPDATE ${table.name} 
        SET rut_idx = UPPER(REGEXP_REPLACE(${table.col}, '[^a-zA-Z0-9]', '', 'g'))
        WHERE ${table.col} IS NOT NULL AND (rut_idx IS NULL OR rut_idx = '')
      `);
      console.log(`   ✅ Datos normalizados.`);

      // 3. Crear índice
      console.log(`   ⚡ Creando índice en ${table.name}(rut_idx)...`);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_${table.name}_rut_idx 
        ON ${table.name} (rut_idx)
      `);
      console.log(`   ✅ Índice creado.`);
    }

    console.log('\n🎉 Migración completada con éxito.');

  } catch (err) {
    console.error('\n💥 Error durante la migración:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
