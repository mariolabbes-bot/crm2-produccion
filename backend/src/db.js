const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const isLocal = connStr && (connStr.includes('localhost') || connStr.includes('127.0.0.1') || connStr.includes('::1'));

const pool = new Pool({
  connectionString: connStr,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

module.exports = pool;
