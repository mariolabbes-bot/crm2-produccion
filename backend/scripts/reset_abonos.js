
const pool = require('../src/db');
const fs = require('fs');
const path = require('path');

const BULK_DIR = path.join(__dirname, '../bulk_data');

async function resetAbonos() {
    try {
        console.log('🗑️ TRUNCATING abono table...');
        await pool.query('TRUNCATE TABLE abono');
        console.log('✅ Abono table truncated.');

        // Rename files
        const files = fs.readdirSync(BULK_DIR);
        let renamedCount = 0;
        for (const f of files) {
            if (f.startsWith('PROCESSED_ABONO')) {
                const newName = f.replace('PROCESSED_', '');
                fs.renameSync(path.join(BULK_DIR, f), path.join(BULK_DIR, newName));
                console.log(`Renamed ${f} -> ${newName}`);
                renamedCount++;
            }
        }
        if (renamedCount === 0) console.log('⚠️ No PROCESSED_ABONO files found to rename.');

    } catch (e) {
        console.error('Error during reset:', e);
    } finally {
        pool.end();
    }
}

resetAbonos();
