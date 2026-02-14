const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
// Improve local detection: also check if not running in production mode
const isLocal = process.env.NODE_ENV !== 'production' && (
  !connStr ||
  connStr.includes('localhost') ||
  connStr.includes('127.0.0.1') ||
  connStr.includes('::1')
);

const pool = new Pool({
  connectionString: connStr,
  // If local, allow non-SSL. If remote (NEON), it likely needs SSL but with rejectUnauthorized: false for some dev setups
  ssl: isLocal ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

module.exports = pool;
