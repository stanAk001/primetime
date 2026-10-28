const { Pool, types } = require('pg');

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date
// objects — avoids UTC off-by-one-day shifts in JSON responses (Ibadan is
// UTC+1) and keeps date comparisons string-safe.
types.setTypeParser(types.builtins.DATE, (value) => value);

// Production (Render) supplies a single DATABASE_URL; local dev falls back to
// the individual DB_* vars. Set DB_SSL=true when connecting over an external
// URL (Render's External URL, Neon, Supabase) — Render's Internal URL needs no SSL.
const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
    };

const pool = new Pool({
  ...connection,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;
