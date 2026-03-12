const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    try {
        console.log('--- SCHEMA COMPARISON ---');
        const res = await pool.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name IN ('visit_plans', 'visitas_registro') 
        AND column_name = 'vendedor_id'
    `);
        console.log(JSON.stringify(res.rows, null, 2));

        const res2 = await pool.query("SELECT * FROM visit_plans LIMIT 1");
        console.log('visit_plans row sample:', res2.rows[0]);
    } catch (err) {
        console.log('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
}

test();
