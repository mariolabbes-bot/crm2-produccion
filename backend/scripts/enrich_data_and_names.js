/**
 * SCRIPT DE ENRIQUECIMIENTO DE DATOS Y NORMALIZACIÓN DE NOMBRES
 * Propósito: 
 * 1. Agregar columna nombre_idx indexada para búsquedas rápidas por nombre.
 * 2. Poblar rut_idx en ventas/abonos mediante cruce por nombre con clientes.
 */
require('dotenv').config();
const pool = require('../src/db');

async function runEnrichment() {
  console.log('🚀 Iniciando Enriquecimiento de Datos y Normalización de Nombres...');

  const tables = ['cliente', 'venta', 'abono', 'usuario', 'saldo_credito'];
  
  try {
    // 1. Agregar columnas nombre_idx y normalizar nombres
    for (const table of tables) {
      console.log(`⚙️ Procesando tabla: ${table}...`);
      
      // Agregar columna nombre_idx
      await pool.query(`
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS nombre_idx VARCHAR(255)
      `);

      // Determinar qué columna de nombre usar según la tabla
      let nameCol = 'nombre';
      if (table === 'venta') nameCol = 'cliente';
      if (table === 'abono') nameCol = 'cliente';
      if (table === 'usuario') nameCol = 'nombre_vendedor';
      if (table === 'saldo_credito') nameCol = 'rut'; // En saldo_credito no hay nombre, solo rut (ya optimizado por rut_idx)
      
      if (table !== 'saldo_credito') {
        console.log(`   🧹 Normalizando nombres en ${nameCol}...`);
        await pool.query(`
          UPDATE ${table}
          SET nombre_idx = UPPER(REGEXP_REPLACE(TRIM(${nameCol}), '[^a-zA-Z0-9]', '', 'g'))
          WHERE ${nameCol} IS NOT NULL AND (nombre_idx IS NULL OR nombre_idx = '')
        `);

        console.log(`   ⚡ Creando índice en ${table}(nombre_idx)...`);
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_${table}_nombre_idx ON ${table}(nombre_idx)
        `);
      }
    }

    // 2. BACKFILL: Recuperar RUTs en ventas y abonos mediante cruce por nombre
    console.log('\n🔍 Realizando Backfill de rut_idx por coincidencia de nombre...');
    
    // Ventas
    const resVenta = await pool.query(`
      UPDATE venta v
      SET rut_idx = c.rut_idx
      FROM cliente c
      WHERE v.rut_idx IS NULL 
      AND v.nombre_idx = c.nombre_idx
      AND c.rut_idx IS NOT NULL
    `);
    console.log(`   ✅ Ventas enriquecidas con RUT: ${resVenta.rowCount}`);

    // Abonos
    const resAbono = await pool.query(`
      UPDATE abono a
      SET rut_idx = c.rut_idx
      FROM cliente c
      WHERE a.rut_idx IS NULL 
      AND a.nombre_idx = c.nombre_idx
      AND c.rut_idx IS NOT NULL
    `);
    console.log(`   ✅ Abonos enriquecidos con RUT: ${resAbono.rowCount}`);

    console.log('\n🎉 Procesamiento completado con éxito.');

  } catch (err) {
    console.error('💥 Error durante el enriquecimiento:', err.message);
  } finally {
    await pool.end();
  }
}

runEnrichment();
