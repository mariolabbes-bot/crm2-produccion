const { processAbonosFileAsync } = require('../src/services/importers/abonos');
const path = require('path');
const fs = require('fs');
const pool = require('../src/db');

async function runFix() {
    console.log('🔧 Iniciando Corrección de Abonos Febrero 2026...');

    // 1. Locate File
    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');

    if (!fs.existsSync(filePath)) {
        console.error('❌ Archivo no encontrado:', filePath);
        process.exit(1);
    }

    try {
        // 2. Run Import (Transactional)
        console.log('🚀 Ejecutando importador refactorizado...');
        // Mock jobId
        const jobId = `FIX_FEB26_${Date.now()}`;

        const result = await processAbonosFileAsync(jobId, filePath, 'ABONO AL 08-02-2026.xlsx', { updateMissing: true });

        console.log('\n✅ Corrección Completada.');
        console.log(`   Total Filas Excel: ${result.totalRows}`);
        console.log(`   Nuevos Insertados (Recuperados): ${result.inserted}`);
        console.log(`   Actualizados (Ya existían): ${result.updated}`);

    } catch (error) {
        console.error('❌ Error fatal en corrección:', error);
    } finally {
        pool.end();
    }
}

runFix();
