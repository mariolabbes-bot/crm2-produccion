
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});
async function test() {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT 1');
        console.log('SUCCESS without SSL');
        client.release();
    } catch (err) {
        console.error('FAILED without SSL:', err.message);
    } finally {
        pool.end();
    }
}
test();
