// Simple migration runner: applies each .sql file in this folder once,
// tracking applied files in a schema_migrations table.
// Usage: npm run migrate
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = fs
      .readdirSync(__dirname)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      console.log(`apply ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`done  ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('✅ Migrations up to date');
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
