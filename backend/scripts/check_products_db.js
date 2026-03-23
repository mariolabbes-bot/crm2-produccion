const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });

(async () => {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM producto');
        const emptyDesc = await pool.query("SELECT COUNT(*) FROM producto WHERE descripcion IS NULL OR descripcion = ''");

        console.log(`Total: ${total.rows[0].count}`);
        console.log(`Empty Desc: ${emptyDesc.rows[0].count}`);

        const sample = await pool.query("SELECT * FROM producto LIMIT 5");
        console.log(`Sample of first 5 products:`, sample.rows);

        const sampleEmpty = await pool.query("SELECT * FROM producto WHERE descripcion IS NULL OR descripcion = '' LIMIT 5");
        console.log(`Sample of 5 empty desc products:`, sampleEmpty.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
})();
