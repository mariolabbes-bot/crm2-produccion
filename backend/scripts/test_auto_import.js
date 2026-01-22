const { runAutoImport } = require('../src/services/automatedImportService');
require('dotenv').config();

// MOCK SMTP for testing if needed, or rely on provider fallback
if (!process.env.SMTP_URL) {
    console.log('⚠️ No SMTP_URL, emails will be simulated.');
}

(async () => {
    console.log('--- TEST MANUAL AUTO IMPORT ---');
    try {
        await runAutoImport();
        console.log('--- TEST COMPLETED ---');
        process.exit(0);
    } catch (error) {
        console.error('--- TEST FAILED ---', error);
        process.exit(1);
    }
})();
