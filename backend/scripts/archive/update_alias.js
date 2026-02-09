const pool = require('../src/db');

// Mapeo RUT → ALIAS basado en los datos proporcionados
const aliasMap = {
  '7.775.897-6': 'JOAQUIN',
  '14.138.537-2': 'MATIAS FELIPE',
  '16.082.310-0': 'NATALY',
  '13.018.313-1': 'MAIKO',
  '11.599.857-9': 'ALEX',
  '12.168.148-K': null, // Gerente Comercial - sin alias en ventas
  '09.338.644-2': 'NELSON',
  '10.913.019-2': 'OMAR',
  '12.570.853-6': 'MILTON',
  '16.412.525-4': 'MARCELO',
  '12.569.531-0': 'EMILIO',
  '13.087.134-8': 'MARISOL',
  '05.715.101-3': 'JORGE',
  '07.107.100-6': 'ROBERTO',
  '12.051.321-4': 'VICTORIA',
  '09.262.987-2': 'EDUARDO',
  '13.830.417-5': 'EDUARDO ROJAS',
  '12.425.152-4': null, // Gerente General - sin alias en ventas
  '11.823.790-0': 'LUIS'
};

async function updateAlias() {
  console.log('🔄 Actualizando campo alias en tabla usuario...\n');

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [rut, alias] of Object.entries(aliasMap)) {
    try {
      if (alias === null) {
        console.log(`⏭️  Saltando ${rut} (sin alias - rol administrativo)`);
        skipped++;
        continue;
      }

      const result = await pool.query(
        'UPDATE usuario SET alias = $1 WHERE rut = $2 RETURNING rut, nombre_completo, alias',
        [alias, rut]
      );

      if (result.rowCount > 0) {
        console.log(`✅ ${rut} → alias: "${alias}" (${result.rows[0].nombre_completo})`);
        updated++;
      } else {
        console.log(`❌ ${rut} no encontrado en la base de datos`);
        notFound++;
      }
    } catch (error) {
      console.error(`❌ Error actualizando ${rut}:`, error.message);
    }
  }

  console.log('\n📊 RESUMEN:');
  console.log(`✅ Actualizados: ${updated}`);
  console.log(`⏭️  Saltados (sin alias): ${skipped}`);
  console.log(`❌ No encontrados: ${notFound}`);

  // Verificar estado final
  console.log('\n🔍 Verificando estado final...');
  const vendedores = await pool.query(`
    SELECT rut, nombre_completo, alias, rol_usuario 
    FROM usuario 
    WHERE rol_usuario = 'VENDEDOR' 
    ORDER BY nombre_completo
  `);

  console.log('\n📋 VENDEDORES CON ALIAS:');
  console.table(vendedores.rows);

  const sinAlias = vendedores.rows.filter(v => !v.alias);
  if (sinAlias.length > 0) {
    console.log(`\n⚠️  ATENCIÓN: ${sinAlias.length} vendedores aún sin alias:`);
    sinAlias.forEach(v => console.log(`   - ${v.nombre_completo} (${v.rut})`));
  } else {
    console.log('\n✅ Todos los vendedores tienen alias asignado!');
  }

  await pool.end();
  console.log('\n✅ Script completado');
}

updateAlias().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
