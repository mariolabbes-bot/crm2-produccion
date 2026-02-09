
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
    const client = await pool.connect();
    const res = await client.query(`
    SELECT
        conname AS constraint_name,
        pg_get_constraintdef(c.oid) AS constraint_def
    FROM
        pg_constraint c
    JOIN
        pg_namespace n ON n.oid = c.connamespace
    WHERE
        contype = 'f' AND n.nspname = 'public' AND conrelid = 'abono'::regclass;
  `);
    console.log('Constraints on abono:', JSON.stringify(res.rows, null, 2));
    client.release();
    pool.end();
}
check();
