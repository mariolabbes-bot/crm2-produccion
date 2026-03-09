const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const jobs = await pool.query("SELECT id, tipo, filename, status, created_at, started_at, error_message FROM import_job ORDER BY id DESC LIMIT 10");
    console.log("=== JOBS ===");
    console.table(jobs.rows);
    
    const notifs = await pool.query("SELECT id, type, title, message, created_at FROM app_notifications ORDER BY id DESC LIMIT 5");
    console.log("=== NOTIFICATIONS ===");
    console.table(notifs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
