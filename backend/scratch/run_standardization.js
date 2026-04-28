
const pool = require('../src/db');
const fs = require('fs');
const path = require('path');

async function runStandardization() {
    const sqlPath = path.join(__dirname, '../db/standardize_catalogs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('🚀 Iniciando estandarización de catálogos...');
        await pool.query(sql);
        console.log('✅ Catálogos estandarizados exitosamente.');
    } catch (err) {
        console.error('❌ Error en la estandarización:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runStandardization();
