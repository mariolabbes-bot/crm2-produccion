const pool = require('./src/db');

async function checkConstraints() {
    try {
        console.log('--- Constraints on abono ---');
        const res = await pool.query(`
            SELECT schemaname, tablename, indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'abono'
        `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkConstraints();
