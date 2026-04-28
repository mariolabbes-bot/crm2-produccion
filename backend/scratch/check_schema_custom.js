const pool = require('../src/db');

async function checkSchema() {
  try {
    console.log('--- Table: activities ---');
    const activities = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'activities'");
    console.table(activities.rows);

    console.log('\n--- Table: visitas_registro ---');
    const visits = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'visitas_registro'");
    console.table(visits.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
