const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
});

async function runFix() {
    try {
        console.log('--- STARTING EMERGENCY FIX: vendedor_id type mismatch ---');

        // 1. Check if visitas_registro exists and its current type
        const resVisits = await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'visitas_registro' AND column_name = 'vendedor_id'");
        if (resVisits.rows.length > 0 && resVisits.rows[0].data_type === 'integer') {
            console.log('Fixing visitas_registro.vendedor_id (integer -> varchar)...');
            // Drop constraint if exists
            await pool.query("ALTER TABLE visitas_registro DROP CONSTRAINT IF EXISTS visitas_registro_vendedor_id_fkey");
            // Change type
            await pool.query("ALTER TABLE visitas_registro ALTER COLUMN vendedor_id TYPE VARCHAR(50)");
            console.log('✅ visitas_registro updated.');
        } else {
            console.log('visitas_registro.vendedor_id is already varchar or does not exist.');
        }

        // 2. Check visit_plans
        const resPlans = await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'visit_plans' AND column_name = 'vendedor_id'");
        if (resPlans.rows.length > 0 && resPlans.rows[0].data_type === 'integer') {
            console.log('Fixing visit_plans.vendedor_id (integer -> varchar)...');
            await pool.query("ALTER TABLE visit_plans ALTER COLUMN vendedor_id TYPE VARCHAR(50)");
            console.log('✅ visit_plans updated.');
        }

        console.log('--- FIX COMPLETED ---');
    } catch (err) {
        console.log('❌ Error during fix:', err.message);
    } finally {
        process.exit(0);
    }
}

runFix();
