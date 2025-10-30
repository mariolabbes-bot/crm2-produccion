const pool = require('./src/db');

pool.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'cliente' 
  ORDER BY ordinal_position
`)
.then(result => {
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
})
.catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
