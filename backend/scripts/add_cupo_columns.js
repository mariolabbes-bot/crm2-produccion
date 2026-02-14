const pool = require('../src/db');

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando migración: Agregar columnas cupo y cupo_utilizado...');

        // Agregar columna cupo
        await client.query(`
      ALTER TABLE cliente 
      ADD COLUMN IF NOT EXISTS cupo BIGINT DEFAULT 0;
    `);
        console.log('✅ Columna "cupo" verificada/agregada.');

        // Agregar columna cupo_utilizado
        await client.query(`
      ALTER TABLE cliente 
      ADD COLUMN IF NOT EXISTS cupo_utilizado BIGINT DEFAULT 0;
    `);
        console.log('✅ Columna "cupo_utilizado" verificada/agregada.');

        console.log('🎉 Migración completada exitosamente.');
    } catch (err) {
        console.error('❌ Error durante la migración:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
