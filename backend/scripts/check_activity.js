require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('--- DB ACTIVITY CHECK ---');
        const res = await client.query(`
            SELECT pid, state, query_start, state_change, query 
            FROM pg_stat_activity 
            WHERE state != 'idle' 
            AND query NOT LIKE '%pg_stat_activity%'
            ORDER BY query_start ASC;
        `);
        console.table(res.rows.map(r => ({
            pid: r.pid,
            state: r.state,
            duration: new Date() - new Date(r.query_start),
            query: r.query.substring(0, 50) + '...'
        })));
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
