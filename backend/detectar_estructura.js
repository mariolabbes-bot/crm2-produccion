// Script para detectar estructura de tabla venta
const pool = require('./src/db');

async function detectarEstructuraVenta() {
  const client = await pool.connect();
  
  try {
    // Verificar qué tablas existen
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sales', 'venta', 'ventas')
      ORDER BY table_name
    `);
    
    console.log('📊 Tablas de ventas encontradas:');
    tablesRes.rows.forEach(r => console.log(`  - ${r.table_name}`));
    console.log('');
    
    // Detectar columnas de tabla venta
    const columnsRes = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'venta'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columnas de tabla VENTA:');
    console.log('╔════════════════════════════════╦══════════════════╦═══════╦══════════╗');
    console.log('║ Columna                        ║ Tipo             ║ Long  ║ Nullable ║');
    console.log('╠════════════════════════════════╬══════════════════╬═══════╬══════════╣');
    
    columnsRes.rows.forEach(col => {
      const nombre = col.column_name.padEnd(30);
      const tipo = col.data_type.padEnd(16);
      const longitud = (col.character_maximum_length || '-').toString().padEnd(5);
      const nullable = col.is_nullable.padEnd(8);
      console.log(`║ ${nombre} ║ ${tipo} ║ ${longitud} ║ ${nullable} ║`);
    });
    
    console.log('╚════════════════════════════════╩══════════════════╩═══════╩══════════╝');
    
    // Detectar columnas de tabla abono
    const abonoColumnsRes = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'abono'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columnas de tabla ABONO:');
    console.log('╔════════════════════════════════╦══════════════════╦═══════╦══════════╗');
    console.log('║ Columna                        ║ Tipo             ║ Long  ║ Nullable ║');
    console.log('╠════════════════════════════════╬══════════════════╬═══════╬══════════╣');
    
    abonoColumnsRes.rows.forEach(col => {
      const nombre = col.column_name.padEnd(30);
      const tipo = col.data_type.padEnd(16);
      const longitud = (col.character_maximum_length || '-').toString().padEnd(5);
      const nullable = col.is_nullable.padEnd(8);
      console.log(`║ ${nombre} ║ ${tipo} ║ ${longitud} ║ ${nullable} ║`);
    });
    
    console.log('╚════════════════════════════════╩══════════════════╩═══════╩══════════╝');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

detectarEstructuraVenta();
