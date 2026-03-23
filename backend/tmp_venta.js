const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });
(async () => {
    try {
        const res = await pool.query("SELECT * FROM venta LIMIT 1");
        console.log(res.rows[0]);
    } catch (e) { console.error(e); }
    finally { pool.end(); }
})();
