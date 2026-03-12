const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- EMERGENCY MIGRATION: FIXING VENDEDOR_ID TYPE ---');
        await pool.query("ALTER TABLE visitas_registro DROP CONSTRAINT IF EXISTS visitas_registro_vendedor_id_fkey");
        await pool.query("ALTER TABLE visitas_registro ALTER COLUMN vendedor_id TYPE VARCHAR(50)");

        // Also try visit_plans
        try {
            await pool.query("ALTER TABLE visit_plans ALTER COLUMN vendedor_id TYPE VARCHAR(50)");
            console.log('✅ visit_plans updated.');
        } catch (e) {
            console.log('visit_plans not updated (might already be varchar or not exist):', e.message);
        }

        console.log('✅ visitas_registro updated successfully.');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}
run();
