const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });
console.log('Using URL:', process.env.DATABASE_URL.replace(/:[^:]+@/, ':***@'));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'producto'");
        console.table(res.rows);
    } catch (e) { console.error(e); }
    finally { pool.end(); }
})();
