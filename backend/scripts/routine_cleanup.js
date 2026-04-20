/**
 * SCRIPT DE LIMPIEZA DE DATOS HISTÓRICOS (> 24 MESES)
 * Refactorizado para usar MaintenanceService.
 */
require('dotenv').config();
const MaintenanceService = require('../src/services/maintenanceService');

async function runCleanup() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`🚀 Iniciando Limpieza de Datos Históricos (> 24 meses)...`);
  
  try {
    const results = await MaintenanceService.runRoutineCleanup(isDryRun);
    
    if (isDryRun) {
      console.log(`\n🔍 Resultados de Simulación:`);
      console.log(`   - Ventas a eliminar: ${results.ventasEliminadas}`);
      console.log(`   - Abonos a eliminar: ${results.abonosEliminados}`);
    } else {
      console.log(`\n✅ Limpieza completada exitosamente.`);
      console.log(`   - Ventas eliminadas: ${results.ventasEliminadas}`);
      console.log(`   - Abonos eliminados: ${results.abonosEliminados}`);
    }
    console.log('\n🎉 Proceso completado.');
  } catch (err) {
    console.error('💥 Error durante la limpieza:', err.message);
  } finally {
    // No cerramos el pool aquí si lo maneja el service, pero como es standalone:
    process.exit(0);
  }
}

runCleanup();
