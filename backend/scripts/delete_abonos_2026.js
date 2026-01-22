
const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function purge2026() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
    const client = await pool.connect();

    try {
        const countRes = await client.query("SELECT COUNT(*) FROM abono WHERE fecha >= '2026-01-01'");
        const total = countRes.rows[0].count;

        console.log(`⚠️  PREPARING TO PURGE ${total} ABONOS FROM 2026...`);

        if (process.argv.includes('--confirm')) {
            console.log('🚀 Executing DELETE...');
            const delRes = await client.query("DELETE FROM abono WHERE fecha >= '2026-01-01'");
            console.log(`✅ DELETED ${delRes.rowCount} records.`);
        } else {
            console.log('👀 DRY RUN (No records deleted). Use --confirm to execute.');
        }

    } catch (e) {
        console.error('❌ Error during purge:', e);
    } finally {
        client.release();
        pool.end();
    }
}

purge2026();
