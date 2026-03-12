const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query("SET lock_timeout = '5s'");
        console.log('--- FORCED MIGRATION START ---');

        console.log('Dropping constraint...');
        await client.query("ALTER TABLE visitas_registro DROP CONSTRAINT IF EXISTS visitas_registro_vendedor_id_fkey");

        console.log('Changing column type...');
        await client.query("ALTER TABLE visitas_registro ALTER COLUMN vendedor_id TYPE VARCHAR(50)");

        console.log('✅ FIXED visitas_registro');

        // Also check visit_plans if it exists
        const tableCheck = await client.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'visit_plans'");
        if (tableCheck.rows.length > 0) {
            await client.query("ALTER TABLE visit_plans ALTER COLUMN vendedor_id TYPE VARCHAR(50)");
            console.log('✅ FIXED visit_plans');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

run();
