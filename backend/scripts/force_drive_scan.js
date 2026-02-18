require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { runDriveImportCycle } = require('../src/services/importAutomation');
const { pool } = require('../src/db');

async function forceScan() {
    console.log('🚀 Forcing Drive Scan...');
    try {
        await runDriveImportCycle();
        console.log('✅ Scan cycle completed.');
    } catch (error) {
        console.error('❌ Scan cycle failed:', error);
    } finally {
        // We need to close the pool if the imported modules opened one, 
        // but importAutomation uses jobManager which uses the shared pool.
        // However, this script requires the app to be running or at least DB connection to work.
        // If runDriveImportCycle uses the pool from db.js, we might need to close it.
        // Let's rely on the logs first.
        setTimeout(() => process.exit(0), 5000); // Give time for async ops
    }
}

forceScan();
