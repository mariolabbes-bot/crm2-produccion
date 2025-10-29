require('dotenv').config();
const pool = require('../src/db');

async function addVendedorId() {
  const client = await pool.connect();
  try {
    console.log('🔧 Agregando columna vendedor_id a tablas venta y abono...\n');

    // 1. Agregar columna vendedor_id a venta
    await client.query(`
      ALTER TABLE venta 
      ADD COLUMN IF NOT EXISTS vendedor_id INTEGER REFERENCES usuario(id)
    `);
    console.log('✓ Columna vendedor_id agregada a venta');

    // 2. Agregar columna vendedor_id a abono
    await client.query(`
      ALTER TABLE abono 
      ADD COLUMN IF NOT EXISTS vendedor_id INTEGER REFERENCES usuario(id)
    `);
    console.log('✓ Columna vendedor_id agregada a abono');

    // 3. Popular vendedor_id en venta basado en alias
    const updateVenta = await client.query(`
      UPDATE venta v
      SET vendedor_id = u.id
      FROM usuario u
      WHERE UPPER(TRIM(u.alias)) = UPPER(TRIM(v.vendedor_cliente))
      AND v.vendedor_id IS NULL
    `);
    console.log(`✓ Actualizadas ${updateVenta.rowCount} filas en venta`);

    // 4. Popular vendedor_id en abono basado en alias
    const updateAbono = await client.query(`
      UPDATE abono a
      SET vendedor_id = u.id
      FROM usuario u
      WHERE UPPER(TRIM(u.alias)) = UPPER(TRIM(a.vendedor_cliente))
      AND a.vendedor_id IS NULL
    `);
    console.log(`✓ Actualizadas ${updateAbono.rowCount} filas en abono`);

    // 5. Verificar resultados
    const ventaStats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(vendedor_id) as con_vendedor,
        COUNT(*) - COUNT(vendedor_id) as sin_vendedor
      FROM venta
    `);
    console.log('\n📊 Estadísticas venta:', ventaStats.rows[0]);

    const abonoStats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(vendedor_id) as con_vendedor,
        COUNT(*) - COUNT(vendedor_id) as sin_vendedor
      FROM abono
    `);
    console.log('📊 Estadísticas abono:', abonoStats.rows[0]);

    console.log('\n✅ Proceso completado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addVendedorId().catch(err => {
  console.error(err);
  process.exit(1);
});
