const pool = require('../src/db');
const fs = require('fs');
const path = require('path');

const BULK_DIR = path.join(__dirname, '../bulk_data');

async function resetClients() {
    try {
        console.log('🗑️ TRUNCATING cliente table...');
        await pool.query('TRUNCATE TABLE cliente CASCADE');
        console.log('✅ Cliente table truncated.');

        // Rename files back from PROCESSED_
        if (fs.existsSync(BULK_DIR)) {
            const files = fs.readdirSync(BULK_DIR);
            let renamedCount = 0;
            for (const f of files) {
                if (f.startsWith('PROCESSED_') && (f.toUpperCase().includes('CLIENTE') || f.toUpperCase().includes('BASE'))) {
                    const newName = f.replace('PROCESSED_', '');
                    fs.renameSync(path.join(BULK_DIR, f), path.join(BULK_DIR, newName));
                    console.log(`Renamed ${f} -> ${newName}`);
                    renamedCount++;
                }
            }
            if (renamedCount === 0) console.log('ℹ️ No PROCESSED_CLIENTE/BASE files found to rename.');
        } else {
            console.warn(`⚠️ Warning: ${BULK_DIR} does not exist.`);
        }

    } catch (e) {
        console.error('Error during reset:', e);
    } finally {
        pool.end();
    }
}

resetClients();
