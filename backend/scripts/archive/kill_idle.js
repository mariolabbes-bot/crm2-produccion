const pool = require('../src/db');

async function killIdle() {
    try {
        const res = await pool.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE state = 'idle in transaction' 
            AND pid <> pg_backend_pid();
        `);
        console.log(`Killed ${res.rowCount} idle transactions.`);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
killIdle();
