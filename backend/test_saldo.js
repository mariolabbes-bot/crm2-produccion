const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM saldo_credito');
    console.log("Total saldo_credito rows:", countRes.rows[0].count);
    
    if (parseInt(countRes.rows[0].count) > 0) {
      const res = await pool.query('SELECT * FROM saldo_credito LIMIT 2');
      console.log("Sample rows:", res.rows);
      
      const sumRes = await pool.query('SELECT SUM(saldo_factura) as td FROM saldo_credito');
      console.log("Total deuda pura:", sumRes.rows[0].td);
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();
