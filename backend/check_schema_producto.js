
const pool = require('./src/db');

async function checkSchema() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'producto'");
        console.log('--- SCHEMA PRODUCTO ---');
        res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkSchema();
