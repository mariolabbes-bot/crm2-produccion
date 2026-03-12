const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'visit_plans' AND column_name = 'vendedor_id'");
        if (res.rows.length > 0) {
            console.log('visit_plans.vendedor_id type:', res.rows[0].data_type);
        } else {
            console.log('visit_plans table or column not found');
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit(0);
    }
}
run();
