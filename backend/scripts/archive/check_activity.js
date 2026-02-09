const pool = require('../src/db');

async function checkActivity() {
    try {
        const res = await pool.query(`
            SELECT pid, state, query, age(clock_timestamp(), query_start) as duration 
            FROM pg_stat_activity 
            WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%';
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkActivity();
