const pool = require('../src/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const sqlFile = path.join(__dirname, '../db/update_schema_geocoding.sql');

    if (!fs.existsSync(sqlFile)) {
        console.error(`❌ Error: No se encontró el archivo SQL en ${sqlFile}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    const client = await pool.connect();

    try {
        console.log('🚀 Iniciando migración de base de datos...');
        await client.query(sql);
        console.log('✅ Migración completada exitosamente.');
    } catch (err) {
        console.error('❌ Error durante la migración:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
