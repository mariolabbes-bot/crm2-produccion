const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query("SELECT vendedor_id, COUNT(*) FROM cliente GROUP BY vendedor_id LIMIT 10");
        console.log('Vendedor IDs in cliente table:', res.rows);

        const res2 = await pool.query("SELECT id, rut, nombre_completo FROM usuario LIMIT 5");
        console.log('Users in usuario table:', res2.rows);
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
}

run();
