const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });
(async () => {
    try {
        const res = await pool.query("SELECT kcu.column_name FROM information_schema.table_constraints tco JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tco.constraint_name AND kcu.constraint_schema = tco.constraint_schema WHERE tco.constraint_type = 'PRIMARY KEY' AND kcu.table_name = 'producto'");
        console.table(res.rows);
    } catch (e) { console.error(e); }
    finally { pool.end(); }
})();
