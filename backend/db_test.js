const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
console.log("Connect to:", connStr);

const pool1 = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

pool1.query('SELECT 1')
  .then(() => console.log('Pool 1 connected'))
  .catch(e => console.log('Pool 1 error', e.message))
  .finally(() => pool1.end());
