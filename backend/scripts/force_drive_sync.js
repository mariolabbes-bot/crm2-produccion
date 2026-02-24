require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { runDriveImportCycle } = require('../src/services/importAutomation');
const { pool } = require('../src/db');

async function forceRun() {
    console.log('🚀 Forzando ejecución del Importador Automático (Google Drive)...');
    try {
        await runDriveImportCycle();
        console.log('✅ Ciclo finalizado.');
    } catch (error) {
        console.error('❌ Error forzando ciclo:', error);
    } finally {
        // If importAutomation doesn't close pool, we might hang. 
        // But importAutomation usually leaves pool open for server.
        // In script mode, we should force exit after a delay or if we know it's done.
        console.log('👋 Cerrando proceso en 5 segundos...');
        setTimeout(() => process.exit(0), 5000);
    }
}

forceRun();
