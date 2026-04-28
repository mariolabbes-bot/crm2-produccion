
const pool = require('../src/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const sqlPath = path.join(__dirname, '../db/update_planning_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('🚀 Iniciando migración de base de datos...');
        await pool.query(sql);
        console.log('✅ Migración completada exitosamente.');
    } catch (err) {
        console.error('❌ Error en la migración:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
