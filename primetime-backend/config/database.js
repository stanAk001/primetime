const { Pool, types } = require('pg');

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date
// objects — avoids UTC off-by-one-day shifts in JSON responses (Ibadan is
// UTC+1) and keeps date comparisons string-safe.
types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;
