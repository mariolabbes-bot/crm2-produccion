const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    try {
        console.log('--- START ---');
        const tableCheck = await pool.query("SELECT EXITS (SELECT FROM information_schema.tables WHERE table_name = 'visit_plans') as exists");
        console.log('visit_plans exists:', tableCheck.rows[0].exists);

        if (tableCheck.rows[0].exists) {
            const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'visit_plans' AND column_name = 'vendedor_id'");
            console.log('visit_plans.vendedor_id type:', res.rows[0].data_type);
        }

        const res2 = await pool.query("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'rut'");
        if (res2.rows[0].count > 0) {
            // Check if unique index exists on usuario(rut)
            const res3 = await pool.query(`
            SELECT i.relname as index_name,
                   a.attname as column_name
            FROM pg_class t,
                 pg_class i,
                 pg_index ix,
                 pg_attribute a
            WHERE t.oid = ix.indrelid
              AND i.oid = ix.indexrelid
              AND a.attrelid = t.oid
              AND a.attnum = ANY(ix.indkey)
              AND t.relkind = 'r'
              AND t.relname = 'usuario'
              AND a.attname = 'rut'
              AND ix.indisunique = true
        `);
            console.log('usuario(rut) unique index:', res3.rows.length > 0 ? 'YES' : 'NO');
        }

        console.log('--- END ---');
    } catch (err) {
        console.log('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
}

test();
