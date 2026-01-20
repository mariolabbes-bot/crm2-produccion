require('dotenv').config();
const { processVentasFileAsync } = require('../src/services/importers/ventas');
const path = require('path');
const { Pool } = require('pg');

// Mock pool because the service requires it via require('../../db') 
// but we are running from scripts/ so relative paths might depend on execution context.
// Ideally we rely on the service's own require.

async function runImport() {
    try {
        const filePath = path.join(__dirname, '../bulk_data/VENTAS 2025.xlsx');
        console.log(`🚀 Iniciando importación MANUAL de: ${filePath}`);

        // Generar un Job ID falso
        const dummyJobId = `MANUAL-${Date.now()}`;

        // LLamar al importador
        const result = await processVentasFileAsync(dummyJobId, filePath, 'VENTAS 2025.xlsx');

        console.log('✅ Importación terminada:', result);

    } catch (err) {
        console.error('❌ Error fatal en importación:', err);
    } finally {
        // Force exit because pool in service might hang
        process.exit(0);
    }
}

runImport();
