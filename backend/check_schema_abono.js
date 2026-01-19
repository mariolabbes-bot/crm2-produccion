
const pool = require('./src/db');

async function checkSchema() {
    try {
        console.log('--- INDICES ABONO ---');
        const resIndices = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'abono'");
        resIndices.rows.forEach(r => console.log(`${r.indexname}: ${r.indexdef}`));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkSchema();
