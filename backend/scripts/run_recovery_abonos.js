process.env.DB_SSL = 'false';
require('dotenv').config({ path: 'backend/.env' });
const { processAbonosFileAsync } = require('../src/services/importers/abonos');
const path = require('path');

async function run() {
    const filePath = path.resolve('backend/bulk_data/IMPORTACION 21-01-2026/RECUPERACION ABONOS 2026.xlsx');
    const jobId = `recovery-${Date.now()}`;

    console.log(`🚀 Starting recovery import from: ${filePath}`);

    try {
        const result = await processAbonosFileAsync(jobId, filePath, 'RECUPERACION ABONOS 2026.xlsx', { updateMissing: true });
        console.log('\n✅ RECOVERY IMPORT COMPLETED');
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('\n❌ RECOVERY IMPORT FAILED');
        console.error(err);
        process.exit(1);
    }
}

run();
