const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- ATOMIC SCHEMA FIX ---');

        const queries = [
            "ALTER TABLE cliente ADD COLUMN IF NOT EXISTS fecha_ultima_visita DATE",
            "ALTER TABLE cliente ADD COLUMN IF NOT EXISTS frecuencia_visita INTEGER DEFAULT 15",
            "ALTER TABLE cliente ADD COLUMN IF NOT EXISTS es_terreno BOOLEAN DEFAULT TRUE",
            "ALTER TABLE visitas_registro DROP CONSTRAINT IF EXISTS visitas_registro_vendedor_id_fkey",
            "ALTER TABLE visitas_registro ALTER COLUMN vendedor_id TYPE VARCHAR(50)"
        ];

        for (const q of queries) {
            try {
                console.log(`Executing: ${q}...`);
                await pool.query(q);
                console.log('✅ Success');
            } catch (e) {
                console.warn(`⚠️ Warning on "${q}":`, e.message);
            }
        }

        console.log('--- COMPLETED ---');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
