require('dotenv').config();
const path = require('path');
const { processSaldoCreditoFileAsync } = require('../src/services/importers/saldo_credito');
const { Pool } = require('pg');

// Mock pool just to close it if the importer doesn't manage global pool closing or just let process exit.
// Actually the importer uses `require('../../db')` which exports a pool.
// We just need to keep the process alive until promise resolves.

const FILE_PATH = path.join(__dirname, '../bulk_data/SALDOCREDITO_19-01-2026.xlsx');

async function run() {
    console.log('--- STARTING SALDO CREDITO RE-IMPORT ---');
    try {
        const result = await processSaldoCreditoFileAsync('JOB-FIX-001', FILE_PATH, 'SALDOCREDITO_19-01-2026.xlsx');
        console.log('✅ Import finished. Result:', result);
    } catch (err) {
        console.error('❌ Import failed:', err);
    } finally {
        // Force exit after a small delay to allow logs to flush and db pool to idle? 
        // Best to just exit.
        process.exit(0);
    }
}

run();
