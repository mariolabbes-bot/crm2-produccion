const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    try {
        console.log('--- SCHEMA INSPECTION: visit_plans ---');
        const res = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'visit_plans'");
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('--- SCHEMA INSPECTION: usuario ---');
        const res2 = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'usuario'");
        console.log(JSON.stringify(res2.rows, null, 2));
    } catch (err) {
        console.log('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
}

test();
