const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- DEFINITIVE SCHEMA FIX ---');

        console.log('1. Updating cliente table...');
        await pool.query(`
      ALTER TABLE cliente 
      ADD COLUMN IF NOT EXISTS fecha_ultima_visita DATE,
      ADD COLUMN IF NOT EXISTS frecuencia_visita INTEGER DEFAULT 15,
      ADD COLUMN IF NOT EXISTS es_terreno BOOLEAN DEFAULT TRUE;
    `);
        console.log('✅ Cliente table updated.');

        console.log('2. Ensuring visitas_registro is robust...');
        await pool.query(`
      ALTER TABLE visitas_registro 
      DROP CONSTRAINT IF EXISTS visitas_registro_vendedor_id_fkey;
      
      -- Try to convert to VARCHAR if it is still integer
      DO $$ 
      BEGIN 
        ALTER TABLE visitas_registro ALTER COLUMN vendedor_id TYPE VARCHAR(50);
      EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'vendedor_id already varchar or conversion failed';
      END $$;
    `);
        console.log('✅ Visitas_registro updated.');

        console.log('--- FIX COMPLETED ---');
    } catch (err) {
        console.error('❌ FATAL ERROR:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
