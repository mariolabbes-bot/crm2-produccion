const pool = require('../src/db');
async function test() {
   const res = await pool.query("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'import_job'");
   console.log(res.rows);
   pool.end();
}
test();
