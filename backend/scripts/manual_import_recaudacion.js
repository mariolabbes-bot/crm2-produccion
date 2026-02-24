const { processAbonosFileAsync } = require('../src/services/importers/abonos');
const path = require('path');
const pool = require('../src/db');

async function manualImport() {
    console.log('🚀 Importando Manualmente RECAUDACION 02-2026.xlsx...');

    // Usamos el archivo que ya descargamos
    const filePath = path.join(__dirname, '../temp_recaudacion.xlsx');
    const jobId = `MANUAL_RECAUDACION_${Date.now()}`;

    try {
        const result = await processAbonosFileAsync(jobId, filePath, 'RECAUDACION 02-2026.xlsx', { updateMissing: true });

        console.log('\n✅ Importación Finalizada.');
        console.log(`   Filas Totales: ${result.totalRows}`);
        console.log(`   Insertados: ${result.inserted}`);
        console.log(`   Actualizados: ${result.updated}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        pool.end();
    }
}

manualImport();
