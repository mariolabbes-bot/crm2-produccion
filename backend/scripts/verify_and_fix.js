const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'visitas_registro' AND column_name = 'vendedor_id'");
        if (res.rows.length > 0) {
            console.log('visitas_registro.vendedor_id type:', res.rows[0].data_type);
            if (res.rows[0].data_type === 'integer') {
                console.log('Fixing now...');
                await pool.query("ALTER TABLE visitas_registro DROP CONSTRAINT IF EXISTS visitas_registro_vendedor_id_fkey");
                await pool.query("ALTER TABLE visitas_registro ALTER COLUMN vendedor_id TYPE VARCHAR(50)");
                console.log('✅ FIXED');
            } else {
                console.log('ALREADY FIXED OR NOT INTEGER');
            }
        } else {
            console.log('Column not found');
        }
    } catch (err) {
        console.log('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
}

test();
