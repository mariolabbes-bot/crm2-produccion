const { processAbonosFileAsync } = require('./src/services/importers/abonos');
const path = require('path');

async function run() {
    try {
        console.log('--- Re-Importando Enero 2026 con Fix de Múltiples Folios ---');
        const filePath = path.join(__dirname, 'bulk_data', 'ABONOS_19-01-2026.xlsx');

        // Use a dummy JobID
        const result = await processAbonosFileAsync('MANUAL_FIX_JAN26', filePath, 'ABONOS_19-01-2026.xlsx', { updateMissing: false });

        console.log('Resultado:', result);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
