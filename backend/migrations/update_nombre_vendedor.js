const pool = require('../src/db');

const updates = [
  // Casos donde nombre_vendedor está abreviado (usar nombre_completo)
  { rut: '12.569.531-0', nombre_vendedor: 'Emilio Alberto Santos Castillo' },
  { rut: '12.570.853-6', nombre_vendedor: 'Milton Marin Blanco' },
  
  // Caso de encoding con ñ (corregir)
  { rut: '09.338.644-2', nombre_vendedor: 'Nelson Antonio Muñoz Cortes' }
];

async function updateNombreVendedor() {
  console.log('🔧 Actualizando campo nombre_vendedor en tabla usuario\n');
  
  for (const { rut, nombre_vendedor } of updates) {
    try {
      const result = await pool.query(
        'UPDATE usuario SET nombre_vendedor = $1 WHERE rut = $2 RETURNING rut, nombre_completo, nombre_vendedor',
        [nombre_vendedor, rut]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ ${rut} → "${nombre_vendedor}"`);
      } else {
        console.log(`⚠️  ${rut} no encontrado`);
      }
    } catch (error) {
      console.error(`❌ Error actualizando ${rut}:`, error.message);
    }
  }
  
  console.log('\n📊 Verificando resultado...');
  
  // Verificar que ya no haya desmatches
  const noMatch = await pool.query(`
    SELECT DISTINCT v.vendedor_cliente, COUNT(*) as cantidad_ventas
    FROM venta v
    WHERE v.vendedor_cliente IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM usuario u 
      WHERE UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(v.vendedor_cliente))
    )
    GROUP BY v.vendedor_cliente
    ORDER BY cantidad_ventas DESC
  `);
  
  if (noMatch.rows.length === 0) {
    console.log('✅ ¡Todos los vendedores en VENTA ahora matchean con USUARIO.nombre_vendedor!');
  } else {
    console.log('⚠️  Aún hay vendedores sin match:');
    console.table(noMatch.rows);
  }
  
  await pool.end();
  console.log('\n✅ Actualización completada');
}

updateNombreVendedor().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
