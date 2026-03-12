const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'visitas_registro'");
        fs.writeFileSync('/tmp/schema_output.json', JSON.stringify(res.rows, null, 2));
        console.log('DONE');
    } catch (err) {
        fs.writeFileSync('/tmp/schema_error.txt', err.message);
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
