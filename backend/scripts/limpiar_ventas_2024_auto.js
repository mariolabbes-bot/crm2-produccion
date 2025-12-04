/**
 * Script para limpiar tabla de ventas desde 2024 (SIN CONFIRMACIÓN)
 * Uso temporal: node backend/scripts/limpiar_ventas_2024_auto.js
 */

// Cargar variables de entorno ANTES de importar db
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = require('../src/db');

async function limpiarVentasDesde2024Auto() {
  console.log('\n🗑️  LIMPIEZA AUTOMÁTICA DE TABLA VENTAS - DESDE 2024\n');
  console.log('─'.repeat(60));
  
  try {
    // 1. Mostrar estadísticas actuales
    console.log('\n📊 Estadísticas actuales:');
    
    const totalRes = await pool.query('SELECT COUNT(*) as total FROM venta');
    const total = parseInt(totalRes.rows[0].total);
    console.log(`   Total de registros: ${total.toLocaleString()}`);
    
    const rangoRes = await pool.query(`
      SELECT 
        MIN(fecha_emision) as fecha_min,
        MAX(fecha_emision) as fecha_max
      FROM venta
      WHERE fecha_emision IS NOT NULL
    `);
    if (rangoRes.rows[0].fecha_min) {
      console.log(`   Rango de fechas: ${rangoRes.rows[0].fecha_min} → ${rangoRes.rows[0].fecha_max}`);
    }
    
    const desde2024Res = await pool.query(`
      SELECT COUNT(*) as total FROM venta 
      WHERE fecha_emision >= '2024-01-01'
    `);
    const totalDesde2024 = parseInt(desde2024Res.rows[0].total);
    console.log(`   Registros desde 2024-01-01: ${totalDesde2024.toLocaleString()}`);
    
    const antes2024Res = await pool.query(`
      SELECT COUNT(*) as total FROM venta 
      WHERE fecha_emision < '2024-01-01' OR fecha_emision IS NULL
    `);
    const totalAntes2024 = parseInt(antes2024Res.rows[0].total);
    console.log(`   Registros antes de 2024: ${totalAntes2024.toLocaleString()}`);
    
    // 2. Ejecutar limpieza SIN CONFIRMAR
    console.log('\n⚡ Ejecutando limpieza automática...');
    console.log(`   Total a eliminar: ${totalDesde2024.toLocaleString()} registros`);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      console.log('\n🔄 Eliminando registros desde 2024-01-01...');
      const deleteRes = await client.query(`
        DELETE FROM venta 
        WHERE fecha_emision >= '2024-01-01'
      `);
      
      const eliminados = deleteRes.rowCount;
      console.log(`✅ Eliminados: ${eliminados.toLocaleString()} registros`);
      
      await client.query('COMMIT');
      console.log('✅ Transacción confirmada (COMMIT)');
      
      // 3. Verificar resultado
      console.log('\n📊 Estadísticas después de la limpieza:');
      const finalTotalRes = await pool.query('SELECT COUNT(*) as total FROM venta');
      const finalTotal = parseInt(finalTotalRes.rows[0].total);
      console.log(`   Total de registros: ${finalTotal.toLocaleString()}`);
      
      const finalRangoRes = await pool.query(`
        SELECT 
          MIN(fecha_emision) as fecha_min,
          MAX(fecha_emision) as fecha_max
        FROM venta
        WHERE fecha_emision IS NOT NULL
      `);
      if (finalRangoRes.rows[0].fecha_min) {
        console.log(`   Rango de fechas: ${finalRangoRes.rows[0].fecha_min} → ${finalRangoRes.rows[0].fecha_max}`);
      } else {
        console.log('   Sin registros con fecha');
      }
      
      console.log('\n✅ LIMPIEZA COMPLETADA EXITOSAMENTE');
      console.log('\n💡 Ahora puedes importar los nuevos datos de ventas desde 2024.\n');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n❌ Error durante la limpieza (ROLLBACK ejecutado):', error.message);
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar
limpiarVentasDesde2024Auto();
