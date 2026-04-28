const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const res = await pool.query(`
      SELECT tgname, proname 
      FROM pg_trigger 
      JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid 
      JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid 
      WHERE relname = 'saldo_credito';
    `);
    console.log("Triggers for saldo_credito:", res.rows);
    
    // Alsto let's check triggers for abono and venta
    const resA = await pool.query(`
      SELECT relname, tgname, proname 
      FROM pg_trigger 
      JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid 
      JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid 
      WHERE relname IN ('venta', 'abono');
    `);
    console.log("Triggers for venta/abono:", resA.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();
